package postgres

const (
	createAppointmentQuery = `
		INSERT INTO appointments (id, organization_id, code, customer_id, staff_id, start_time, end_time, status, source, total_amount, note, device_id, client_ip, required_deposit_amount, deposit_status)
		VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`
	// appointment_items không có unique nên bulk INSERT thường (không upsert).
	bulkInsertAppointmentItemsQuery = `
		INSERT INTO appointment_items (id, organization_id, appointment_id, item_type, service_id, product_id, quantity, unit_price, line_total)
		VALUES
	`
	appointmentColumns = `
        a.id, a.organization_id, a.code, a.customer_id, c.full_name AS customer_name, c.phone AS customer_phone,
        a.staff_id, s.full_name AS staff_name, a.start_time, a.end_time, a.status, a.source, a.total_amount,
        a.note, a.cancelled_reason, a.device_id, a.client_ip, a.required_deposit_amount,
        a.deposit_status, a.created_at, a.updated_at
    `

	getAppointmentByIDQuery = `
		SELECT ` + appointmentColumns + `
		FROM appointments a
        LEFT JOIN customers c ON a.customer_id = c.id
        LEFT JOIN staff s ON a.staff_id = s.id
        WHERE a.organization_id = $1 AND a.id = $2
	`
	listAppointmentsByDateRangeQuery = `
		SELECT ` + appointmentColumns + `
		FROM appointments a
		LEFT JOIN customers c ON a.customer_id = c.id
		LEFT JOIN staff s ON a.staff_id = s.id
		WHERE a.organization_id = $1 AND a.start_time >= $2 AND a.start_time < $3
		ORDER BY a.start_time ASC
	`
	updateAppointmentTimesQuery = `
		UPDATE appointments
		SET start_time = $3, end_time = $4
		WHERE organization_id = $1 AND id = $2
	`
	updateAppointmentQuery = `
		UPDATE appointments
		SET customer_id = $3, staff_id = $4, start_time = $5, end_time = $6,
		    status = $7, source = $8, total_amount = $9, note = $10,
		    required_deposit_amount = $11, deposit_status = $12, updated_at = now()
		WHERE organization_id = $1 AND id = $2
	`
	deleteAppointmentItemsQuery = `
		DELETE FROM appointment_items
		WHERE organization_id = $1 AND appointment_id = $2
	`
	updateAppointmentStatusQuery = `
		UPDATE appointments
		SET status = $3, cancelled_reason = NULLIF($4, '')
		WHERE organization_id = $1 AND id = $2
	`
	deleteAppointmentQuery = `
		DELETE FROM appointments
		WHERE organization_id = $1 AND id = $2
	`
	listAppointmentItemsQuery = `
		SELECT ai.id, ai.organization_id, ai.appointment_id, ai.item_type,
		       ai.service_id, ai.product_id, ai.quantity, ai.unit_price, ai.line_total,
		       s.name AS service_name, p.name AS product_name
		FROM appointment_items ai
		LEFT JOIN services s
		       ON s.id = ai.service_id AND s.organization_id = ai.organization_id
		LEFT JOIN products p
		       ON p.id = ai.product_id AND p.organization_id = ai.organization_id
		WHERE ai.organization_id = $1 AND ai.appointment_id = $2
		ORDER BY ai.id
	`
	appointmentExistsInOrgQuery = `
		SELECT EXISTS(SELECT 1 FROM appointments WHERE organization_id = $1 AND id = $2)
	`
	getAppointmentStatusQuery = `
		SELECT status FROM appointments
		WHERE organization_id = $1 AND id = $2
	`
	checkAppointmentByIDQuery = `
		SELECT id, organization_id, code, customer_id, staff_id, start_time, end_time,
		       status, source, total_amount, note, cancelled_reason, device_id, client_ip,
		       required_deposit_amount, deposit_status, created_at, updated_at
		FROM appointments
		WHERE organization_id = $1 AND id = $2
	`

	getAppointmentSettingsQuery = `
		SELECT organization_id, allow_online_booking, auto_confirm, slot_step_minutes,
		       max_per_slot, min_lead_minutes, max_advance_days, allow_cancel,
		       cancel_before_hours, max_cancellations_per_month, allow_reschedule,
		       reschedule_before_hours, deposit_enabled, no_show_threshold,
		       no_show_lookback_days, deposit_percent, deposit_max_amount
		FROM appointment_settings
		WHERE organization_id = $1
	`
	countCustomerNoShowsQuery = `
		SELECT COUNT(*)
		FROM appointments
		WHERE organization_id = $1
		  AND customer_id = $2
		  AND status = 'no_show'
		  AND start_time >= $3
	`

	countCustomerCancellationsQuery = `
		SELECT COUNT(*)
		FROM appointments
		WHERE organization_id = $1
		  AND customer_id = $2
		  AND status = 'cancelled'
		  AND start_time >= $3
	`

	getBusinessHoursQuery = `
		SELECT o.timezone,
		       COALESCE(bh.open_time_minutes, 510) AS open_time_minutes,
		       COALESCE(bh.close_time_minutes, 1230) AS close_time_minutes,
		       bh.break_start_minutes, bh.break_end_minutes, bh.days
		FROM organizations o
		LEFT JOIN business_hours bh ON bh.organization_id = o.id
		WHERE o.id = $1
	`

	// Đếm lịch đang hoạt động giao với khung giờ [start, end) để chặn vượt sức chứa.
	countActiveAppointmentsInSlotQuery = `
		SELECT COUNT(*)
		FROM appointments
		WHERE organization_id = $1
		  AND status IN ('pending', 'confirmed', 'checked_in', 'in_progress')
		  AND start_time < $3
		  AND end_time > $2
		  AND ($4 = '' OR id::text <> $4)
	`

	// markOverdueAppointmentsAsNoShowQuery chuyển các lịch chưa check-in và đã
	// trễ quá grace period sang no_show trong 1 câu atomic, trả về id đã đổi.
	markOverdueAppointmentsAsNoShowQuery = `
		UPDATE appointments
		SET status = 'no_show'
		WHERE organization_id = $1
		  AND status IN ('pending', 'confirmed')
		  AND start_time <= NOW() - ($2 * INTERVAL '1 minute')
		RETURNING id
	`
)
