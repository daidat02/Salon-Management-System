package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	settingDomain "github.com/daidat02/server/internal/domain/setting"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

type PostgresSettingRepository struct {
	db *pgxpool.Pool
	qx *sqlx.DB
}

func NewPostgresSettingRepository(db *pgxpool.Pool) *PostgresSettingRepository {
	return &PostgresSettingRepository{
		db: db,
		qx: sqlx.NewDb(stdlib.OpenDBFromPool(db), "pgx"),
	}
}

// InsertSetting khởi tạo toàn bộ dữ liệu mặc định cho 1 organization trong tx
// của caller (idempotent, gọi lại nhiều lần không lỗi).
func (r *PostgresSettingRepository) InsertSetting(ctx context.Context, tx pgx.Tx, orgID string) error {
	// 1. Giờ làm việc 7 ngày/tuần.
	if _, err := tx.Exec(ctx, insertDefaultBusinessHoursQuery, orgID); err != nil {
		return err
	}

	// 2. Các bản ghi Setting mặc định (id do DB tự gen_random_uuid()).
	queries := []string{
		`INSERT INTO organization_notification_settings (organization_id) VALUES ($1)
		 ON CONFLICT (organization_id) DO NOTHING`,
		`INSERT INTO appointment_settings (organization_id) VALUES ($1)
		 ON CONFLICT (organization_id) DO NOTHING`,
		`INSERT INTO receipt_settings (organization_id) VALUES ($1)
		 ON CONFLICT (organization_id) DO NOTHING`,
	}
	for _, query := range queries {
		if _, err := tx.Exec(ctx, query, orgID); err != nil {
			return err
		}
	}

	// 3. Khởi tạo danh mục Thu/Chi mặc định.
	if err := InsertDefaultCategoriesCashFlow(ctx, tx, orgID); err != nil {
		return err
	}

	// 4. Khởi tạo 2 Quỹ mặc định (Tiền mặt & Ngân hàng) + phương thức thanh toán.
	if err := InsertDefaultFundsAndMethods(ctx, tx, orgID); err != nil {
		return err
	}

	return nil
}

const insertDefaultBusinessHoursQuery = `
	INSERT INTO business_hours (organization_id)
	VALUES ($1)
	ON CONFLICT (organization_id) DO NOTHING
`

const getGeneralSettingsQuery = `
	SELECT o.id, o.name, o.slug, o.phone, o.email, o.website, o.address,
	       o.tax_code, o.slogan, o.logo_url, o.timezone, o.status,
	       COALESCE(bh.open_time_minutes, 510) AS open_time_minutes,
	       COALESCE(bh.close_time_minutes, 1230) AS close_time_minutes,
	       bh.break_start_minutes, bh.break_end_minutes, bh.days
	FROM organizations o
	LEFT JOIN business_hours bh ON bh.organization_id = o.id
	WHERE o.id = $1
`

type generalSettingsRow struct {
	ID                string  `db:"id"`
	Name              string  `db:"name"`
	Slug              string  `db:"slug"`
	Phone             *string `db:"phone"`
	Email             *string `db:"email"`
	Website           *string `db:"website"`
	Address           *string `db:"address"`
	TaxCode           *string `db:"tax_code"`
	Slogan            *string `db:"slogan"`
	LogoURL           *string `db:"logo_url"`
	Timezone          string  `db:"timezone"`
	Status            string  `db:"status"`
	OpenTimeMinutes   int     `db:"open_time_minutes"`
	CloseTimeMinutes  int     `db:"close_time_minutes"`
	BreakStartMinutes *int    `db:"break_start_minutes"`
	BreakEndMinutes   *int    `db:"break_end_minutes"`
	Days              []byte  `db:"days"`
}

func (r *PostgresSettingRepository) GetGeneralSettings(ctx context.Context, orgID string) (*settingDomain.GeneralSettingsResponse, error) {
	var row generalSettingsRow
	if err := r.qx.GetContext(ctx, &row, getGeneralSettingsQuery, orgID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, settingDomain.ErrGeneralSettingsNotFound
		}
		return nil, fmt.Errorf("lỗi khi lấy cài đặt chung: %w", err)
	}

	workingHours := settingDomain.DefaultWorkingHours()
	workingHours.OpenTimeMinutes = row.OpenTimeMinutes
	workingHours.CloseTimeMinutes = row.CloseTimeMinutes
	workingHours.BreakStartMinutes = row.BreakStartMinutes
	workingHours.BreakEndMinutes = row.BreakEndMinutes
	if len(row.Days) > 0 {
		if err := json.Unmarshal(row.Days, &workingHours.Days); err != nil {
			return nil, fmt.Errorf("lỗi khi đọc giờ làm việc: %w", err)
		}
	}

	return &settingDomain.GeneralSettingsResponse{
		Organization: settingDomain.OrganizationInfo{
			ID:       row.ID,
			Name:     row.Name,
			Slug:     row.Slug,
			Phone:    row.Phone,
			Email:    row.Email,
			Website:  row.Website,
			Address:  row.Address,
			TaxCode:  row.TaxCode,
			Slogan:   row.Slogan,
			LogoURL:  row.LogoURL,
			Timezone: row.Timezone,
			Status:   row.Status,
		},
		WorkingHours: workingHours,
	}, nil
}

