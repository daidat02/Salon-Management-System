package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	domain "github.com/daidat02/server/internal/domain/appointment"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

type PostgresAppointmentRepository struct {
	db *pgxpool.Pool
	qx *sqlx.DB
}

func NewPostgresAppointmentRepository(db *pgxpool.Pool) *PostgresAppointmentRepository {
	return &PostgresAppointmentRepository{
		db: db,
		qx: sqlx.NewDb(stdlib.OpenDBFromPool(db), "pgx"),
	}
}

// nullableUUID chuyển "" thành nil để qua được cột UUID nullable (staff_id).
func nullableUUID(id string) any {
	if strings.TrimSpace(id) == "" {
		return nil
	}
	return id
}

// CreateAppointment ghi lịch hẹn + items trong 1 transaction.
func (r *PostgresAppointmentRepository) CreateAppointment(ctx context.Context, appointment *domain.Appointment, items []*domain.AppointmentItem) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(
		ctx,
		createAppointmentQuery,
		appointment.ID,
		appointment.OrganizationID,
		appointment.Code,
		appointment.CustomerID,
		nullableUUID(appointment.StaffID),
		appointment.StartTime,
		appointment.EndTime,
		appointment.Status,
		appointment.Source,
		appointment.TotalAmount,
		appointment.Note,
		appointment.DeviceID,
		appointment.ClientIP,
		appointment.RequiredDepositAmount,
		appointment.DepositStatus,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi tạo cuộc hẹn: %w", err)
	}

	if err := bulkInsertAppointmentItems(ctx, tx, items); err != nil {
		return fmt.Errorf("lỗi khi thêm chi tiết cuộc hẹn: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("lỗi khi commit transaction: %w", err)
	}
	return nil
}

// UpdateAppointment ghi đè lịch hẹn + thay toàn bộ items trong 1 transaction.
func (r *PostgresAppointmentRepository) UpdateAppointment(ctx context.Context, appointment *domain.Appointment, items []*domain.AppointmentItem) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(
		ctx,
		updateAppointmentQuery,
		appointment.OrganizationID,
		appointment.ID,
		appointment.CustomerID,
		nullableUUID(appointment.StaffID),
		appointment.StartTime,
		appointment.EndTime,
		appointment.Status,
		appointment.Source,
		appointment.TotalAmount,
		appointment.Note,
		appointment.RequiredDepositAmount,
		appointment.DepositStatus,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật cuộc hẹn: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("cập nhật cuộc hẹn %s: %w", appointment.ID, domain.ErrAppointmentNotFound)
	}

	if _, err := tx.Exec(ctx, deleteAppointmentItemsQuery, appointment.OrganizationID, appointment.ID); err != nil {
		return fmt.Errorf("lỗi khi xóa chi tiết cũ của cuộc hẹn: %w", err)
	}
	if err := bulkInsertAppointmentItems(ctx, tx, items); err != nil {
		return fmt.Errorf("lỗi khi thêm chi tiết cuộc hẹn: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("lỗi khi commit transaction: %w", err)
	}
	return nil
}

func bulkInsertAppointmentItems(ctx context.Context, tx pgx.Tx, items []*domain.AppointmentItem) error {
	if len(items) == 0 {
		return nil
	}

	query := bulkInsertAppointmentItemsQuery
	var args []any
	var placeholders []string
	for _, item := range items {
		placeholders = append(placeholders, fmt.Sprintf(
			"($%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d)",
			len(args)+1, len(args)+2, len(args)+3, len(args)+4, len(args)+5,
			len(args)+6, len(args)+7, len(args)+8, len(args)+9,
		))
		args = append(args,
			item.ID,
			item.OrganizationID,
			item.AppointmentID,
			item.ItemType,
			item.ServiceID,
			item.ProductID,
			item.Quantity,
			item.UnitPrice,
			item.LineTotal,
		)
	}

	query += strings.Join(placeholders, ", ")
	_, err := tx.Exec(ctx, query, args...)
	return err
}

