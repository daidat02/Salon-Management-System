package appointment

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	domain "github.com/daidat02/server/internal/domain/appointment"
	customerDomain "github.com/daidat02/server/internal/domain/customer"
	"github.com/daidat02/server/internal/usecase/shared"
	"github.com/daidat02/server/pkg/apperror"
	"github.com/daidat02/server/pkg/pagination"
	"github.com/daidat02/server/pkg/utils"
	"github.com/jackc/pgx/v5/pgconn"
)

type AppointmentUseCase struct {
	repo           domain.AppoimentRepository
	customerFinder domain.CustomerFinder
	catalog        CatalogChecker
	settingsRepo   domain.SettingsRepository
}

// CatalogChecker kiểm tra service/product của items có thuộc đúng organization không.
// PostgresServiceRepository thỏa mãn ngầm.
type CatalogChecker interface {
	ServicesExistInOrg(ctx context.Context, orgID string, serviceIDs []string) ([]string, error)
	ProductsExistInOrg(ctx context.Context, orgID string, productIDs []string) ([]string, error)
}

// NewAppointmentUseCase nhận settingsRepo tùy chọn để áp quy tắc cọc theo no-show.
func NewAppointmentUseCase(repo domain.AppoimentRepository, customerFinder domain.CustomerFinder, catalog CatalogChecker, settingsRepo ...domain.SettingsRepository) *AppointmentUseCase {
	uc := &AppointmentUseCase{
		repo:           repo,
		customerFinder: customerFinder,
		catalog:        catalog,
	}
	if len(settingsRepo) > 0 {
		uc.settingsRepo = settingsRepo[0]
	}
	return uc
}