const getBookingSettingsQuery = `
	SELECT allow_online_booking, auto_confirm, slot_step_minutes, max_per_slot,
	       min_lead_minutes, max_advance_days, allow_cancel, cancel_before_hours,
	       max_cancellations_per_month, allow_reschedule, reschedule_before_hours,
	       deposit_enabled, no_show_threshold, no_show_lookback_days,
	       deposit_percent, deposit_max_amount
	FROM appointment_settings
	WHERE organization_id = $1
`

const upsertBookingSettingsQuery = `
	INSERT INTO appointment_settings (
		organization_id, allow_online_booking, auto_confirm, slot_step_minutes,
		max_per_slot, min_lead_minutes, max_advance_days, allow_cancel,
		cancel_before_hours, max_cancellations_per_month, allow_reschedule,
		reschedule_before_hours, deposit_enabled, no_show_threshold,
		no_show_lookback_days, deposit_percent, deposit_max_amount
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	ON CONFLICT (organization_id) DO UPDATE SET
		allow_online_booking = EXCLUDED.allow_online_booking,
		auto_confirm = EXCLUDED.auto_confirm,
		slot_step_minutes = EXCLUDED.slot_step_minutes,
		max_per_slot = EXCLUDED.max_per_slot,
		min_lead_minutes = EXCLUDED.min_lead_minutes,
		max_advance_days = EXCLUDED.max_advance_days,
		allow_cancel = EXCLUDED.allow_cancel,
		cancel_before_hours = EXCLUDED.cancel_before_hours,
		max_cancellations_per_month = EXCLUDED.max_cancellations_per_month,
		allow_reschedule = EXCLUDED.allow_reschedule,
		reschedule_before_hours = EXCLUDED.reschedule_before_hours,
		deposit_enabled = EXCLUDED.deposit_enabled,
		no_show_threshold = EXCLUDED.no_show_threshold,
		no_show_lookback_days = EXCLUDED.no_show_lookback_days,
		deposit_percent = EXCLUDED.deposit_percent,
		deposit_max_amount = EXCLUDED.deposit_max_amount,
		updated_at = now()
`

func (r *PostgresSettingRepository) GetBookingSettings(ctx context.Context, orgID string) (*settingDomain.BookingSettings, error) {
	var s settingDomain.BookingSettings
	err := r.qx.GetContext(ctx, &s, getBookingSettingsQuery, orgID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, settingDomain.ErrBookingSettingsNotFound
		}
		return nil, fmt.Errorf("lỗi khi lấy cài đặt lịch hẹn: %w", err)
	}
	return &s, nil
}

func (r *PostgresSettingRepository) UpdateBookingSettings(ctx context.Context, orgID string, s *settingDomain.BookingSettings) error {
	_, err := r.db.Exec(
		ctx,
		upsertBookingSettingsQuery,
		orgID,
		s.AllowOnlineBooking,
		s.AutoConfirm,
		s.SlotStepMinutes,
		s.MaxPerSlot,
		s.MinLeadMinutes,
		s.MaxAdvanceDays,
		s.AllowCancel,
		s.CancelBeforeHours,
		s.MaxCancellationsPerMonth,
		s.AllowReschedule,
		s.RescheduleBeforeHours,
		s.DepositEnabled,
		s.NoShowThreshold,
		s.NoShowLookbackDays,
		s.DepositPercent,
		s.DepositMaxAmount,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật cài đặt lịch hẹn: %w", err)
	}
	return nil
}

const getReceiptSettingsQuery = `
	SELECT paper_size, auto_cut_paper, open_cash_drawer, show_logo, logo_url,
	       header_text, show_branch_address, show_cashier_name, show_customer_info,
	       mask_customer_phone, show_vietqr, footer_text, show_wifi_info, wifi_name,
	       wifi_pass, auto_print_on_checkout, print_copy_count
	FROM receipt_settings
	WHERE organization_id = $1
`