// appointmentRow hứng 1 dòng appointments; map sang entity sau khi scan
// (sqlx không scan được NULL vào field string và time.Time vào field string).
type appointmentRow struct {
	ID                    string    `db:"id"`
	OrganizationID        string    `db:"organization_id"`
	Code                  string    `db:"code"`
	CustomerID            *string   `db:"customer_id"`
	StaffID               *string   `db:"staff_id"`
	StartTime             time.Time `db:"start_time"`
	EndTime               time.Time `db:"end_time"`
	Status                string    `db:"status"`
	Source                string    `db:"source"`
	TotalAmount           float64   `db:"total_amount"`
	Note                  *string   `db:"note"`
	CancelReason          *string   `db:"cancelled_reason"`
	DeviceID              *string   `db:"device_id"`
	ClientIP              *string   `db:"client_ip"`
	RequiredDepositAmount float64   `db:"required_deposit_amount"`
	DepositStatus         string    `db:"deposit_status"`
	CreatedAt             time.Time `db:"created_at"`
	UpdatedAt             time.Time `db:"updated_at"`
}

// toDomain map row sang entity; created_at/updated_at format RFC3339 để giữ
// nguyên kiểu *string của entity.
func (row appointmentRow) toDomain() *domain.Appointment {
	a := &domain.Appointment{
		ID:                    row.ID,
		OrganizationID:        row.OrganizationID,
		Code:                  row.Code,
		StartTime:             row.StartTime.Format(time.RFC3339),
		EndTime:               row.EndTime.Format(time.RFC3339),
		Status:                row.Status,
		Source:                row.Source,
		TotalAmount:           row.TotalAmount,
		RequiredDepositAmount: row.RequiredDepositAmount,
		DepositStatus:         row.DepositStatus,
	}
	if row.CustomerID != nil {
		a.CustomerID = *row.CustomerID
	}
	if row.StaffID != nil {
		a.StaffID = *row.StaffID
	}
	if row.Note != nil {
		a.Note = *row.Note
	}
	if row.CancelReason != nil {
		a.CancelReason = *row.CancelReason
	}
	if row.DeviceID != nil {
		a.DeviceID = *row.DeviceID
	}
	if row.ClientIP != nil {
		a.ClientIP = *row.ClientIP
	}
	created := row.CreatedAt.Format(time.RFC3339)
	updated := row.UpdatedAt.Format(time.RFC3339)
	a.CreatedAt = &created
	a.UpdatedAt = &updated

	return a
}

func (r *PostgresAppointmentRepository) GetAppointmentByID(ctx context.Context, orgID, id string) (*domain.AppointmentResponse, error) {
	var appointment domain.AppointmentResponse
	if err := r.qx.GetContext(ctx, &appointment, getAppointmentByIDQuery, orgID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrAppointmentNotFound
		}
		return nil, fmt.Errorf("lỗi khi lấy lịch hẹn: %w", err)
	}

	return &appointment, nil
}

// appointmentListFilter dựng mệnh đề WHERE động cho list/count.
func appointmentListFilter(status, from, to, search string, startIdx int) (string, []any) {
	var conds []string
	var args []any
	idx := startIdx
	if strings.TrimSpace(status) != "" {
		conds = append(conds, fmt.Sprintf("a.status = $%d", idx))
		args = append(args, strings.TrimSpace(status))
		idx++
	}
	if strings.TrimSpace(from) != "" {
		conds = append(conds, fmt.Sprintf("a.start_time >= $%d", idx))
		args = append(args, strings.TrimSpace(from))
		idx++
	}
	if strings.TrimSpace(to) != "" {
		conds = append(conds, fmt.Sprintf("a.start_time <= $%d", idx))
		args = append(args, strings.TrimSpace(to))
		idx++
	}
	if s := strings.TrimSpace(search); s != "" {
		conds = append(conds, fmt.Sprintf(
			"(unaccent(a.code) ILIKE unaccent($%d) OR unaccent(c.full_name) ILIKE unaccent($%d) OR unaccent(c.phone) ILIKE unaccent($%d) OR unaccent(s.full_name) ILIKE unaccent($%d))",
			idx, idx, idx, idx,
		))
		args = append(args, "%"+s+"%")
		idx++
	}
	if len(conds) == 0 {
		return "", args
	}
	return " AND " + strings.Join(conds, " AND "), args
}

