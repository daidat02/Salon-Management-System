package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	settingDomain "github.com/daidat02/server/internal/domain/setting"
	domain "github.com/daidat02/server/internal/domain/staff"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

type PostgresStaffRepository struct {
	db *pgxpool.Pool
	qx *sqlx.DB
}

func NewPostgresStaffRepository(db *pgxpool.Pool) *PostgresStaffRepository {
	return &PostgresStaffRepository{
		db: db,
		qx: sqlx.NewDb(stdlib.OpenDBFromPool(db), "pgx"),
	}
}

// nullableStaffString chuyển chuỗi rỗng thành NULL để qua được các CHECK constraint.
func nullableStaffString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return strings.TrimSpace(value)
}

// nullableStaffDate chuyển zero time thành NULL cho cột DATE nullable.
func nullableStaffDate(value time.Time) any {
	if value.IsZero() {
		return nil
	}
	return value
}

func (r *PostgresStaffRepository) CreateStaff(ctx context.Context, staff *domain.Staff) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("lỗi khi bắt đầu transaction tạo nhân viên: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", staff.OrganizationID); err != nil {
		return "", fmt.Errorf("lỗi khi khóa tạo mã nhân viên: %w", err)
	}

	var nextCode int
	if err := tx.QueryRow(ctx, nextStaffCodeQuery, staff.OrganizationID).Scan(&nextCode); err != nil {
		return "", fmt.Errorf("lỗi khi tạo mã nhân viên: %w", err)
	}
	staff.Code = fmt.Sprintf("NV%03d", nextCode)

	if _, err := tx.Exec(
		ctx,
		createStaffQuery,
		staff.ID,
		staff.OrganizationID,
		staff.Code,
		staff.FullName,
		staff.Phone,
		nullableStaffString(staff.Email),
		staff.BirthDate,
		nullableStaffString(staff.Gender),
		nullableStaffString(staff.Address),
		staff.Position,
		nullableStaffString(staff.EmploymentType),
		staff.CommissionRate,
		staff.BaseSalary,
		nullableStaffString(staff.BankName),
		nullableStaffString(staff.BankAccountNumber),
		nullableStaffString(staff.BankAccountHolder),
		staff.Status,
		nullableStaffDate(staff.HireDate),
	); err != nil {
		return "", fmt.Errorf("Lỗi khi tạo nhân viên: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("lỗi khi commit tạo nhân viên: %w", err)
	}

	return staff.Code, nil
}

func (r *PostgresStaffRepository) GetStaffByOrgID(
	ctx context.Context,
	orgID string,
	search string,
	status string,
	sort string,
	limit, offset int,
) ([]*domain.Staff, error) {
	// 1. Nối toàn bộ các khối hằng số lại với nhau theo đúng thứ tự $1, $2, $3, $4
	query := getStaffsByOrgIDQuery +
		searchStaffsFilter +
		filterStaffsStatus +
		sortStaffsFilter

	// 2. Chuẩn bị mảng tham số cố định 4 vị trí đầu tiên ($1, $2, $3, $4)
	// - $1: orgID
	// - $2: search (nếu rỗng thì truyền "", SQL nhận diện qua ($2 = '' OR ...))
	// - $3: status (nếu rỗng thì truyền "", SQL nhận diện qua ($3 = '' OR ...))
	// - $4: sort   (truyền thẳng chuỗi sort vào, CASE WHEN sẽ tự so khớp)

	formattedSearch := ""
	if strings.TrimSpace(search) != "" {
		formattedSearch = "%" + strings.TrimSpace(search) + "%"
	}

	args := []any{
		orgID,           // $1
		formattedSearch, // $2
		status,          // $3
		sort,            // $4
	}

	// 3. Tự động cộng thêm phần Phân trang ở cuối dựa trên số lượng args hiện tại ($5, $6)
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	staffs := make([]*domain.Staff, 0)
	if err := r.qx.SelectContext(ctx, &staffs, query, args...); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn danh sách nhân viên: %w", err)
	}

	return staffs, nil
}