func (r *PostgresSettingRepository) GetReceiptSettings(ctx context.Context, orgID string) (*settingDomain.ReceiptSettings, error) {
	var s settingDomain.ReceiptSettings
	if err := r.qx.GetContext(ctx, &s, getReceiptSettingsQuery, orgID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, settingDomain.ErrReceiptSettingsNotFound
		}
		return nil, fmt.Errorf("lỗi khi lấy cài đặt hóa đơn: %w", err)
	}
	return &s, nil
}

func (r *PostgresSettingRepository) ListPaymentMethods(ctx context.Context, orgID string) ([]settingDomain.PaymentMethod, error) {
	methods := make([]settingDomain.PaymentMethod, 0)
	if err := r.qx.SelectContext(ctx, &methods, listPaymentMethodsQuery, orgID); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy phương thức thanh toán: %w", err)
	}
	return methods, nil
}

const getPaymentMethodByCodeQuery = `
	SELECT pm.id, pm.fund_id,pm.code, pm.name, pm.is_system, pm.is_active, pm.sort_order
	FROM payment_methods pm
	WHERE pm.organization_id = $1 AND (pm.id::text = $2 OR pm.code = $2) AND pm.is_active = true
	LIMIT 1;
`

func (r *PostgresSettingRepository) GetPaymentMethodByID(ctx context.Context, orgID string, code *string) (*settingDomain.PaymentMethod, error) {
	var CodeDefault string
	if code == nil {
		CodeDefault = "CASH"
	} else {
		CodeDefault = *code
	}

	var method settingDomain.PaymentMethod
	if err := r.qx.GetContext(ctx, &method, getPaymentMethodByCodeQuery, orgID, CodeDefault); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("phương thức thanh toán không tồn tại: %w", err)
		}
		return nil, fmt.Errorf("lỗi khi lấy phương thức thanh toán: %w", err)
	}
	return &method, nil
}

const getNotificationSettingsQuery = `
	SELECT appointment_reminder, new_booking_alert, low_stock_alert,
	       daily_revenue_report, birthday_voucher, reminder_hours_before,
	       low_stock_threshold, to_char(daily_report_time, 'HH24:MI') AS daily_report_time
	FROM organization_notification_settings
	WHERE organization_id = $1
`

func (r *PostgresSettingRepository) GetNotificationSettings(ctx context.Context, orgID string) (*settingDomain.NotificationSettings, error) {
	var s settingDomain.NotificationSettings
	if err := r.qx.GetContext(ctx, &s, getNotificationSettingsQuery, orgID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, settingDomain.ErrNotificationSettingsNotFound
		}
		return nil, fmt.Errorf("lỗi khi lấy cài đặt thông báo: %w", err)
	}
	return &s, nil
}

const upsertNotificationSettingsQuery = `
	INSERT INTO organization_notification_settings (
		organization_id, appointment_reminder, new_booking_alert, low_stock_alert,
		daily_revenue_report, birthday_voucher, reminder_hours_before,
		low_stock_threshold, daily_report_time
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	ON CONFLICT (organization_id) DO UPDATE SET
		appointment_reminder = EXCLUDED.appointment_reminder,
		new_booking_alert = EXCLUDED.new_booking_alert,
		low_stock_alert = EXCLUDED.low_stock_alert,
		daily_revenue_report = EXCLUDED.daily_revenue_report,
		birthday_voucher = EXCLUDED.birthday_voucher,
		reminder_hours_before = EXCLUDED.reminder_hours_before,
		low_stock_threshold = EXCLUDED.low_stock_threshold,
		daily_report_time = EXCLUDED.daily_report_time,
		updated_at = now()
`

func (r *PostgresSettingRepository) UpdateNotificationSettings(ctx context.Context, orgID string, s *settingDomain.NotificationSettings) error {
	_, err := r.db.Exec(
		ctx,
		upsertNotificationSettingsQuery,
		orgID,
		s.AppointmentReminder,
		s.NewBookingAlert,
		s.LowStockAlert,
		s.DailyRevenueReport,
		s.BirthdayVoucher,
		s.ReminderHoursBefore,
		s.LowStockThreshold,
		s.DailyReportTime,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật cài đặt thông báo: %w", err)
	}
	return nil
}

const updateOrganizationInfoQuery = `
	UPDATE organizations
	SET name = $2, phone = $3, email = $4, website = $5, address = $6,
	    tax_code = $7, slogan = $8, logo_url = $9, updated_at = now()
	WHERE id = $1
`