// parseAppointmentTime chấp nhận ISO8601 và 2 format phổ biến của client.
func parseAppointmentTime(s string) (time.Time, bool) {
	for _, layout := range []string{
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02",
	} {
		if t, err := time.Parse(layout, strings.TrimSpace(s)); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

// isUniqueViolation nhận diện lỗi trùng unique (vd 2 request cùng phone 1 lúc).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func (u *AppointmentUseCase) CreateAppointment(ctx context.Context, req *domain.AppointmentCreateRequest) (*domain.Appointment, error) {

	orgId, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	// Giá trị mặc định theo schema khi client không gửi.
	if strings.TrimSpace(req.Status) == "" {
		req.Status = "pending"
	}
	if strings.TrimSpace(req.Source) == "" {
		req.Source = "online"
	}
	if strings.TrimSpace(req.DepositStatus) == "" {
		req.DepositStatus = "none"
	}

	// Validate request trước mọi tác động DB để không tạo customer mồ côi.
	if err := req.Validate(); err != nil {
		return nil, apperror.New(400, "Dữ liệu không hợp lệ", err)
	}

	phone := strings.TrimSpace(req.CustomerPhone)
	if phone == "" {
		return nil, apperror.New(400, "Số điện thoại khách hàng không được để trống", nil)
	}

	start, ok := parseAppointmentTime(req.StartTime)
	if !ok {
		return nil, apperror.New(400, "Thời gian bắt đầu không hợp lệ (dùng ISO8601)", nil)
	}
	end, ok := parseAppointmentTime(req.EndTime)
	if !ok {
		return nil, apperror.New(400, "Thời gian kết thúc không hợp lệ (dùng ISO8601)", nil)
	}
	if !end.After(start) {
		return nil, apperror.New(400, "Thời gian kết thúc phải sau thời gian bắt đầu", nil)
	}

	items, err := u.buildAppointmentItems(orgId, "", req.Items)
	if err != nil {
		return nil, err
	}
	if err := u.validateItemsInOrg(ctx, orgId, items); err != nil {
		return nil, err
	}

	// TotalAmount do server tính từ items, không tin client gửi lên.
	var total float64
	for _, item := range items {
		total += item.LineTotal
	}

	// Find-or-create customer theo phone.
	customerID, err := u.resolveCustomerID(ctx, orgId, strings.TrimSpace(req.CustomerName), phone)
	if err != nil {
		return nil, err
	}

	code := strings.TrimSpace(req.Code)
	if code == "" {
		code = utils.GenerateAppointmentCode()
	}

	appointment := &domain.Appointment{
		ID:                    utils.NewID(),
		OrganizationID:        orgId,
		Code:                  code,
		CustomerID:            customerID,
		StaffID:               req.StaffID,
		StartTime:             req.StartTime,
		EndTime:               req.EndTime,
		Status:                req.Status,
		Source:                req.Source,
		TotalAmount:           total,
		Note:                  req.Note,
		DeviceID:              req.DeviceID,
		ClientIP:              req.ClientIP,
		RequiredDepositAmount: req.RequiredDepositAmount,
		DepositStatus:         req.DepositStatus,
	}
	for _, item := range items {
		item.AppointmentID = appointment.ID
	}

	if err := u.applyDepositRule(ctx, orgId, customerID, total, appointment); err != nil {
		return nil, err
	}

	if err := u.repo.CreateAppointment(ctx, appointment, items); err != nil {
		log.Println("Error creating appointment:", err)
		return nil, apperror.New(500, "Lỗi khi tạo cuộc hẹn", err)
	}

	return appointment, nil
}

// UpdateAppointment ghi đè thông tin lịch hẹn và thay toàn bộ items.
func (u *AppointmentUseCase) UpdateAppointment(ctx context.Context, id string, req *domain.AppointmentCreateRequest) (*domain.Appointment, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id lịch hẹn", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	existing, err := u.repo.CheckExitAppointmentByID(ctx, orgID, id)
	if err != nil {
		if errors.Is(err, domain.ErrAppointmentNotFound) {
			return nil, apperror.New(404, "Không tìm thấy lịch hẹn", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy lịch hẹn", err)
	}

	// Field không có trên form sửa thì giữ nguyên giá trị cũ.
	if strings.TrimSpace(req.Status) == "" {
		req.Status = existing.Status
	}
	if strings.TrimSpace(req.Source) == "" {
		req.Source = existing.Source
	}
	if strings.TrimSpace(req.DepositStatus) == "" {
		req.DepositStatus = existing.DepositStatus
		if strings.TrimSpace(req.DepositStatus) == "" {
			req.DepositStatus = "none"
		}
	}
	req.RequiredDepositAmount = existing.RequiredDepositAmount

	if err := req.Validate(); err != nil {
		return nil, apperror.New(400, "Dữ liệu không hợp lệ", err)
	}

	phone := strings.TrimSpace(req.CustomerPhone)
	if phone == "" {
		return nil, apperror.New(400, "Số điện thoại khách hàng không được để trống", nil)
	}

	start, ok := parseAppointmentTime(req.StartTime)
	if !ok {
		return nil, apperror.New(400, "Thời gian bắt đầu không hợp lệ (dùng ISO8601)", nil)
	}
	end, ok := parseAppointmentTime(req.EndTime)
	if !ok {
		return nil, apperror.New(400, "Thời gian kết thúc không hợp lệ (dùng ISO8601)", nil)
	}
	if !end.After(start) {
		return nil, apperror.New(400, "Thời gian kết thúc phải sau thời gian bắt đầu", nil)
	}

	items, err := u.buildAppointmentItems(orgID, id, req.Items)
	if err != nil {
		return nil, err
	}
	if err := u.validateItemsInOrg(ctx, orgID, items); err != nil {
		return nil, err
	}

	var total float64
	for _, item := range items {
		total += item.LineTotal
	}

	customerID, err := u.resolveCustomerID(ctx, orgID, strings.TrimSpace(req.CustomerName), phone)
	if err != nil {
		return nil, err
	}

	appointment := &domain.Appointment{
		ID:                    existing.ID,
		OrganizationID:        orgID,
		Code:                  existing.Code,
		CustomerID:            customerID,
		StaffID:               req.StaffID,
		StartTime:             req.StartTime,
		EndTime:               req.EndTime,
		Status:                req.Status,
		Source:                req.Source,
		TotalAmount:           total,
		Note:                  req.Note,
		DeviceID:              existing.DeviceID,
		ClientIP:              existing.ClientIP,
		RequiredDepositAmount: req.RequiredDepositAmount,
		DepositStatus:         req.DepositStatus,
	}

	if err := u.repo.UpdateAppointment(ctx, appointment, items); err != nil {
		if errors.Is(err, domain.ErrAppointmentNotFound) {
			return nil, apperror.New(404, "Không tìm thấy lịch hẹn", err)
		}
		log.Println("Error updating appointment:", err)
		return nil, apperror.New(500, "Lỗi khi cập nhật cuộc hẹn", err)
	}

	return appointment, nil
}

// buildAppointmentItems validate từng item và tính line_total.
// appointmentID gán sau khi có ID lịch hẹn nên tạm để trống ở đây.
func (u *AppointmentUseCase) buildAppointmentItems(orgID, appointmentID string, inputs []domain.ApoimentItemInput) ([]*domain.AppointmentItem, error) {
	items := make([]*domain.AppointmentItem, 0, len(inputs))
	for i, in := range inputs {
		if in.Quantity <= 0 {
			return nil, apperror.New(400, fmt.Sprintf("Số lượng ở mục thứ %d phải lớn hơn 0", i+1), nil)
		}
		if in.UnitPrice < 0 {
			return nil, apperror.New(400, fmt.Sprintf("Đơn giá ở mục thứ %d không được âm", i+1), nil)
		}

		item := &domain.AppointmentItem{
			ID:             utils.NewID(),
			OrganizationID: orgID,
			AppointmentID:  appointmentID,
			ItemType:       strings.TrimSpace(in.ItemType),
			Quantity:       in.Quantity,
			UnitPrice:      in.UnitPrice,
			LineTotal:      in.Quantity * in.UnitPrice,
		}
		if id := strings.TrimSpace(in.ServiceID); id != "" {
			item.ServiceID = &id
		}
		if id := strings.TrimSpace(in.ProductID); id != "" {
			item.ProductID = &id
		}

		if err := item.Validate(); err != nil {
			return nil, apperror.New(400, err.Error(), err)
		}
		items = append(items, item)
	}
	return items, nil
}

// validateItemsInOrg đảm bảo service/product của items thuộc đúng organization.
func (u *AppointmentUseCase) validateItemsInOrg(ctx context.Context, orgID string, items []*domain.AppointmentItem) error {
	var serviceIDs, productIDs []string
	for _, item := range items {
		if item.ServiceID != nil {
			serviceIDs = append(serviceIDs, *item.ServiceID)
		}
		if item.ProductID != nil {
			productIDs = append(productIDs, *item.ProductID)
		}
	}

	if len(serviceIDs) > 0 {
		missing, err := u.catalog.ServicesExistInOrg(ctx, orgID, serviceIDs)
		if err != nil {
			return apperror.New(500, "Lỗi khi kiểm tra dịch vụ", err)
		}
		if len(missing) > 0 {
			return apperror.New(404, fmt.Sprintf("Không tìm thấy dịch vụ trong tổ chức: %s", strings.Join(missing, ", ")), nil)
		}
	}

	if len(productIDs) > 0 {
		missing, err := u.catalog.ProductsExistInOrg(ctx, orgID, productIDs)
		if err != nil {
			return apperror.New(500, "Lỗi khi kiểm tra sản phẩm", err)
		}
		if len(missing) > 0 {
			return apperror.New(404, fmt.Sprintf("Không tìm thấy sản phẩm trong tổ chức: %s", strings.Join(missing, ", ")), nil)
		}
	}
	return nil
}

// resolveCustomerID tìm customer theo phone, không thấy thì tạo mới.
// Chống race: trùng unique (2 request cùng phone) thì find lại thay vì báo 500.
func (u *AppointmentUseCase) resolveCustomerID(ctx context.Context, orgID, name, phone string) (string, error) {
	existing, err := u.customerFinder.FindCustomerByPhone(ctx, orgID, phone)
	if err != nil {
		log.Println("Error finding customer by phone:", err)
		return "", apperror.New(500, "Lỗi khi tìm khách hàng", err)
	}
	if existing != nil {
		return existing.ID, nil
	}

	if name == "" {
		return "", apperror.New(400, "Tên khách hàng không được để trống khi tạo mới", nil)
	}
	newCustomer := &customerDomain.Customer{
		ID:             utils.NewID(),
		OrganizationID: orgID,
		FullName:       name,
		Phone:          phone,
	}
	if err := newCustomer.Validate(); err != nil {
		return "", apperror.New(400, err.Error(), err)
	}

	if err := u.customerFinder.CreateCustomer(ctx, newCustomer); err != nil {
		if isUniqueViolation(err) {
			existing, findErr := u.customerFinder.FindCustomerByPhone(ctx, orgID, phone)
			if findErr != nil {
				log.Println("Error re-finding customer by phone:", findErr)
				return "", apperror.New(500, "Lỗi khi tìm khách hàng", findErr)
			}
			if existing != nil {
				return existing.ID, nil
			}
		}
		log.Println("Error creating customer:", err)
		return "", apperror.New(500, "Lỗi khi tạo khách hàng mới", err)
	}

	return newCustomer.ID, nil
}

// applyDepositRule buộc khách có nhiều lần no_show phải cọc cho lần đặt kế tiếp.
// Số tiền cọc do server tính từ cấu hình, không tin client gửi lên.
func (u *AppointmentUseCase) applyDepositRule(ctx context.Context, orgID, customerID string, total float64, appointment *domain.Appointment) error {
	if u.settingsRepo == nil {
		return nil
	}

	settings, err := u.settingsRepo.GetAppointmentSettings(ctx, orgID)
	if err != nil {
		if errors.Is(err, domain.ErrAppointmentSettingsNotFound) {
			settings = domain.DefaultAppointmentSettings(orgID)
		} else {
			log.Println("Error getting appointment settings:", err)
			return apperror.New(500, "Lỗi khi lấy cấu hình đặt lịch", err)
		}
	}

	if settings == nil || !settings.DepositEnabled {
		return nil
	}

	lookback := settings.NoShowLookbackDays
	if lookback <= 0 {
		lookback = 180
	}
	since := time.Now().AddDate(0, 0, -lookback)
	noShowCount, err := u.settingsRepo.CountCustomerNoShows(ctx, orgID, customerID, since)
	if err != nil {
		log.Println("Error counting customer no-shows:", err)
		return apperror.New(500, "Lỗi khi kiểm tra số lần không đến của khách", err)
	}

	amount, required := settings.RequiredDeposit(total, noShowCount)
	if !required {
		return nil
	}

	appointment.RequiredDepositAmount = amount
	if strings.TrimSpace(appointment.DepositStatus) == "" || appointment.DepositStatus == "none" {
		appointment.DepositStatus = "pending"
	}
	return nil
}

func (u *AppointmentUseCase) GetAppointments(ctx context.Context, page, pageSize int, status, from, to, search string) (*pagination.Result[*domain.AppointmentResponse], error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	status = strings.TrimSpace(status)
	if status != "" {
		valid := false
		for s := range domain.AllowedTransitions {
			if s == status {
				valid = true
				break
			}
		}
		if !valid {
			return nil, apperror.New(400, "Trạng thái lọc không hợp lệ", nil)
		}
	}
	for _, d := range []string{strings.TrimSpace(from), strings.TrimSpace(to)} {
		if d != "" {
			if _, ok := parseAppointmentTime(d); !ok {
				return nil, apperror.New(400, "Khoảng thời gian lọc không hợp lệ (dùng ISO8601)", nil)
			}
		}
	}

	params := pagination.Normalize(page, pageSize)
	search = strings.TrimSpace(search)

	appointments, err := u.repo.GetAppointmentsByOrgID(ctx, orgID, status, from, to, search, params.PageSize, params.Offset())
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy danh sách lịch hẹn", err)
	}

	total, err := u.repo.CountAppointmentsByOrgID(ctx, orgID, status, from, to, search)
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi đếm danh sách lịch hẹn", err)
	}

	return pagination.NewResult(appointments, params, total), nil
}

// weekDayLabels nhãn thứ theo thứ tự từ Thứ 2 đến Chủ nhật.
var weekDayLabels = []string{"Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"}

// parseWeekStart chấp nhận YYYY-MM-DD (giờ server) hoặc ISO8601 (giữ offset client gửi).
func parseWeekStart(raw string) (time.Time, *time.Location, bool) {
	raw = strings.TrimSpace(raw)
	if t, err := time.Parse("2006-01-02", raw); err == nil {
		return t, time.Local, true
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return t, t.Location(), true
	}
	return time.Time{}, nil, false
}

// GetWeeklySchedule trả lịch hẹn của tuần, tách theo 7 ngày (luôn đủ 7 phần tử).
func (u *AppointmentUseCase) GetWeeklySchedule(ctx context.Context, weekStartRaw string) (*domain.WeeklyScheduleResponse, error) {
	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	loc := time.Local
	base := time.Now().In(loc)
	if strings.TrimSpace(weekStartRaw) != "" {
		t, parsedLoc, ok := parseWeekStart(weekStartRaw)
		if !ok {
			return nil, apperror.New(400, "week_start không hợp lệ (dùng YYYY-MM-DD hoặc ISO8601)", nil)
		}
		loc = parsedLoc
		base = t
	}

	y, m, d := base.In(loc).Date()
	day := time.Date(y, m, d, 0, 0, 0, 0, loc)
	monday := day.AddDate(0, 0, -((int(day.Weekday()) + 6) % 7))
	end := monday.AddDate(0, 0, 7)

	appointments, err := u.repo.GetAppointmentsByDateRange(ctx, orgID, monday.Format(time.RFC3339), end.Format(time.RFC3339))
	if err != nil {
		return nil, apperror.New(500, "Lỗi khi lấy lịch tuần", err)
	}

	days := make([]*domain.WeekDaySchedule, 7)
	indexByDate := make(map[string]int, 7)
	for i := 0; i < 7; i++ {
		key := monday.AddDate(0, 0, i).Format("2006-01-02")
		indexByDate[key] = i
		days[i] = &domain.WeekDaySchedule{
			Date:         key,
			Weekday:      weekDayLabels[i],
			Appointments: make([]*domain.AppointmentResponse, 0),
		}
	}

	total := 0
	for _, a := range appointments {
		start, ok := parseAppointmentTime(a.StartTime)
		if !ok {
			continue
		}
		idx, ok := indexByDate[start.In(loc).Format("2006-01-02")]
		if !ok {
			continue
		}
		days[idx].Appointments = append(days[idx].Appointments, a)
		days[idx].Total++
		total++
	}

	return &domain.WeeklyScheduleResponse{
		WeekStart: monday.Format("2006-01-02"),
		WeekEnd:   end.AddDate(0, 0, -1).Format("2006-01-02"),
		Total:     total,
		Days:      days,
	}, nil
}

func (u *AppointmentUseCase) GetAppointmentDetail(ctx context.Context, id string) (*domain.AppointmentDetailResponse, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id lịch hẹn", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	appointment, err := u.repo.GetAppointmentByID(ctx, orgID, id)
	if err != nil {
		if errors.Is(err, domain.ErrAppointmentNotFound) {
			return nil, apperror.New(404, "Không tìm thấy lịch hẹn", err)
		}
		log.Println("Error getting appointment by ID:", err)
		return nil, apperror.New(500, "Lỗi khi lấy lịch hẹn", err)
	}

	items, err := u.repo.GetAppointmentItems(ctx, orgID, id)
	if err != nil {
		log.Println("Error getting appointment items:", err)
		return nil, apperror.New(500, "Lỗi khi lấy chi tiết lịch hẹn", err)
	}
	log.Println("Appointment items:", items)

	return &domain.AppointmentDetailResponse{
		Appointment: appointment,
		Items:       items,
	}, nil
}

func (u *AppointmentUseCase) RescheduleAppointment(ctx context.Context, id, startTime, endTime string) (*domain.Appointment, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id lịch hẹn", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	start, ok := parseAppointmentTime(startTime)
	if !ok {
		return nil, apperror.New(400, "Thời gian bắt đầu không hợp lệ (dùng ISO8601)", nil)
	}
	end, ok := parseAppointmentTime(endTime)
	if !ok {
		return nil, apperror.New(400, "Thời gian kết thúc không hợp lệ (dùng ISO8601)", nil)
	}
	if !end.After(start) {
		return nil, apperror.New(400, "Thời gian kết thúc phải sau thời gian bắt đầu", nil)
	}

	appointment, err := u.repo.CheckExitAppointmentByID(ctx, orgID, id)
	if err != nil {
		if errors.Is(err, domain.ErrAppointmentNotFound) {
			return nil, apperror.New(404, "Không tìm thấy lịch hẹn", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy lịch hẹn", err)
	}
	if !domain.ReschedulableStatuses[appointment.Status] {
		return nil, apperror.New(400, fmt.Sprintf("Không thể đổi lịch đang ở trạng thái %s", appointment.Status), nil)
	}

	if err := u.repo.UpdateAppointmentTimes(ctx, orgID, id, startTime, endTime); err != nil {
		if errors.Is(err, domain.ErrAppointmentNotFound) {
			return nil, apperror.New(404, "Không tìm thấy lịch hẹn", err)
		}
		return nil, apperror.New(500, "Lỗi khi đổi lịch hẹn", err)
	}

	appointment.StartTime = startTime
	appointment.EndTime = endTime
	return appointment, nil
}

func (u *AppointmentUseCase) CancelAppointment(ctx context.Context, id, reason string) (*domain.Appointment, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id lịch hẹn", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	appointment, err := u.repo.CheckExitAppointmentByID(ctx, orgID, id)
	if err != nil {
		if errors.Is(err, domain.ErrAppointmentNotFound) {
			return nil, apperror.New(404, "Không tìm thấy lịch hẹn", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy lịch hẹn", err)
	}
	if !domain.CancellableStatuses[appointment.Status] {
		return nil, apperror.New(400, fmt.Sprintf("Không thể hủy lịch đang ở trạng thái %s", appointment.Status), nil)
	}

	if err := u.repo.UpdateAppointmentStatus(ctx, orgID, id, "cancelled", strings.TrimSpace(reason)); err != nil {
		if errors.Is(err, domain.ErrAppointmentNotFound) {
			return nil, apperror.New(404, "Không tìm thấy lịch hẹn", err)
		}
		return nil, apperror.New(500, "Lỗi khi hủy lịch hẹn", err)
	}

	appointment.Status = "cancelled"
	appointment.CancelReason = strings.TrimSpace(reason)
	return appointment, nil
}

func (u *AppointmentUseCase) UpdateAppointmentStatus(ctx context.Context, id, status string) (*domain.Appointment, error) {
	if strings.TrimSpace(id) == "" {
		return nil, apperror.New(400, "Thiếu id lịch hẹn", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return nil, err
	}

	status = strings.TrimSpace(status)
	if _, ok := domain.AllowedTransitions[status]; !ok {
		return nil, apperror.New(400, "Trạng thái cuộc hẹn không hợp lệ", nil)
	}

	appointment, err := u.repo.CheckExitAppointmentByID(ctx, orgID, id)
	if err != nil {
		if errors.Is(err, domain.ErrAppointmentNotFound) {
			return nil, apperror.New(404, "Không tìm thấy lịch hẹn", err)
		}
		return nil, apperror.New(500, "Lỗi khi lấy lịch hẹn", err)
	}
	if !appointment.CanTransitionTo(status) {
		return nil, apperror.New(400, fmt.Sprintf("Không thể chuyển từ %s sang %s", appointment.Status, status), nil)
	}

	if err := u.repo.UpdateAppointmentStatus(ctx, orgID, id, status, ""); err != nil {
		if errors.Is(err, domain.ErrAppointmentNotFound) {
			return nil, apperror.New(404, "Không tìm thấy lịch hẹn", err)
		}
		return nil, apperror.New(500, "Lỗi khi cập nhật trạng thái lịch hẹn", err)
	}

	appointment.Status = status
	return appointment, nil
}

func (u *AppointmentUseCase) DeleteAppointment(ctx context.Context, id string) (string, error) {
	if strings.TrimSpace(id) == "" {
		return "", apperror.New(400, "Thiếu id lịch hẹn", nil)
	}

	orgID, err := shared.RequireOrgID(ctx)
	if err != nil {
		return "", err
	}

	appointment, err := u.repo.CheckExitAppointmentByID(ctx, orgID, id)
	if err != nil {
		if errors.Is(err, domain.ErrAppointmentNotFound) {
			return "", apperror.New(404, "Không tìm thấy lịch hẹn", err)
		}
		return "", apperror.New(500, "Lỗi khi lấy lịch hẹn", err)
	}
	if !domain.DeletableStatuses[appointment.Status] {
		return "", apperror.New(400, fmt.Sprintf("Không thể xóa lịch đang ở trạng thái %s (hãy hủy lịch thay thế)", appointment.Status), nil)
	}

	if err := u.repo.DeleteAppointment(ctx, orgID, id); err != nil {
		if errors.Is(err, domain.ErrAppointmentNotFound) {
			return "", apperror.New(404, "Không tìm thấy lịch hẹn", err)
		}
		return "", apperror.New(500, "Lỗi khi xóa lịch hẹn", err)
	}

	return id, nil
}