func (r *PostgresStaffRepository) GetStaffByID(ctx context.Context, orgID, id string) (*domain.Staff, error) {
	var staff domain.Staff
	if err := r.qx.GetContext(ctx, &staff, getStaffByIDQuery, orgID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("nhân viên %s: %w", id, domain.ErrStaffNotFound)
		}
		return nil, fmt.Errorf("lỗi khi lấy thông tin nhân viên: %w", err)
	}
	return &staff, nil
}

func (r *PostgresStaffRepository) GetStaffPayroll(ctx context.Context, orgID, staffID, dateFrom, dateTo string, standardWorkingDays int) (*domain.StaffPayrollResponse, error) {
	var payroll domain.StaffPayrollResponse
	if err := r.qx.GetContext(ctx, &payroll, getStaffPayrollQuery, orgID, staffID, dateFrom, dateTo, standardWorkingDays); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("nhân viên %s: %w", staffID, domain.ErrStaffNotFound)
		}
		return nil, fmt.Errorf("lỗi khi lấy bảng lương nhân viên: %w", err)
	}
	return &payroll, nil
}

func (r *PostgresStaffRepository) GetPayrollByPeriod(ctx context.Context, orgID, staffID, periodMonth string) (*domain.Payroll, error) {
	var payroll domain.Payroll
	if err := r.qx.GetContext(ctx, &payroll, getPayrollByPeriodQuery, orgID, staffID, periodMonth); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrPayrollNotFound
		}
		return nil, fmt.Errorf("lỗi khi lấy bảng lương theo kỳ: %w", err)
	}
	return &payroll, nil
}

func (r *PostgresStaffRepository) GetPayrollSettings(ctx context.Context, orgID string) (*settingDomain.PayrollSettings, error) {
	var settings settingDomain.PayrollSettings
	if err := r.qx.GetContext(ctx, &settings, getPayrollSettingsQuery, orgID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			defaults := settingDomain.DefaultPayrollSettings()
			return &defaults, nil
		}
		return nil, fmt.Errorf("lỗi khi lấy cấu hình kỳ lương: %w", err)
	}
	return &settings, nil
}

func (r *PostgresStaffRepository) GetStaffServiceHistory(
	ctx context.Context,
	orgID, staffID, dateFrom, dateTo, search string,
	limit, offset int,
) (*domain.StaffServiceHistorySummary, []*domain.StaffServiceHistoryItem, int64, error) {
	formattedSearch := ""
	if strings.TrimSpace(search) != "" {
		formattedSearch = "%" + strings.TrimSpace(search) + "%"
	}

	var summary domain.StaffServiceHistorySummary
	if err := r.qx.GetContext(
		ctx,
		&summary,
		getStaffCommissionStatsQuery+filtterByDateRange+staffServiceHistorySearchFilter,
		orgID,
		staffID,
		dateFrom,
		dateTo,
		formattedSearch,
	); err != nil {
		return nil, nil, 0, fmt.Errorf("lỗi khi lấy tổng hợp lịch sử dịch vụ nhân viên: %w", err)
	}

	items := make([]*domain.StaffServiceHistoryItem, 0)
	query := getServiceHistoryQuery +
		filtterByDateRange +
		staffServiceHistorySearchFilter +
		fmt.Sprintf(" ORDER BY ois.created_at DESC LIMIT $%d OFFSET $%d", 6, 7)
	if err := r.qx.SelectContext(
		ctx,
		&items,
		query,
		orgID,
		staffID,
		dateFrom,
		dateTo,
		formattedSearch,
		limit,
		offset,
	); err != nil {
		return nil, nil, 0, fmt.Errorf("lỗi khi truy vấn lịch sử dịch vụ nhân viên: %w", err)
	}

	var total int64
	if len(items) > 0 {
		total = items[0].TotalCount
	}

	return &summary, items, total, nil
}