func (r *PostgresAppointmentRepository) GetAppointmentsByOrgID(ctx context.Context, orgID, status, from, to, search string, limit, offset int) ([]*domain.AppointmentResponse, error) {
	filter, args := appointmentListFilter(status, from, to, search, 2)
	query := fmt.Sprintf(`
        SELECT %s
        FROM appointments a
        LEFT JOIN customers c ON a.customer_id = c.id
        LEFT JOIN staff s ON a.staff_id = s.id
        WHERE a.organization_id = $1%s
        ORDER BY a.start_time DESC
        LIMIT $%d OFFSET $%d
    `, appointmentColumns, filter, len(args)+2, len(args)+3)
	args = append([]any{orgID}, append(args, limit, offset)...)

	appointments := make([]*domain.AppointmentResponse, 0)
	if err := r.qx.SelectContext(ctx, &appointments, query, args...); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn danh sách lịch hẹn: %w", err)
	}

	return appointments, nil
}

// GetAppointmentsByDateRange lấy toàn bộ lịch hẹn trong [from, to) để dựng lịch tuần.
func (r *PostgresAppointmentRepository) GetAppointmentsByDateRange(ctx context.Context, orgID, from, to string) ([]*domain.AppointmentResponse, error) {
	appointments := make([]*domain.AppointmentResponse, 0)
	if err := r.qx.SelectContext(ctx, &appointments, listAppointmentsByDateRangeQuery, orgID, from, to); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn lịch hẹn theo tuần: %w", err)
	}
	return appointments, nil
}