const upsertBusinessHoursQuery = `
	INSERT INTO business_hours (
		organization_id, open_time_minutes, close_time_minutes,
		break_start_minutes, break_end_minutes, days
	)
	VALUES ($1, $2, $3, $4, $5, $6)
	ON CONFLICT (organization_id) DO UPDATE SET
		open_time_minutes = EXCLUDED.open_time_minutes,
		close_time_minutes = EXCLUDED.close_time_minutes,
		break_start_minutes = EXCLUDED.break_start_minutes,
		break_end_minutes = EXCLUDED.break_end_minutes,
		days = EXCLUDED.days,
		updated_at = now()
`

func (r *PostgresSettingRepository) UpdateGeneralSettings(ctx context.Context, orgID string, settings *settingDomain.GeneralSettingsResponse) error {
	hours := settings.WorkingHours
	days, err := json.Marshal(hours.Days)
	if err != nil {
		return fmt.Errorf("lỗi khi mã hóa giờ làm việc: %w", err)
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	org := settings.Organization
	tag, err := tx.Exec(
		ctx,
		updateOrganizationInfoQuery,
		orgID,
		org.Name,
		org.Phone,
		org.Email,
		org.Website,
		org.Address,
		org.TaxCode,
		org.Slogan,
		org.LogoURL,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật thông tin salon: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return settingDomain.ErrGeneralSettingsNotFound
	}

	if _, err := tx.Exec(
		ctx,
		upsertBusinessHoursQuery,
		orgID,
		hours.OpenTimeMinutes,
		hours.CloseTimeMinutes,
		hours.BreakStartMinutes,
		hours.BreakEndMinutes,
		days,
	); err != nil {
		return fmt.Errorf("lỗi khi cập nhật giờ làm việc: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("lỗi khi commit transaction: %w", err)
	}
	return nil
}

const upsertReceiptSettingsQuery = `
	INSERT INTO receipt_settings (
		organization_id, paper_size, auto_cut_paper, open_cash_drawer, show_logo,
		logo_url, header_text, show_branch_address, show_cashier_name,
		show_customer_info, mask_customer_phone, show_vietqr, footer_text,
		show_wifi_info, wifi_name, wifi_pass, auto_print_on_checkout, print_copy_count
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
	ON CONFLICT (organization_id) DO UPDATE SET
		paper_size = EXCLUDED.paper_size,
		auto_cut_paper = EXCLUDED.auto_cut_paper,
		open_cash_drawer = EXCLUDED.open_cash_drawer,
		show_logo = EXCLUDED.show_logo,
		logo_url = EXCLUDED.logo_url,
		header_text = EXCLUDED.header_text,
		show_branch_address = EXCLUDED.show_branch_address,
		show_cashier_name = EXCLUDED.show_cashier_name,
		show_customer_info = EXCLUDED.show_customer_info,
		mask_customer_phone = EXCLUDED.mask_customer_phone,
		show_vietqr = EXCLUDED.show_vietqr,
		footer_text = EXCLUDED.footer_text,
		show_wifi_info = EXCLUDED.show_wifi_info,
		wifi_name = EXCLUDED.wifi_name,
		wifi_pass = EXCLUDED.wifi_pass,
		auto_print_on_checkout = EXCLUDED.auto_print_on_checkout,
		print_copy_count = EXCLUDED.print_copy_count,
		updated_at = now()
`

const updatePaymentMethodActiveQuery = `
	UPDATE payment_methods
	SET is_active = $3, updated_at = now()
	WHERE id = $1 AND organization_id = $2
`

func (r *PostgresSettingRepository) UpdatePaymentSettings(ctx context.Context, orgID string, settings *settingDomain.PaymentSettingsResponse) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	rc := settings.Receipt
	if _, err := tx.Exec(
		ctx,
		upsertReceiptSettingsQuery,
		orgID,
		rc.PaperSize,
		rc.AutoCutPaper,
		rc.OpenCashDrawer,
		rc.ShowLogo,
		rc.LogoURL,
		rc.HeaderText,
		rc.ShowBranchAddress,
		rc.ShowCashierName,
		rc.ShowCustomerInfo,
		rc.MaskCustomerPhone,
		rc.ShowVietQR,
		rc.FooterText,
		rc.ShowWifiInfo,
		rc.WifiName,
		rc.WifiPass,
		rc.AutoPrintOnCheckout,
		rc.PrintCopyCount,
	); err != nil {
		return fmt.Errorf("lỗi khi cập nhật cài đặt hóa đơn: %w", err)
	}

	for _, method := range settings.PaymentMethods {
		if _, err := tx.Exec(ctx, updatePaymentMethodActiveQuery, method.ID, orgID, method.IsActive); err != nil {
			return fmt.Errorf("lỗi khi cập nhật phương thức thanh toán: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("lỗi khi commit transaction: %w", err)
	}
	return nil
}