func (r *PostgresStaffRepository) CountStaffsByOrgID(ctx context.Context, orgID string, search string, status string) (int64, error) {
	formattedSearch := ""
	if strings.TrimSpace(search) != "" {
		formattedSearch = "%" + strings.TrimSpace(search) + "%"
	}
	args := []any{orgID, formattedSearch, status}
	query := countStaffsByOrgIDQuery + searchStaffsFilter + filterStaffsStatus

	var total int64
	if err := r.qx.GetContext(ctx, &total, query, args...); err != nil {
		return 0, fmt.Errorf("lỗi khi đếm danh sách nhân viên: %w", err)
	}
	return total, nil
}

func (r *PostgresStaffRepository) UpdateStaff(ctx context.Context, staff *domain.Staff) error {
	tag, err := r.db.Exec(
		ctx,
		updateStaffQuery,
		staff.ID,
		staff.OrganizationID,
		staff.Code,
		staff.FullName,
		staff.Phone,
		nullableStaffString(staff.Email),
		staff.BirthDate,
		nullableStaffString(staff.Gender),
		nullableStaffString(staff.Address),
		staff.Position,
		nullableStaffString(staff.EmploymentType),
		staff.CommissionRate,
		staff.BaseSalary,
		nullableStaffString(staff.BankName),
		nullableStaffString(staff.BankAccountNumber),
		nullableStaffString(staff.BankAccountHolder),
		staff.Status,
		nullableStaffDate(staff.HireDate),
	)
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật nhân viên: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("cập nhật nhân viên %s: %w", staff.ID, domain.ErrStaffNotFound)
	}

	return nil
}

func (r *PostgresStaffRepository) DeleteStaff(ctx context.Context, orgID, id string) error {
	tag, err := r.db.Exec(
		ctx,
		deleteStaffQuery,
		id,
		orgID,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi xóa nhân viên: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("xóa nhân viên %s: %w", id, domain.ErrStaffNotFound)
	}

	return nil
}

func (r *PostgresStaffRepository) StaffsExistInOrg(ctx context.Context, orgID string, staffIDs []string) ([]string, error) {
	ids := make([]string, 0)
	if err := r.qx.SelectContext(ctx, &ids, staffsExistInOrgQuery, orgID, staffIDs); err != nil {
		return nil, fmt.Errorf("lỗi khi kiểm tra nhân viên: %w", err)
	}

	found := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		found[id] = struct{}{}
	}

	var missing []string
	for _, id := range staffIDs {
		if _, ok := found[id]; !ok {
			missing = append(missing, id)
		}
	}
	return missing, nil
}

func (r *PostgresStaffRepository) GetStaffBasicByID(ctx context.Context, orgID, staffID string) (*domain.StaffBasicInfo, error) {
	var info domain.StaffBasicInfo
	if err := r.qx.GetContext(ctx, &info, getStaffBasicByIDQuery, orgID, staffID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("nhân viên %s: %w", staffID, domain.ErrStaffNotFound)
		}
		return nil, fmt.Errorf("lỗi khi kiểm tra tồn tại nhân viên: %w", err)
	}
	return &info, nil
}

func (r *PostgresStaffRepository) ListStaffForPayrollDraft(ctx context.Context, orgID string, periodEnd string) ([]*domain.Staff, error) {
	staffs := make([]*domain.Staff, 0)
	if err := r.qx.SelectContext(ctx, &staffs, listStaffForPayrollDraftQuery, orgID, periodEnd); err != nil {
		return nil, fmt.Errorf("lỗi khi lấy danh sách nhân viên tạo bảng lương nháp: %w", err)
	}
	return staffs, nil
}