func (r *PostgresAppointmentRepository) CountAppointmentsByOrgID(ctx context.Context, orgID, status, from, to, search string) (int64, error) {
	filter, args := appointmentListFilter(status, from, to, search, 2)
	query := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM appointments a
		LEFT JOIN customers c ON a.customer_id = c.id
		LEFT JOIN staff s ON a.staff_id = s.id
		WHERE a.organization_id = $1%s
	`, filter)
	args = append([]any{orgID}, args...)

	var total int64
	if err := r.qx.GetContext(ctx, &total, query, args...); err != nil {
		return 0, fmt.Errorf("lỗi khi đếm danh sách lịch hẹn: %w", err)
	}
	return total, nil
}

func (r *PostgresAppointmentRepository) GetAppointmentsByCustomerID(ctx context.Context, orgID, customerID string, limit, offset int) ([]*domain.AppointmentResponse, error) {
	rows := make([]*domain.AppointmentResponse, 0)
	if err := r.qx.SelectContext(ctx, &rows, `
		SELECT `+appointmentColumns+`
		FROM appointments a
		LEFT JOIN customers c ON a.customer_id = c.id
		LEFT JOIN staff s ON a.staff_id = s.id
		WHERE a.organization_id = $1 AND a.customer_id = $2
		ORDER BY a.start_time DESC
		LIMIT $3 OFFSET $4
	`, orgID, customerID, limit, offset); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn lịch sử lịch hẹn: %w", err)
	}
	return rows, nil
}

func (r *PostgresAppointmentRepository) CountAppointmentsByCustomerID(ctx context.Context, orgID, customerID string) (int64, error) {
	var total int64
	err := r.qx.GetContext(ctx, &total, `
		SELECT COUNT(*)
		FROM appointments
		WHERE organization_id = $1 AND customer_id = $2
	`, orgID, customerID)
	if err != nil {
		return 0, fmt.Errorf("lỗi khi đếm lịch sử lịch hẹn: %w", err)
	}
	return total, nil
}

// appointmentSettingsRow hứng 1 dòng appointment_settings.
type appointmentSettingsRow struct {
	OrganizationID      string  `db:"organization_id"`
	AllowOnlineBooking  bool    `db:"allow_online_booking"`
	AutoConfirm         bool    `db:"auto_confirm"`
	SlotStepMinutes     int     `db:"slot_step_minutes"`
	MaxPerSlot          int     `db:"max_per_slot"`
	MinLeadMinutes      int     `db:"min_lead_minutes"`
	MaxAdvanceDays      int     `db:"max_advance_days"`
	AllowCancel         bool    `db:"allow_cancel"`
	CancelBeforeHours   int     `db:"cancel_before_hours"`
	MaxCancellations    int     `db:"max_cancellations_per_month"`
	AllowReschedule     bool    `db:"allow_reschedule"`
	RescheduleBeforeHrs int     `db:"reschedule_before_hours"`
	DepositEnabled      bool    `db:"deposit_enabled"`
	NoShowThreshold     int     `db:"no_show_threshold"`
	NoShowLookbackDays  int     `db:"no_show_lookback_days"`
	DepositPercent      float64 `db:"deposit_percent"`
	DepositMaxAmount    float64 `db:"deposit_max_amount"`
}

func (row appointmentSettingsRow) toDomain() *domain.AppointmentSettings {
	return &domain.AppointmentSettings{
		OrganizationID:      row.OrganizationID,
		AllowOnlineBooking:  row.AllowOnlineBooking,
		AutoConfirm:         row.AutoConfirm,
		SlotStepMinutes:     row.SlotStepMinutes,
		MaxPerSlot:          row.MaxPerSlot,
		MinLeadMinutes:      row.MinLeadMinutes,
		MaxAdvanceDays:      row.MaxAdvanceDays,
		AllowCancel:         row.AllowCancel,
		CancelBeforeHours:   row.CancelBeforeHours,
		MaxCancellations:    row.MaxCancellations,
		AllowReschedule:     row.AllowReschedule,
		RescheduleBeforeHrs: row.RescheduleBeforeHrs,
		DepositEnabled:      row.DepositEnabled,
		NoShowThreshold:     row.NoShowThreshold,
		NoShowLookbackDays:  row.NoShowLookbackDays,
		DepositPercent:      row.DepositPercent,
		DepositMaxAmount:    row.DepositMaxAmount,
	}
}

func (r *PostgresAppointmentRepository) GetAppointmentSettings(ctx context.Context, orgID string) (*domain.AppointmentSettings, error) {
	var row appointmentSettingsRow
	if err := r.qx.GetContext(ctx, &row, getAppointmentSettingsQuery, orgID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrAppointmentSettingsNotFound
		}
		return nil, fmt.Errorf("lỗi khi lấy cấu hình đặt lịch: %w", err)
	}
	return row.toDomain(), nil
}

func (r *PostgresAppointmentRepository) CountCustomerNoShows(ctx context.Context, orgID, customerID string, since time.Time) (int, error) {
	var total int
	if err := r.qx.GetContext(ctx, &total, countCustomerNoShowsQuery, orgID, customerID, since); err != nil {
		return 0, fmt.Errorf("lỗi khi đếm số lần không đến của khách: %w", err)
	}
	return total, nil
}

func (r *PostgresAppointmentRepository) CountCustomerCancellations(ctx context.Context, orgID, customerID string, since time.Time) (int, error) {
	var total int
	if err := r.qx.GetContext(ctx, &total, countCustomerCancellationsQuery, orgID, customerID, since); err != nil {
		return 0, fmt.Errorf("lỗi khi đếm số lần hủy lịch của khách: %w", err)
	}
	return total, nil
}

func (r *PostgresAppointmentRepository) GetBusinessHours(ctx context.Context, orgID string) (*domain.BusinessHours, error) {
	var row struct {
		Timezone          string `db:"timezone"`
		OpenTimeMinutes   int    `db:"open_time_minutes"`
		CloseTimeMinutes  int    `db:"close_time_minutes"`
		BreakStartMinutes *int   `db:"break_start_minutes"`
		BreakEndMinutes   *int   `db:"break_end_minutes"`
		Days              []byte `db:"days"`
	}
	if err := r.qx.GetContext(ctx, &row, getBusinessHoursQuery, orgID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("lỗi khi lấy giờ làm việc: %w", err)
	}

	days := make([]domain.BusinessDay, 0, 7)
	if len(row.Days) > 0 {
		if err := json.Unmarshal(row.Days, &days); err != nil {
			return nil, fmt.Errorf("lỗi khi đọc giờ làm việc: %w", err)
		}
	}

	return &domain.BusinessHours{
		OpenTimeMinutes:   row.OpenTimeMinutes,
		CloseTimeMinutes:  row.CloseTimeMinutes,
		BreakStartMinutes: row.BreakStartMinutes,
		BreakEndMinutes:   row.BreakEndMinutes,
		Days:              days,
		Timezone:          row.Timezone,
	}, nil
}

func (r *PostgresAppointmentRepository) CountActiveAppointmentsInSlot(ctx context.Context, orgID string, start, end time.Time, excludeAppointmentID string) (int, error) {
	var total int
	if err := r.qx.GetContext(ctx, &total, countActiveAppointmentsInSlotQuery, orgID, start, end, excludeAppointmentID); err != nil {
		return 0, fmt.Errorf("lỗi khi đếm lịch hẹn trong khung giờ: %w", err)
	}
	return total, nil
}

func (r *PostgresAppointmentRepository) GetAppointmentItems(ctx context.Context, orgID, appointmentID string) ([]*domain.AppointmentItemResponse, error) {
	items := make([]*domain.AppointmentItemResponse, 0)
	if err := r.qx.SelectContext(ctx, &items, listAppointmentItemsQuery, orgID, appointmentID); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn chi tiết lịch hẹn: %w", err)
	}
	return items, nil
}

func (r *PostgresAppointmentRepository) UpdateAppointmentTimes(ctx context.Context, orgID, id, startTime, endTime string) error {
	tag, err := r.db.Exec(ctx, updateAppointmentTimesQuery, orgID, id, startTime, endTime)
	if err != nil {
		return fmt.Errorf("lỗi khi đổi lịch hẹn: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("đổi lịch hẹn %s: %w", id, domain.ErrAppointmentNotFound)
	}
	return nil
}

func (r *PostgresAppointmentRepository) UpdateAppointmentStatus(ctx context.Context, orgID, id, status, cancelReason string) error {
	tag, err := r.db.Exec(ctx, updateAppointmentStatusQuery, orgID, id, status, cancelReason)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật trạng thái lịch hẹn: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("cập nhật lịch hẹn %s: %w", id, domain.ErrAppointmentNotFound)
	}
	return nil
}

func (r *PostgresAppointmentRepository) MarkOverdueAppointmentsAsNoShow(ctx context.Context, orgID string, graceMinutes int) ([]string, error) {
	ids := make([]string, 0)
	if err := r.qx.SelectContext(ctx, &ids, markOverdueAppointmentsAsNoShowQuery, orgID, graceMinutes); err != nil {
		return nil, fmt.Errorf("lỗi khi cập nhật lịch hẹn quá giờ: %w", err)
	}
	return ids, nil
}

func (r *PostgresAppointmentRepository) DeleteAppointment(ctx context.Context, orgID, id string) error {
	tag, err := r.db.Exec(ctx, deleteAppointmentQuery, orgID, id)
	if err != nil {
		return fmt.Errorf("lỗi khi xóa lịch hẹn: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("xóa lịch hẹn %s: %w", id, domain.ErrAppointmentNotFound)
	}
	return nil
}

func (r *PostgresAppointmentRepository) AppointmentExistsInOrg(ctx context.Context, orgID, appointmentID string) (bool, error) {
	var exists bool
	if err := r.qx.GetContext(ctx, &exists, appointmentExistsInOrgQuery, orgID, appointmentID); err != nil {
		return false, fmt.Errorf("lỗi khi kiểm tra lịch hẹn: %w", err)
	}
	return exists, nil
}

// GetAppointmentStatus lấy trạng thái lịch hẹn thuộc salon.
func (r *PostgresAppointmentRepository) GetAppointmentStatus(ctx context.Context, orgID, appointmentID string) (string, error) {
	var status string
	if err := r.qx.GetContext(ctx, &status, getAppointmentStatusQuery, orgID, appointmentID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", domain.ErrAppointmentNotFound
		}
		return "", fmt.Errorf("lỗi khi lấy trạng thái lịch hẹn: %w", err)
	}
	return status, nil
}

func (r *PostgresAppointmentRepository) CheckExitAppointmentByID(ctx context.Context, orgID, id string) (*domain.Appointment, error) {
	var row appointmentRow
	if err := r.qx.GetContext(ctx, &row, checkAppointmentByIDQuery, orgID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrAppointmentNotFound
		}
		return nil, fmt.Errorf("lỗi khi kiểm tra lịch hẹn: %w", err)
	}
	return row.toDomain(), nil
}
