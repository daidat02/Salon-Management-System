package staff

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	domain "github.com/daidat02/server/internal/domain/staff"
	"github.com/daidat02/server/internal/usecase/shared"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/pagination"
	"github.com/daidat02/server/pkg/utils"
)

type StaffUsecase struct {
	userRepo domain.StaffRepository
}

func NewStaffUsecase(repo domain.StaffRepository) *StaffUsecase {
	return &StaffUsecase{
		userRepo: repo,
	}
}

func toResponse(s *domain.Staff) *domain.StaffResponse {
	return &domain.StaffResponse{
		ID:                s.ID,
		OrganizationID:    s.OrganizationID,
		Code:              s.Code,
		FullName:          s.FullName,
		Phone:             s.Phone,
		Email:             s.Email,
		BirthDate:         s.BirthDate,
		Gender:            s.Gender,
		Address:           s.Address,
		Position:          s.Position,
		EmploymentType:    s.EmploymentType,
		CommissionRate:    s.CommissionRate,
		BaseSalary:        s.BaseSalary,
		BankName:          s.BankName,
		BankAccountNumber: s.BankAccountNumber,
		BankAccountHolder: s.BankAccountHolder,
		Status:            s.Status,
		HireDate:          s.HireDate,
		CreatedAt:         s.CreatedAt,
		UpdatedAt:         s.UpdatedAt,
		DeletedAt:         s.DeletedAt,
	}
}

func (u *StaffUsecase) LoadStaffBasicInfo(ctx context.Context, orgID, id string) (*domain.StaffBasicInfo, error) {
	info, err := u.userRepo.GetStaffBasicByID(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	return info, nil
}

func (u *StaffUsecase) CreateStaff(ctx context.Context, staff *domain.Staff) (*domain.StaffResponse, error) {

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	if err := staff.Validate(); err != nil {
		// Validate trả lỗi thường -> tạo AppError 400 duy nhất tại đây.
		return nil, apperror.New(400, err.Error(), err)
	}
	staff.ID = utils.NewID()
	staff.OrganizationID = orgID

	code, err := u.userRepo.CreateStaff(ctx, staff)
	if err != nil {
		log.Println("Error creating staff:", err)
		// Thiếu org_id -> 400, còn lại -> 500. Mỗi nhánh chỉ New 1 lần.
		if errors.Is(err, domain.ErrMissingOrganizationID) {
			return nil, err
		}
		return nil, apperror.New(500, "Lỗi khi tạo nhân viên", err)
	}
	staff.Code = code

	return toResponse(staff), nil
}

func (u *StaffUsecase) GetStaffByOrgID(ctx context.Context, search string, status string, sort string, page, pageSize int) (*pagination.Result[*domain.StaffResponse], error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	params := pagination.Normalize(page, pageSize)

	staffs, err := u.userRepo.GetStaffByOrgID(ctx, orgID, search, status, sort, params.PageSize, params.Offset())
	if err != nil {
		log.Println("Error getting staff by org ID:", err)
		return nil, apperror.New(500, "Lỗi khi lấy danh sách nhân viên", err)
	}

	staffsResponse := []*domain.StaffResponse{}

	for _, staff := range staffs {
		staffsResponse = append(staffsResponse, toResponse(staff))
	}

	total, err := u.userRepo.CountStaffsByOrgID(ctx, orgID, search, status)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi đếm danh sách nhân viên", err)
	}

	return pagination.NewResult(staffsResponse, params, total), nil
}