func (r *PostgresStaffRepository) CreatePayroll(ctx context.Context, payroll *domain.Payroll, staffInfo *domain.StaffBasicInfo) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction tạo bảng lương: %w", err)
	}
	defer tx.Rollback(ctx)

	var existingID, existingStatus string
	var existingNetPay float64
	err = tx.QueryRow(
		ctx,
		getPayrollForUpdateQuery,
		payroll.OrganizationID,
		payroll.StaffID,
		payroll.PeriodMonth,
	).Scan(&existingID, &existingStatus, &existingNetPay)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("lỗi khi kiểm tra bảng lương tồn tại: %w", err)
	}
	hasExisting := err == nil && existingStatus != domain.PayrollStatusCancelled

	insertPayroll := func(cashFlowID *string) error {
		_, insertErr := tx.Exec(
			ctx,
			createPayrollQuery,
			payroll.ID,
			payroll.OrganizationID,
			payroll.StaffID,
			payroll.PeriodMonth,
			payroll.BaseSalary,
			payroll.CommissionAmount,
			payroll.BonusAmount,
			payroll.AdvanceAmount,
			payroll.DeductionAmount,
			payroll.NetPay,
			payroll.Status,
			cashFlowID,
			payroll.CreatedBy,
			payroll.ApprovedBy,
			payroll.StandardWorkingDays,
			payroll.TotalLeaveDays,
			payroll.ActualWorkingDays,
			payroll.PenaltyAmount,
			payroll.AdjustmentDeduction,
			payroll.TotalOrders,
			payroll.TotalItems,
			payroll.TotalAmountValue,
		)
		if insertErr != nil {
			if isUniqueViolation(insertErr) {
				return fmt.Errorf("bảng lương tháng %s của nhân viên này đã tồn tại: %w", payroll.PeriodMonth, domain.ExistingPayrollOfStaffAndPeriod)
			}
			return fmt.Errorf("lỗi khi tạo bảng lương: %w", insertErr)
		}
		return nil
	}

	lockPayrollData := func(payrollID string) error {
		if _, lockErr := tx.Exec(ctx, updateStaffSalaryAdjustmentsQuery, payroll.OrganizationID, payroll.StaffID, payroll.PeriodMonth, payrollID); lockErr != nil {
			return fmt.Errorf("lỗi khi cập nhật payroll_id cho các điều chỉnh lương: %w", lockErr)
		}
		if _, lockErr := tx.Exec(ctx, updateAttendancesQuery, payroll.OrganizationID, payroll.StaffID, payroll.PeriodMonth, payrollID); lockErr != nil {
			return fmt.Errorf("lỗi khi cập nhật payroll_id cho bảng chấm công: %w", lockErr)
		}
		return nil
	}

	if payroll.Status == domain.PayrollStatusDraft {
		if hasExisting {
			return fmt.Errorf("bảng lương tháng %s của nhân viên này đã tồn tại: %w", payroll.PeriodMonth, domain.ExistingPayrollOfStaffAndPeriod)
		}
		if err := insertPayroll(nil); err != nil {
			return err
		}
		return tx.Commit(ctx)
	}

	if hasExisting {
		if existingStatus != domain.PayrollStatusDraft {
			return fmt.Errorf("bảng lương tháng %s của nhân viên này đã tồn tại: %w", payroll.PeriodMonth, domain.ExistingPayrollOfStaffAndPeriod)
		}

		cashFlowID, err := insertPayrollExpenseVoucherTx(ctx, tx, payroll.OrganizationID, staffInfo.ID, staffInfo.FullName, existingNetPay)
		if err != nil {
			return fmt.Errorf("lỗi khi tạo phiếu chi bảng lương: %w", err)
		}
		if _, err := tx.Exec(ctx, promotePayrollDraftQuery, existingID, payroll.OrganizationID, cashFlowID, payroll.ApprovedBy); err != nil {
			return fmt.Errorf("lỗi khi chốt bảng lương nháp: %w", err)
		}
		if err := lockPayrollData(existingID); err != nil {
			return err
		}
		return tx.Commit(ctx)
	}

	cashFlowID, err := insertPayrollExpenseVoucherTx(ctx, tx, payroll.OrganizationID, staffInfo.ID, staffInfo.FullName, payroll.NetPay)
	if err != nil {
		return fmt.Errorf("lỗi khi tạo phiếu chi bảng lương: %w", err)
	}
	if err := insertPayroll(cashFlowID); err != nil {
		return err
	}
	if err := lockPayrollData(payroll.ID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *PostgresStaffRepository) CreateSalaryAdjustment(ctx context.Context, adjustment *domain.SalaryAdjustment) error {
	_, err := r.db.Exec(
		ctx,
		createSalaryAdjustmentQuery,
		adjustment.ID,
		adjustment.OrganizationID,
		adjustment.StaffID,
		adjustment.AdjustmentType,
		adjustment.Amount,
		adjustment.Reason,
		adjustment.EffectiveDate,
	)
	if err != nil {
		return fmt.Errorf("lỗi khi tạo điều chỉnh lương: %w", err)
	}
	return nil
}

