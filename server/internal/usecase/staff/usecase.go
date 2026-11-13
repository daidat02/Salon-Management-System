package staff

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	settingDomain "github.com/daidat02/server/internal/domain/setting"
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

func (u *StaffUsecase) GetStaffPayroll(ctx context.Context, id, periodMonth string) (*domain.StaffPayrollResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperror.New(400, "Thiếu id nhân viên", nil)
	}

	periodMonth = strings.TrimSpace(periodMonth)
	if periodMonth == "" {
		return nil, apperror.New(400, "Thiếu kỳ lương (period_month)", nil)
	}
	periodDate, err := time.Parse("2006-01", periodMonth)
	if err != nil {
		return nil, apperror.New(400, "Kỳ lương không hợp lệ (yyyy-MM)", err)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	settings, err := u.userRepo.GetPayrollSettings(ctx, orgID)
	if err != nil {
		log.Println("Error getting payroll settings:", err)
		defaults := settingDomain.DefaultPayrollSettings()
		settings = &defaults
	}
	settings.Normalize()

	dateFrom, dateTo, err := CalculatePayrollCycle(periodMonth, settings.StartDay)
	if err != nil {
		return nil, apperror.New(400, "Kỳ lương không hợp lệ", err)
	}

	staff, err := u.userRepo.GetStaffByID(ctx, orgID, id)
	if err != nil {
		log.Println("Error getting staff by ID:", err)
		if errors.Is(err, domain.ErrStaffNotFound) {
			return nil, apperror.New(404, "Không tìm thấy nhân viên", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy thông tin nhân viên", err)
	}

	if !payrollEligible(staff, dateTo) {
		return nil, nil
	}

	payroll, err := u.userRepo.GetPayrollByPeriod(ctx, orgID, id, periodDate.Format("2006-01-02"))
	if err != nil && !errors.Is(err, domain.ErrPayrollNotFound) {
		log.Println("Error getting payroll by period:", err)
		return nil, apperror.New(500, "Lỗi khi lấy bảng lương nhân viên", err)
	}
	if err == nil && payroll != nil && payroll.Status != domain.PayrollStatusCancelled {
		return payrollToResponse(payroll, dateFrom, dateTo), nil
	}

	live, err := u.userRepo.GetStaffPayroll(
		ctx,
		orgID,
		id,
		dateFrom.Format("2006-01-02"),
		dateTo.Format("2006-01-02"),
		settings.StandardWorkingDays,
	)
	if err != nil {
		log.Println("Error getting staff payroll:", err)
		if errors.Is(err, domain.ErrStaffNotFound) {
			return nil, apperror.New(404, "Không tìm thấy nhân viên", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy bảng lương nhân viên", err)
	}
	if live == nil {
		return nil, nil
	}
	live.Source = "live"
	live.PayrollStatus = nil
	return live, nil
}

// payrollEligible kiểm tra nhân viên đã vào làm trước hoặc trong ngày kết thúc kỳ.
func payrollEligible(staff *domain.Staff, periodEnd time.Time) bool {
	gate := staff.HireDate
	if gate.IsZero() && staff.CreatedAt != nil {
		gate = *staff.CreatedAt
	}
	if gate.IsZero() {
		return true
	}
	return gate.Format("2006-01-02") <= periodEnd.Format("2006-01-02")
}

func payrollToResponse(p *domain.Payroll, dateFrom, dateTo time.Time) *domain.StaffPayrollResponse {
	status := p.Status
	return &domain.StaffPayrollResponse{
		StaffID:             p.StaffID,
		DateFrom:            dateFrom,
		DateTo:              dateTo,
		BaseSalary:          p.BaseSalary,
		StandardWorkingDays: p.StandardWorkingDays,
		TotalLeaveDays:      p.TotalLeaveDays,
		ActualWorkingDays:   p.ActualWorkingDays,
		ProratedBaseSalary:  p.BaseSalary,
		BonusAmount:         p.BonusAmount,
		AdjustmentDeduction: p.AdjustmentDeduction,
		PenaltyAmount:       p.PenaltyAmount,
		AdvanceAmount:       p.AdvanceAmount,
		TotalDeduction:      p.DeductionAmount,
		TotalOrders:         p.TotalOrders,
		TotalItems:          p.TotalItems,
		TotalCommission:     p.CommissionAmount,
		TotalAmountValue:    p.TotalAmountValue,
		NetPay:              p.NetPay,
		Source:              "payroll",
		PayrollStatus:       &status,
	}
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

func normalizePayrollCreateStatus(raw string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", domain.PayrollStatusApproved:
		return domain.PayrollStatusApproved, nil
	case domain.PayrollStatusDraft:
		return domain.PayrollStatusDraft, nil
	default:
		return "", apperror.New(400, "Trạng thái bảng lương không hợp lệ (draft | approved)", nil)
	}
}

func payrollFromLive(data *domain.StaffPayrollResponse, orgID, staffID string, periodMonth time.Time, status string) *domain.Payroll {
	return &domain.Payroll{
		ID:                  utils.NewID(),
		OrganizationID:      orgID,
		StaffID:             staffID,
		PeriodMonth:         &periodMonth,
		BaseSalary:          data.ProratedBaseSalary,
		CommissionAmount:    data.TotalCommission,
		BonusAmount:         data.BonusAmount,
		AdvanceAmount:       data.AdvanceAmount,
		DeductionAmount:     data.TotalDeduction,
		NetPay:              data.NetPay,
		Status:              status,
		StandardWorkingDays: data.StandardWorkingDays,
		TotalLeaveDays:      data.TotalLeaveDays,
		ActualWorkingDays:   data.ActualWorkingDays,
		PenaltyAmount:       data.PenaltyAmount,
		AdjustmentDeduction: data.AdjustmentDeduction,
		TotalOrders:         data.TotalOrders,
		TotalItems:          data.TotalItems,
		TotalAmountValue:    data.TotalAmountValue,
	}
}

func payrollRepoError(err error) error {
	if errors.Is(err, domain.ExistingPayrollOfStaffAndPeriod) {
		return apperror.New(409, "Bảng lương của nhân viên trong kỳ này đã tồn tại", err)
	}
	log.Println("Error creating payroll:", err)
	return apperror.New(500, "Lỗi khi tạo bảng lương", err)
}

func (u *StaffUsecase) CreatePayroll(ctx context.Context, staffID string, targetMonth string, status string) error {
	staffID = strings.TrimSpace(staffID)
	if staffID == "" {
		return apperror.New(400, "Thiếu id nhân viên", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return err
	}

	status, err = normalizePayrollCreateStatus(status)
	if err != nil {
		return err
	}

	targetMonth = strings.TrimSpace(targetMonth)
	periodMonthDate, err := time.Parse("2006-01", targetMonth)
	if err != nil {
		return apperror.New(400, "Tháng không hợp lệ (yyyy-MM)", err)
	}

	staffInfo, err := u.LoadStaffBasicInfo(ctx, orgID, staffID)
	if err != nil {
		if errors.Is(err, domain.ErrStaffNotFound) {
			return apperror.New(404, "Không tìm thấy nhân viên", err)
		}
		return apperror.New(500, "Lỗi khi lấy thông tin nhân viên", err)
	}

	settings, err := u.userRepo.GetPayrollSettings(ctx, orgID)
	if err != nil {
		log.Println("Error getting payroll settings:", err)
		defaults := settingDomain.DefaultPayrollSettings()
		settings = &defaults
	}
	settings.Normalize()

	dateFrom, dateTo, err := CalculatePayrollCycle(targetMonth, settings.StartDay)
	if err != nil {
		return apperror.New(400, "Tháng không hợp lệ", err)
	}

	existing, err := u.userRepo.GetPayrollByPeriod(ctx, orgID, staffID, periodMonthDate.Format("2006-01-02"))
	if err != nil && !errors.Is(err, domain.ErrPayrollNotFound) {
		log.Println("Error getting payroll by period:", err)
		return apperror.New(500, "Lỗi khi lấy bảng lương nhân viên", err)
	}
	if err == nil && existing != nil && existing.Status != domain.PayrollStatusCancelled && status == domain.PayrollStatusDraft {
		return apperror.New(409, "Bảng lương của nhân viên trong kỳ này đã tồn tại", nil)
	}

	if status == domain.PayrollStatusApproved && err == nil && existing != nil {
		if existing.Status == domain.PayrollStatusDraft {
			payroll := &domain.Payroll{
				ID:             existing.ID,
				OrganizationID: orgID,
				StaffID:        staffID,
				PeriodMonth:    &periodMonthDate,
				Status:         domain.PayrollStatusApproved,
			}
			if createErr := u.userRepo.CreatePayroll(ctx, payroll, staffInfo); createErr != nil {
				return payrollRepoError(createErr)
			}
			return nil
		}
		if existing.Status != domain.PayrollStatusCancelled {
			return apperror.New(409, "Bảng lương của nhân viên trong kỳ này đã tồn tại", nil)
		}
	}

	payrollData, err := u.userRepo.GetStaffPayroll(
		ctx,
		orgID,
		staffID,
		dateFrom.Format("2006-01-02"),
		dateTo.Format("2006-01-02"),
		settings.StandardWorkingDays,
	)
	if err != nil {
		if errors.Is(err, domain.ErrStaffNotFound) {
			return apperror.New(404, "Không tìm thấy nhân viên", err)
		}
		log.Println("Error getting staff payroll:", err)
		return apperror.New(500, "Lỗi khi tính bảng lương nhân viên", err)
	}

	payroll := payrollFromLive(payrollData, orgID, staffID, periodMonthDate, status)
	if createErr := u.userRepo.CreatePayroll(ctx, payroll, staffInfo); createErr != nil {
		return payrollRepoError(createErr)
	}
	return nil
}

func (u *StaffUsecase) CreatePayrollDrafts(ctx context.Context, targetMonth string) (*domain.BulkPayrollDraftResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	targetMonth = strings.TrimSpace(targetMonth)
	periodMonthDate, err := time.Parse("2006-01", targetMonth)
	if err != nil {
		return nil, apperror.New(400, "Tháng không hợp lệ (yyyy-MM)", err)
	}

	loc, err := time.LoadLocation("Asia/Ho_Chi_Minh")
	if err != nil {
		loc = time.FixedZone("UTC+7", 7*60*60)
	}
	if targetMonth > time.Now().In(loc).Format("2006-01") {
		return nil, apperror.New(400, "Không thể tạo bảng lương cho kỳ tương lai", nil)
	}

	settings, err := u.userRepo.GetPayrollSettings(ctx, orgID)
	if err != nil {
		log.Println("Error getting payroll settings:", err)
		defaults := settingDomain.DefaultPayrollSettings()
		settings = &defaults
	}
	settings.Normalize()

	dateFrom, dateTo, err := CalculatePayrollCycle(targetMonth, settings.StartDay)
	if err != nil {
		return nil, apperror.New(400, "Tháng không hợp lệ", err)
	}

	staffs, err := u.userRepo.ListStaffForPayrollDraft(ctx, orgID, dateTo.Format("2006-01-02"))
	if err != nil {
		log.Println("Error listing staff for payroll draft:", err)
		return nil, apperror.New(500, "Lỗi khi lấy danh sách nhân viên", err)
	}

	result := &domain.BulkPayrollDraftResponse{
		TargetMonth: targetMonth,
		Items:       make([]domain.BulkPayrollDraftItem, 0, len(staffs)),
	}

	for _, staff := range staffs {
		item := domain.BulkPayrollDraftItem{
			StaffID:   staff.ID,
			StaffCode: staff.Code,
			StaffName: staff.FullName,
		}

		existing, findErr := u.userRepo.GetPayrollByPeriod(ctx, orgID, staff.ID, periodMonthDate.Format("2006-01-02"))
		if findErr != nil && !errors.Is(findErr, domain.ErrPayrollNotFound) {
			item.Result = "failed"
			item.Reason = "Không kiểm tra được bảng lương hiện có"
			result.Failed++
			result.Items = append(result.Items, item)
			continue
		}
		if findErr == nil && existing != nil && existing.Status != domain.PayrollStatusCancelled {
			item.Result = "skipped"
			item.Reason = "Đã có bảng lương trong kỳ"
			result.Skipped++
			result.Items = append(result.Items, item)
			continue
		}

		payrollData, calcErr := u.userRepo.GetStaffPayroll(
			ctx,
			orgID,
			staff.ID,
			dateFrom.Format("2006-01-02"),
			dateTo.Format("2006-01-02"),
			settings.StandardWorkingDays,
		)
		if calcErr != nil {
			item.Result = "failed"
			item.Reason = "Không tính được bảng lương"
			result.Failed++
			result.Items = append(result.Items, item)
			continue
		}

		payroll := payrollFromLive(
			payrollData,
			orgID,
			staff.ID,
			periodMonthDate,
			domain.PayrollStatusDraft,
		)
		staffInfo := &domain.StaffBasicInfo{
			ID:       staff.ID,
			Code:     staff.Code,
			FullName: staff.FullName,
			Position: staff.Position,
		}
		if createErr := u.userRepo.CreatePayroll(ctx, payroll, staffInfo); createErr != nil {
			if errors.Is(createErr, domain.ExistingPayrollOfStaffAndPeriod) {
				item.Result = "skipped"
				item.Reason = "Đã có bảng lương trong kỳ"
				result.Skipped++
			} else {
				log.Println("Error creating draft payroll:", createErr)
				item.Result = "failed"
				item.Reason = "Không tạo được bảng lương nháp"
				result.Failed++
			}
			result.Items = append(result.Items, item)
			continue
		}

		item.Result = "created"
		result.Created++
		result.Items = append(result.Items, item)
	}

	return result, nil
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