func (u *StaffUsecase) GetStaffByID(ctx context.Context, id string) (*domain.StaffResponse, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id nhân viên", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	staff, err := u.userRepo.GetStaffByID(ctx, orgID, id)
	if err != nil {
		log.Println("Error getting staff by ID:", err)
		if errors.Is(err, domain.ErrStaffNotFound) {
			return nil, apperror.New(404, "Không tìm thấy nhân viên", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy thông tin nhân viên", err)
	}

	return toResponse(staff), nil
}

func (u *StaffUsecase) UpdateStaff(ctx context.Context, id string, staff *domain.Staff) (*domain.StaffResponse, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id nhân viên", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	if err := staff.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}
	staff.ID = id
	staff.OrganizationID = orgID

	if err := u.userRepo.UpdateStaff(ctx, staff); err != nil {
		log.Println("Error updating staff:", err)
		if errors.Is(err, domain.ErrStaffNotFound) {
			return nil, apperror.New(404, "Không tìm thấy nhân viên", err)
		}
		return nil, apperror.New(500, "Lỗi khi cập nhật nhân viên", err)
	}

	return toResponse(staff), nil
}

// parseDateParam nhận yyyy-MM-dd hoặc RFC3339; chuỗi rỗng trả về nil.
func parseDateParam(raw, field string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", raw)
	if err != nil {
		parsed, err = time.Parse(time.RFC3339, raw)
	}
	if err != nil {
		return nil, apperror.New(400, "Tham số "+field+" không hợp lệ (yyyy-MM-dd hoặc RFC3339)", err)
	}
	return &parsed, nil
}

func (u *StaffUsecase) GetStaffPayroll(ctx context.Context, id, dateFrom, dateTo string, standardWorkingDays int) (*domain.StaffPayrollResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperror.New(400, "Thiếu id nhân viên", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	from, err := parseDateParam(dateFrom, "date_from")
	if err != nil {
		return nil, err
	}
	to, err := parseDateParam(dateTo, "date_to")
	if err != nil {
		return nil, err
	}
	if from != nil && to != nil && from.After(*to) {
		return nil, apperror.New(400, "Khoảng thời gian không hợp lệ (date_from phải trước hoặc bằng date_to)", nil)
	}

	if standardWorkingDays == 0 {
		standardWorkingDays = 26
	}
	if standardWorkingDays < 1 || standardWorkingDays > 31 {
		return nil, apperror.New(400, "Số ngày công chuẩn phải nằm trong khoảng 1 đến 31", nil)
	}

	payroll, err := u.userRepo.GetStaffPayroll(
		ctx,
		orgID,
		id,
		strings.TrimSpace(dateFrom),
		strings.TrimSpace(dateTo),
		standardWorkingDays,
	)
	if err != nil {
		log.Println("Error getting staff payroll:", err)
		if errors.Is(err, domain.ErrStaffNotFound) {
			return nil, apperror.New(404, "Không tìm thấy nhân viên", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy bảng lương nhân viên", err)
	}

	return payroll, nil
}

func (u *StaffUsecase) GetStaffServiceHistory(
	ctx context.Context,
	id, dateFrom, dateTo, search string,
	page, pageSize int,
) (*domain.StaffServiceHistoryResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperror.New(400, "Thiếu id nhân viên", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	from, err := parseDateParam(dateFrom, "date_from")
	if err != nil {
		return nil, err
	}
	to, err := parseDateParam(dateTo, "date_to")
	if err != nil {
		return nil, err
	}
	if from != nil && to != nil && from.After(*to) {
		return nil, apperror.New(400, "Khoảng thời gian không hợp lệ (date_from phải trước hoặc bằng date_to)", nil)
	}

	if _, err := u.userRepo.GetStaffByID(ctx, orgID, id); err != nil {
		log.Println("Error getting staff by ID:", err)
		if errors.Is(err, domain.ErrStaffNotFound) {
			return nil, apperror.New(404, "Không tìm thấy nhân viên", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy thông tin nhân viên", err)
	}

	params := pagination.Normalize(page, pageSize)
	summary, items, total, err := u.userRepo.GetStaffServiceHistory(
		ctx,
		orgID,
		id,
		strings.TrimSpace(dateFrom),
		strings.TrimSpace(dateTo),
		strings.TrimSpace(search),
		params.PageSize,
		params.Offset(),
	)
	if err != nil {
		log.Println("Error getting staff service history:", err)
		return nil, apperror.New(500, "Lỗi khi lấy lịch sử dịch vụ nhân viên", err)
	}

	result := pagination.NewResult(items, params, total)
	return &domain.StaffServiceHistoryResponse{
		Summary:    summary,
		Data:       result.Data,
		Page:       result.Page,
		PageSize:   result.PageSize,
		Total:      result.Total,
		TotalPages: result.TotalPages,
	}, nil
}

func (u *StaffUsecase) DeleteStaff(ctx context.Context, id string) (string, error) {
	if strings.TrimSpace(id) == "" {
		return "", apperror.New(400, "Thiếu id nhân viên", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return "", err
	}

	if err := u.userRepo.DeleteStaff(ctx, orgID, id); err != nil {
		log.Println("Error deleting staff:", err)
		if errors.Is(err, domain.ErrStaffNotFound) {
			return "", apperror.New(404, "Không tìm thấy nhân viên", err)
		}
		return "", apperror.New(500, "Lỗi khi xóa nhân viên", err)
	}

	return id, nil
}

func CalculatePayrollCycle(targetMonth string, startDay int) (time.Time, time.Time, error) {
	// 1. Ép chuỗi "2026-10" thành "2026-10-01 00:00:00"
	targetDate, err := time.Parse("2006-01", targetMonth)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("định dạng tháng không hợp lệ")
	}

	var startDate, endDate time.Time

	if startDay == 1 {
		// Nếu chu kỳ chuẩn: Bắt đầu từ mùng 1 tháng này -> mùng 1 tháng sau
		startDate = targetDate
		endDate = targetDate.AddDate(0, 1, 0)
	} else {
		// Nếu chu kỳ lệch (VD: 26): Bắt đầu từ ngày 26 tháng TRƯỚC -> ngày 26 tháng NÀY
		startDate = time.Date(targetDate.Year(), targetDate.Month()-1, startDay, 0, 0, 0, 0, targetDate.Location())
		endDate = time.Date(targetDate.Year(), targetDate.Month(), startDay, 0, 0, 0, 0, targetDate.Location())
	}

	return startDate, endDate, nil
}

func (u *StaffUsecase) CreatePayroll(ctx context.Context, staff_id string, targetMonth string) error {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return err
	}

	staff_info, err := u.LoadStaffBasicInfo(ctx, orgID, staff_id)
	if err != nil {
		return err
	}
	// Truy xuất cấu hình của tổ chức từ DB. Tạm thời hardcode cho MVP.
	// settings, _ := u.orgRepo.GetSettings(ctx, orgID)
	payrollStartDay := 26
	standardWorkingDays := 26

	// Tính toán tự động from/to
	dateFrom, dateTo, err := CalculatePayrollCycle(targetMonth, payrollStartDay)
	if err != nil {
		return apperror.New(400, "Tháng không hợp lệ", err)
	}

	// Format về chuỗi RFC3339 hoặc truyền thẳng biến time.Time xuống DB (Khuyến nghị)
	strFrom := dateFrom.Format(time.RFC3339)
	strTo := dateTo.Format(time.RFC3339)

	// Lấy số liệu
	payrollData, err := u.userRepo.GetStaffPayroll(ctx, orgID, staff_id, strFrom, strTo, standardWorkingDays)
	if err != nil {
		return err
	}

	// Parse lại targetMonth để lưu cứng vào db là mùng 1 của tháng (VD: 2026-10-01)
	periodMonthDate, _ := time.Parse("2006-01", targetMonth)

	payroll := &domain.Payroll{
		ID:               utils.NewID(),
		OrganizationID:   orgID,
		StaffID:          staff_id,
		PeriodMonth:      &periodMonthDate,
		BaseSalary:       payrollData.BaseSalary,
		CommissionAmount: payrollData.TotalCommission,
		BonusAmount:      payrollData.BonusAmount,
		AdvanceAmount:    payrollData.AdvanceAmount,
		DeductionAmount:  payrollData.TotalDeduction,
		NetPay:           payrollData.NetPay,
		Status:           domain.PayrollStatusApproved,
		CashFlowID:       nil,
		CreatedBy:        nil,
		ApprovedBy:       nil,
	}
	err = u.userRepo.CreatePayroll(ctx, payroll, staff_info)
	if err != nil {
		if errors.Is(err, domain.ExistingPayrollOfStaffAndPeriod) {
			return apperror.New(409, err.Error(), err)
		}
		log.Println("Error creating payroll:", err)
		return apperror.New(500, "Lỗi khi tạo bảng lương", err)
	}
	return nil
}

func (u *StaffUsecase) GetSalaryAdjustments(ctx context.Context, staffID, periodMonth string) ([]*domain.SalaryAdjustment, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}
	cleanPeriod := strings.TrimSpace(periodMonth)

	periodMonthDate, err := time.Parse("2006-01", cleanPeriod)
	if err != nil {
		return nil, apperror.New(400, "Định dạng tháng không hợp lệ. Vui lòng gửi YYYY-MM", err)
	}

	// 3. Format chuẩn ra YYYY-MM-DD (2006-01-02)
	targetDateStr := periodMonthDate.Format("2006-01-02")

	// Truyền thẳng chuỗi đã format xuống Repo
	adjustments, err := u.userRepo.GetSalaryAdjustments(ctx, orgID, staffID, targetDateStr)
	if err != nil {
		log.Println("Error getting salary adjustments:", err)
		return nil, apperror.New(500, "Lỗi khi lấy các điều chỉnh lương", err)
	}

	return adjustments, nil
}

func (u *StaffUsecase) CreateSalaryAdjustment(ctx context.Context, req *domain.SalaryAdjustmentRequest) error {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return err
	}

	cleanPeriod := strings.TrimSpace(req.EffectiveDate)

	periodMonthDate, err := time.Parse("2006-01", cleanPeriod)
	if err != nil {
		return apperror.New(400, "Định dạng tháng không hợp lệ. Vui lòng gửi YYYY-MM", err)
	}

	adjustment := &domain.SalaryAdjustment{
		ID:             utils.NewID(),
		OrganizationID: orgID,
		StaffID:        req.StaffID,
		AdjustmentType: req.AdjustmentType,
		Amount:         req.Amount,
		Reason:         req.Reason,
		EffectiveDate:  periodMonthDate,
	}

	if err := u.userRepo.CreateSalaryAdjustment(ctx, adjustment); err != nil {
		log.Println("Error creating salary adjustment:", err)
		return apperror.New(500, "Lỗi khi tạo điều chỉnh lương", err)
	}
	return nil
}

func (u *StaffUsecase) DeleteSalaryAdjustment(ctx context.Context, adjustmentID string) error {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return err
	}

	if err := u.userRepo.DeleteSalaryAdjustment(ctx, orgID, adjustmentID); err != nil {
		log.Println("Error deleting salary adjustment:", err)
		if errors.Is(err, domain.ErrAdjustmentLockedOrNotFound) {
			return apperror.New(400, "Điều chỉnh lương đã bị khóa hoặc không tồn tại", err)
		}
		return apperror.New(500, "Lỗi khi xóa điều chỉnh lương", err)
	}
	return nil
}
func (u *StaffUsecase) GetStaffLeaves(ctx context.Context, staffID string) ([]*domain.StaffLeave, error) {
	staffID = strings.TrimSpace(staffID)
	if staffID == "" {
		return nil, apperror.New(400, "Thiếu id nhân viên", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	if _, err := u.userRepo.GetStaffBasicByID(ctx, orgID, staffID); err != nil {
		if errors.Is(err, domain.ErrStaffNotFound) {
			return nil, apperror.New(404, "Không tìm thấy nhân viên", err)
		}
		return nil, apperror.New(500, "Lỗi khi kiểm tra nhân viên", err)
	}

	leaves, err := u.userRepo.GetStaffLeaves(ctx, orgID, staffID)
	if err != nil {
		log.Println("Error getting staff leaves:", err)
		return nil, apperror.New(500, "Lỗi khi lấy danh sách ngày nghỉ", err)
	}
	return leaves, nil
}

func (u *StaffUsecase) CreateStaffLeave(ctx context.Context, staffID string, req *domain.CreateStaffLeaveRequest) (*domain.StaffLeave, error) {
	staffID = strings.TrimSpace(staffID)
	if staffID == "" {
		return nil, apperror.New(400, "Thiếu id nhân viên", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	startDate, err := time.Parse("2006-01-02", strings.TrimSpace(req.StartDate))
	if err != nil {
		return nil, apperror.New(400, "Ngày bắt đầu không hợp lệ (yyyy-MM-dd)", err)
	}
	endDate, err := time.Parse("2006-01-02", strings.TrimSpace(req.EndDate))
	if err != nil {
		return nil, apperror.New(400, "Ngày kết thúc không hợp lệ (yyyy-MM-dd)", err)
	}

	leave := &domain.StaffLeave{
		ID:             utils.NewID(),
		OrganizationID: orgID,
		StaffID:        staffID,
		LeaveType:      strings.TrimSpace(req.LeaveType),
		StartDate:      startDate,
		EndDate:        endDate,
		Note:           strings.TrimSpace(req.Note),
	}
	if err := leave.Validate(); err != nil {
		return nil, apperror.New(400, err.Error(), err)
	}

	if _, err := u.userRepo.GetStaffBasicByID(ctx, orgID, staffID); err != nil {
		if errors.Is(err, domain.ErrStaffNotFound) {
			return nil, apperror.New(404, "Không tìm thấy nhân viên", err)
		}
		return nil, apperror.New(500, "Lỗi khi kiểm tra nhân viên", err)
	}

	if err := u.userRepo.CreateStaffLeave(ctx, leave); err != nil {
		log.Println("Error creating staff leave:", err)
		if errors.Is(err, domain.ErrLeaveLocked) {
			return nil, apperror.New(409, "Khoảng ngày này đã được chốt trong bảng lương", err)
		}
		return nil, apperror.New(500, "Lỗi khi tạo ngày nghỉ", err)
	}
	return leave, nil
}