func (r *PostgresStaffRepository) GetSalaryAdjustments(ctx context.Context, orgID, staffID, periodMonth string) ([]*domain.SalaryAdjustment, error) {
	adjustments := make([]*domain.SalaryAdjustment, 0)
	if err := r.qx.SelectContext(ctx, &adjustments, getSalaryAdjustmentsQuery, orgID, staffID, periodMonth); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn điều chỉnh lương: %w", err)
	}
	return adjustments, nil
}

func (r *PostgresStaffRepository) DeleteSalaryAdjustment(ctx context.Context, orgID, adjustmentID string) error {
	tag, err := r.db.Exec(ctx, deleteStaffSalaryAdjustmentsQuery, orgID, adjustmentID)
	if err != nil {
		return fmt.Errorf("lỗi khi xóa điều chỉnh lương: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrAdjustmentLockedOrNotFound
	}
	return nil
}
func (r *PostgresStaffRepository) CreateStaffLeave(ctx context.Context, leave *domain.StaffLeave) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("lỗi khi bắt đầu transaction tạo ngày nghỉ: %w", err)
	}
	defer tx.Rollback(ctx)

	var locked bool
	if err := tx.QueryRow(
		ctx,
		lockedAttendanceInRangeQuery,
		leave.OrganizationID,
		leave.StaffID,
		leave.StartDate,
		leave.EndDate,
	).Scan(&locked); err != nil {
		return fmt.Errorf("lỗi khi kiểm tra bảng chấm công đã chốt: %w", err)
	}
	if locked {
		return domain.ErrLeaveLocked
	}

	if _, err := tx.Exec(
		ctx,
		createStaffLeaveQuery,
		leave.ID,
		leave.OrganizationID,
		leave.StaffID,
		leave.LeaveType,
		leave.StartDate,
		leave.EndDate,
		nullableStaffString(leave.Note),
	); err != nil {
		return fmt.Errorf("lỗi khi tạo ngày nghỉ: %w", err)
	}

	status := "LEAVE_EXCUSED"
	if leave.LeaveType == domain.LeaveTypeLate {
		status = "LATE"
	}

	for day := leave.StartDate; !day.After(leave.EndDate); day = day.AddDate(0, 0, 1) {
		if _, err := tx.Exec(
			ctx,
			upsertLeaveAttendanceQuery,
			leave.OrganizationID,
			leave.StaffID,
			day,
			status,
			nullableStaffString(leave.Note),
		); err != nil {
			return fmt.Errorf("lỗi khi ghi nhận chấm công ngày %s: %w", day.Format("2006-01-02"), err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("lỗi khi commit tạo ngày nghỉ: %w", err)
	}
	return nil
}

func (r *PostgresStaffRepository) GetStaffLeaves(ctx context.Context, orgID, staffID string) ([]*domain.StaffLeave, error) {
	leaves := make([]*domain.StaffLeave, 0)
	if err := r.qx.SelectContext(ctx, &leaves, getStaffLeavesQuery, orgID, staffID); err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn ngày nghỉ: %w", err)
	}
	return leaves, nil
}
