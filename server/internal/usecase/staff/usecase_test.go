package staff

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	domain "github.com/daidat02/server/internal/domain/staff"
	"github.com/daidat02/server/pkg/apperror"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// withOrgCtx giả lập middleware VerifyToken: nhét org_id vào context.
func withOrgCtx(orgID string) context.Context {
	return context.WithValue(context.Background(), middlewares.OrgIdKey, orgID)
}

// validStaff trả về input đầy đủ, pass hết Validate():
// FullName, Phone, Position, CommissionRate 0-100, Status active/inactive.
func validStaff() *domain.Staff {
	birthDate := time.Date(1998, 3, 14, 0, 0, 0, 0, time.UTC)
	return &domain.Staff{
		Code:              "NV001",
		FullName:          "Nguyễn Văn A",
		Phone:             "0901234567",
		Email:             "vana@salon.test",
		BirthDate:         &birthDate,
		Gender:            "male",
		Address:           "45 Nguyễn Trãi, Q.1, TP.HCM",
		Position:          "Thợ cắt tóc",
		EmploymentType:    "fulltime",
		CommissionRate:    10,
		BaseSalary:        8000000,
		BankName:          "Vietcombank",
		BankAccountNumber: "0071008821",
		BankAccountHolder: "NGUYEN VAN A",
		Status:            "active",
		HireDate:          time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
	}
}

// assertFlatAppError kiểm tra err là *AppError đúng 1 lớp (không lồng nhau).
func assertFlatAppError(t *testing.T, err error, expectedCode int) {
	t.Helper()
	var appErr *apperror.AppError
	assert.True(t, errors.As(err, &appErr), "Lỗi phải là *apperror.AppError")
	if appErr != nil {
		assert.Equal(t, expectedCode, appErr.StatusCode, "Sai StatusCode")
		// Chống lồng: Err gốc bên trong KHÔNG được là *AppError nữa
		var inner *apperror.AppError
		assert.False(t, errors.As(appErr.Err, &inner), "Lỗi bị lồng 2 lớp AppError")
	}
}

func TestStaffUsecase_CreateStaff(f *testing.T) {
	// Định nghĩa các kịch bản test (Table-Driven Test)
	tests := []struct {
		name          string
		ctx           context.Context
		inputStaff    *domain.Staff
		mockReturnErr error
		callRepo      bool // repo có được gọi không (validate/context fail thì không)
		expectedError bool
		expectedCode  int // StatusCode kỳ vọng của *apperror.AppError
	}{
		{
			name:          "Thành công - Tạo nhân viên mới hợp lệ",
			ctx:           withOrgCtx("org-123"),
			inputStaff:    validStaff(),
			mockReturnErr: nil,
			callRepo:      true,
			expectedError: false,
		},
		{
			name:          "Thất bại - Lỗi từ database",
			ctx:           withOrgCtx("org-123"),
			inputStaff:    validStaff(),
			mockReturnErr: errors.New("database duplicate error"),
			callRepo:      true,
			expectedError: true,
			expectedCode:  500,
		},
		{
			name: "Thất bại - Thiếu organization_id trong context",
			ctx:  context.Background(), // không có org_id
			inputStaff: func() *domain.Staff {
				return validStaff()
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - organization_id rỗng trong context",
			ctx:  withOrgCtx(""),
			inputStaff: func() *domain.Staff {
				return validStaff()
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - Validate (thiếu tên đầy đủ)",
			ctx:  withOrgCtx("org-123"),
			inputStaff: func() *domain.Staff {
				s := validStaff()
				s.FullName = ""
				return s
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - Validate (thiếu số điện thoại)",
			ctx:  withOrgCtx("org-123"),
			inputStaff: func() *domain.Staff {
				s := validStaff()
				s.Phone = ""
				return s
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - Validate (thiếu vị trí)",
			ctx:  withOrgCtx("org-123"),
			inputStaff: func() *domain.Staff {
				s := validStaff()
				s.Position = ""
				return s
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - Validate (hoa hồng vượt 100)",
			ctx:  withOrgCtx("org-123"),
			inputStaff: func() *domain.Staff {
				s := validStaff()
				s.CommissionRate = 150
				return s
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - Validate (trạng thái không hợp lệ)",
			ctx:  withOrgCtx("org-123"),
			inputStaff: func() *domain.Staff {
				s := validStaff()
				s.Status = "unknown"
				return s
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - Validate (lương cơ bản âm)",
			ctx:  withOrgCtx("org-123"),
			inputStaff: func() *domain.Staff {
				s := validStaff()
				s.BaseSalary = -1
				return s
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - Validate (giới tính không hợp lệ)",
			ctx:  withOrgCtx("org-123"),
			inputStaff: func() *domain.Staff {
				s := validStaff()
				s.Gender = "unknown"
				return s
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - Validate (hình thức làm việc không hợp lệ)",
			ctx:  withOrgCtx("org-123"),
			inputStaff: func() *domain.Staff {
				s := validStaff()
				s.EmploymentType = "unknown"
				return s
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
	}

	// Chạy vòng lặp qua từng kịch bản
	for _, tt := range tests {
		f.Run(tt.name, func(t *testing.T) {
			// 1. Khởi tạo Mock Repository
			mockRepo := new(MockStaffRepository)

			// 2. Thiết lập kỳ vọng: dùng mock.Anything cho cả ctx lẫn staff
			// vì usecase mutate staff.ID/staff.OrganizationID trước khi gọi repo.
			if tt.callRepo {
				mockRepo.On("CreateStaff", mock.Anything, mock.Anything).Return("NV013", tt.mockReturnErr)
			}

			// 3. Khởi tạo Usecase THẬT với mock repo vừa tạo
			uc := NewStaffUsecase(mockRepo)
			// 4. Hứng đủ 2 giá trị trả về (res và err)
			res, err := uc.CreateStaff(tt.ctx, tt.inputStaff)

			// 5. Kiểm tra kết quả bằng testify/assert
			if tt.expectedError {
				assert.Error(t, err, "Kỳ vọng phải trả về lỗi nhưng lại không có")
				assert.Nil(t, res, "Khi có lỗi thì kết quả trả về phải là nil")
				assertFlatAppError(t, err, tt.expectedCode)
				if tt.callRepo {
					mockRepo.AssertExpectations(t)
				} else {
					mockRepo.AssertNotCalled(t, "CreateStaff", mock.Anything, mock.Anything)
				}
			} else {
				assert.NoError(t, err, "Không kỳ vọng có lỗi nhưng lại phát sinh lỗi")
				assert.NotNil(t, res, "Khi thành công thì phải trả về kết quả")
				assert.NotEmpty(t, res.ID, "ID phải được sinh ra")
				assert.Equal(t, "org-123", res.OrganizationID, "OrganizationID phải lấy từ context")
				assert.Equal(t, "NV013", res.Code, "Mã nhân viên phải do server sinh ra")
				assert.Equal(t, tt.inputStaff.FullName, res.FullName)
				assert.Equal(t, tt.inputStaff.Phone, res.Phone)
				assert.Equal(t, tt.inputStaff.Email, res.Email)
				assert.Equal(t, tt.inputStaff.BirthDate, res.BirthDate)
				assert.Equal(t, tt.inputStaff.Gender, res.Gender)
				assert.Equal(t, tt.inputStaff.Address, res.Address)
				assert.Equal(t, tt.inputStaff.Position, res.Position)
				assert.Equal(t, tt.inputStaff.EmploymentType, res.EmploymentType)
				assert.Equal(t, tt.inputStaff.CommissionRate, res.CommissionRate)
				assert.Equal(t, tt.inputStaff.BaseSalary, res.BaseSalary)
				assert.Equal(t, tt.inputStaff.BankName, res.BankName)
				assert.Equal(t, tt.inputStaff.BankAccountNumber, res.BankAccountNumber)
				assert.Equal(t, tt.inputStaff.BankAccountHolder, res.BankAccountHolder)
				assert.Equal(t, tt.inputStaff.Status, res.Status)
				assert.True(t, tt.inputStaff.HireDate.Equal(res.HireDate))
				mockRepo.AssertExpectations(t)
			}
		})
	}
}

func TestStaffUsecase_GetStaffByID(f *testing.T) {
	tests := []struct {
		name          string
		ctx           context.Context
		id            string
		mockStaff     *domain.Staff
		mockErr       error
		callRepo      bool
		expectedError bool
		expectedCode  int
	}{
		{
			name: "Thành công - Lấy chi tiết nhân viên",
			ctx:  withOrgCtx("org-123"),
			id:   "staff-1",
			mockStaff: func() *domain.Staff {
				s := validStaff()
				s.ID = "staff-1"
				s.OrganizationID = "org-123"
				return s
			}(),
			callRepo: true,
		},
		{
			name:          "Thất bại - Thiếu id nhân viên",
			ctx:           withOrgCtx("org-123"),
			id:            "",
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - Thiếu organization_id trong context",
			ctx:           context.Background(),
			id:            "staff-1",
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - Không tìm thấy nhân viên",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-missing",
			mockErr:       domain.ErrStaffNotFound,
			callRepo:      true,
			expectedError: true,
			expectedCode:  404,
		},
		{
			name:          "Thất bại - Lỗi database",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-1",
			mockErr:       errors.New("db connection refused"),
			callRepo:      true,
			expectedError: true,
			expectedCode:  500,
		},
	}

	for _, tt := range tests {
		f.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockStaffRepository)
			if tt.callRepo {
				mockRepo.On("GetStaffByID", mock.Anything, "org-123", tt.id).Return(tt.mockStaff, tt.mockErr)
			}

			uc := NewStaffUsecase(mockRepo)
			res, err := uc.GetStaffByID(tt.ctx, tt.id)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, res)
				assertFlatAppError(t, err, tt.expectedCode)
				if tt.callRepo {
					mockRepo.AssertExpectations(t)
				} else {
					mockRepo.AssertNotCalled(t, "GetStaffByID", mock.Anything, mock.Anything, mock.Anything)
				}
				return
			}

			assert.NoError(t, err)
			assert.NotNil(t, res)
			assert.Equal(t, tt.mockStaff.ID, res.ID)
			assert.Equal(t, tt.mockStaff.OrganizationID, res.OrganizationID)
			assert.Equal(t, tt.mockStaff.Code, res.Code)
			assert.Equal(t, tt.mockStaff.FullName, res.FullName)
			assert.Equal(t, tt.mockStaff.Phone, res.Phone)
			assert.Equal(t, tt.mockStaff.Email, res.Email)
			assert.Equal(t, tt.mockStaff.Position, res.Position)
			assert.Equal(t, tt.mockStaff.Status, res.Status)
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestStaffUsecase_GetStaffByOrgID(f *testing.T) {
	hireDate := time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC)
	staffList := []*domain.Staff{
		{ID: "staff-1", OrganizationID: "org-123", Code: "NV001", FullName: "Nguyễn Văn A", Phone: "0901234567", Position: "Thợ cắt tóc", CommissionRate: 10, Status: "active", HireDate: hireDate},
		{ID: "staff-2", OrganizationID: "org-123", Code: "NV002", FullName: "Trần Thị B", Phone: "0907654321", Position: "Lễ tân", CommissionRate: 5, Status: "inactive", HireDate: hireDate},
	}

	tests := []struct {
		name          string
		ctx           context.Context
		page          int
		pageSize      int
		mockReturn    []*domain.Staff
		mockTotal     int64
		mockListErr   error
		mockCountErr  error
		callRepo      bool
		callCount     bool
		expectedError bool
		expectedCode  int
		expectedLen   int
		expectedTotal int64
	}{
		{
			name:          "Thành công - Lấy danh sách nhân viên theo org (page 1)",
			ctx:           withOrgCtx("org-123"),
			page:          1,
			pageSize:      20,
			mockReturn:    staffList,
			mockTotal:     2,
			mockListErr:   nil,
			mockCountErr:  nil,
			callRepo:      true,
			callCount:     true,
			expectedError: false,
			expectedLen:   2,
			expectedTotal: 2,
		},
		{
			name:          "Thành công - Org chưa có nhân viên (list rỗng)",
			ctx:           withOrgCtx("org-123"),
			page:          1,
			pageSize:      20,
			mockReturn:    []*domain.Staff{},
			mockTotal:     0,
			mockListErr:   nil,
			mockCountErr:  nil,
			callRepo:      true,
			callCount:     true,
			expectedError: false,
			expectedLen:   0,
			expectedTotal: 0,
		},
		{
			name:          "Thành công - Page vượt quá vẫn normalize và trả envelope",
			ctx:           withOrgCtx("org-123"),
			page:          5,
			pageSize:      1,
			mockReturn:    []*domain.Staff{},
			mockTotal:     2,
			mockListErr:   nil,
			mockCountErr:  nil,
			callRepo:      true,
			callCount:     true,
			expectedError: false,
			expectedLen:   0,
			expectedTotal: 2,
		},
		{
			name:          "Thất bại - Thiếu organization_id trong context",
			ctx:           context.Background(),
			page:          1,
			pageSize:      20,
			mockReturn:    nil,
			mockTotal:     0,
			mockListErr:   nil,
			mockCountErr:  nil,
			callRepo:      false,
			callCount:     false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - Lỗi database khi lấy danh sách",
			ctx:           withOrgCtx("org-123"),
			page:          1,
			pageSize:      20,
			mockReturn:    nil,
			mockTotal:     0,
			mockListErr:   errors.New("db connection refused"),
			mockCountErr:  nil,
			callRepo:      true,
			callCount:     false,
			expectedError: true,
			expectedCode:  500,
		},
		{
			name:          "Thất bại - Lỗi database khi đếm danh sách",
			ctx:           withOrgCtx("org-123"),
			page:          1,
			pageSize:      20,
			mockReturn:    staffList,
			mockTotal:     0,
			mockListErr:   nil,
			mockCountErr:  errors.New("db count failed"),
			callRepo:      true,
			callCount:     true,
			expectedError: true,
			expectedCode:  500,
		},
	}

	for _, tt := range tests {
		f.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockStaffRepository)
			if tt.callRepo {
				mockRepo.On("GetStaffByOrgID", mock.Anything, "org-123", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
					Return(tt.mockReturn, tt.mockListErr)
			}
			if tt.callCount {
				mockRepo.On("CountStaffsByOrgID", mock.Anything, "org-123", mock.Anything, mock.Anything).
					Return(tt.mockTotal, tt.mockCountErr)
			}

			uc := NewStaffUsecase(mockRepo)
			res, err := uc.GetStaffByOrgID(tt.ctx, "", "", "created_at_desc", tt.page, tt.pageSize)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, res)
				assertFlatAppError(t, err, tt.expectedCode)
				if tt.callRepo {
					mockRepo.AssertExpectations(t)
				} else {
					mockRepo.AssertNotCalled(t, "GetStaffByOrgID", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, res)
				assert.NotNil(t, res.Data)
				assert.Len(t, res.Data, tt.expectedLen)
				assert.Equal(t, tt.expectedTotal, res.Total)
				for i := range res.Data {
					assert.Equal(t, "org-123", res.Data[i].OrganizationID)
				}
				mockRepo.AssertExpectations(t)
			}
		})
	}
}

func TestStaffUsecase_UpdateStaff(f *testing.T) {
	tests := []struct {
		name          string
		ctx           context.Context
		id            string
		inputStaff    *domain.Staff
		mockReturnErr error
		callRepo      bool
		expectedError bool
		expectedCode  int
	}{
		{
			name:          "Thành công - Cập nhật nhân viên hợp lệ",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-1",
			inputStaff:    validStaff(),
			mockReturnErr: nil,
			callRepo:      true,
			expectedError: false,
		},
		{
			name:          "Thất bại - Thiếu id nhân viên",
			ctx:           withOrgCtx("org-123"),
			id:            "",
			inputStaff:    validStaff(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - Thiếu organization_id trong context",
			ctx:           context.Background(),
			id:            "staff-1",
			inputStaff:    validStaff(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - Validate (thiếu tên đầy đủ)",
			ctx:  withOrgCtx("org-123"),
			id:   "staff-1",
			inputStaff: func() *domain.Staff {
				s := validStaff()
				s.FullName = ""
				return s
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name: "Thất bại - Validate (hoa hồng vượt 100)",
			ctx:  withOrgCtx("org-123"),
			id:   "staff-1",
			inputStaff: func() *domain.Staff {
				s := validStaff()
				s.CommissionRate = 120
				return s
			}(),
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - Không tìm thấy nhân viên (sai id / khác org / đã xóa)",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-missing",
			inputStaff:    validStaff(),
			mockReturnErr: domain.ErrStaffNotFound,
			callRepo:      true,
			expectedError: true,
			expectedCode:  404,
		},
		{
			name:          "Thất bại - Lỗi database khi cập nhật",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-1",
			inputStaff:    validStaff(),
			mockReturnErr: errors.New("db connection refused"),
			callRepo:      true,
			expectedError: true,
			expectedCode:  500,
		},
	}

	for _, tt := range tests {
		f.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockStaffRepository)
			if tt.callRepo {
				mockRepo.On("UpdateStaff", mock.Anything, mock.Anything).Return(tt.mockReturnErr)
			}

			uc := NewStaffUsecase(mockRepo)
			res, err := uc.UpdateStaff(tt.ctx, tt.id, tt.inputStaff)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, res)
				assertFlatAppError(t, err, tt.expectedCode)
				if tt.callRepo {
					mockRepo.AssertExpectations(t)
				} else {
					mockRepo.AssertNotCalled(t, "UpdateStaff", mock.Anything, mock.Anything)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, res)
				assert.Equal(t, tt.id, res.ID, "ID phải giữ nguyên id trên path")
				assert.Equal(t, "org-123", res.OrganizationID, "OrganizationID phải lấy từ context")
				assert.Equal(t, tt.inputStaff.Code, res.Code)
				assert.Equal(t, tt.inputStaff.FullName, res.FullName)
				assert.Equal(t, tt.inputStaff.Phone, res.Phone)
				assert.Equal(t, tt.inputStaff.Email, res.Email)
				assert.Equal(t, tt.inputStaff.BirthDate, res.BirthDate)
				assert.Equal(t, tt.inputStaff.Gender, res.Gender)
				assert.Equal(t, tt.inputStaff.Address, res.Address)
				assert.Equal(t, tt.inputStaff.Position, res.Position)
				assert.Equal(t, tt.inputStaff.EmploymentType, res.EmploymentType)
				assert.Equal(t, tt.inputStaff.CommissionRate, res.CommissionRate)
				assert.Equal(t, tt.inputStaff.BaseSalary, res.BaseSalary)
				assert.Equal(t, tt.inputStaff.BankName, res.BankName)
				assert.Equal(t, tt.inputStaff.BankAccountNumber, res.BankAccountNumber)
				assert.Equal(t, tt.inputStaff.BankAccountHolder, res.BankAccountHolder)
				assert.Equal(t, tt.inputStaff.Status, res.Status)
				assert.True(t, tt.inputStaff.HireDate.Equal(res.HireDate))
				mockRepo.AssertExpectations(t)
			}
		})
	}
}

func TestStaffUsecase_GetStaffPayroll(f *testing.T) {
	payroll := &domain.StaffPayrollResponse{
		StaffID:             "staff-1",
		BaseSalary:          8000000,
		StandardWorkingDays: 26,
		ActualWorkingDays:   24,
		ProratedBaseSalary:  7384615.38,
		TotalCommission:     1039500,
		NetPay:              8300000,
	}

	tests := []struct {
		name                string
		ctx                 context.Context
		id                  string
		dateFrom            string
		dateTo              string
		standardWorkingDays int
		mockReturn          *domain.StaffPayrollResponse
		mockErr             error
		callRepo            bool
		expectedDays        int
		expectedError       bool
		expectedCode        int
	}{
		{
			name:          "Thành công - Mặc định tháng hiện tại và 26 ngày công",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-1",
			mockReturn:    payroll,
			callRepo:      true,
			expectedDays:  26,
			expectedError: false,
		},
		{
			name:                "Thành công - Khoảng ngày và ngày công tùy chọn",
			ctx:                 withOrgCtx("org-123"),
			id:                  "staff-1",
			dateFrom:            "2026-09-01",
			dateTo:              "2026-09-30",
			standardWorkingDays: 30,
			mockReturn:          payroll,
			callRepo:            true,
			expectedDays:        30,
			expectedError:       false,
		},
		{
			name:          "Thất bại - Thiếu id nhân viên",
			ctx:           withOrgCtx("org-123"),
			id:            " ",
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - Thiếu organization_id trong context",
			ctx:           context.Background(),
			id:            "staff-1",
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - date_from không hợp lệ",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-1",
			dateFrom:      "01-09-2026",
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - date_to không hợp lệ",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-1",
			dateTo:        "not-a-date",
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - date_from sau date_to",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-1",
			dateFrom:      "2026-09-30",
			dateTo:        "2026-09-01",
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:                "Thất bại - Số ngày công chuẩn không hợp lệ",
			ctx:                 withOrgCtx("org-123"),
			id:                  "staff-1",
			standardWorkingDays: 32,
			callRepo:            false,
			expectedError:       true,
			expectedCode:        400,
		},
		{
			name:          "Thất bại - Không tìm thấy nhân viên",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-missing",
			mockErr:       domain.ErrStaffNotFound,
			callRepo:      true,
			expectedDays:  26,
			expectedError: true,
			expectedCode:  404,
		},
		{
			name:          "Thất bại - Lỗi database",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-1",
			mockErr:       errors.New("db connection refused"),
			callRepo:      true,
			expectedDays:  26,
			expectedError: true,
			expectedCode:  500,
		},
	}

	for _, tt := range tests {
		f.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockStaffRepository)
			if tt.callRepo {
				mockRepo.On(
					"GetStaffPayroll",
					mock.Anything,
					"org-123",
					tt.id,
					tt.dateFrom,
					tt.dateTo,
					tt.expectedDays,
				).Return(tt.mockReturn, tt.mockErr)
			}

			uc := NewStaffUsecase(mockRepo)
			res, err := uc.GetStaffPayroll(
				tt.ctx,
				tt.id,
				tt.dateFrom,
				tt.dateTo,
				tt.standardWorkingDays,
			)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, res)
				assertFlatAppError(t, err, tt.expectedCode)
				if tt.callRepo {
					mockRepo.AssertExpectations(t)
				} else {
					mockRepo.AssertNotCalled(t, "GetStaffPayroll", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
				}
				return
			}

			assert.NoError(t, err)
			assert.Equal(t, tt.mockReturn, res)
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestStaffUsecase_GetStaffServiceHistory(t *testing.T) {
	staff := validStaff()
	staff.ID = "staff-1"

	summary := &domain.StaffServiceHistorySummary{
		TotalOrders:      3,
		TotalItems:       5,
		TotalCommission:  450000,
		TotalAmountValue: 3000000,
	}
	items := []*domain.StaffServiceHistoryItem{
		{
			ID:               "ois-1",
			OrderID:          "order-1",
			OrderItemID:      "item-1",
			OrderCode:        "HD-001",
			CustomerName:     "Trần Lan Anh",
			ServiceName:      "Nhuộm Balayage",
			LineTotal:        2800000,
			CommissionAmount: 420000,
			Type:             "percent",
			SharePct:         15,
		},
	}

	tests := []struct {
		name           string
		ctx            context.Context
		id             string
		dateFrom       string
		dateTo         string
		search         string
		page           int
		pageSize       int
		staffErr       error
		historyErr     error
		total          int64
		expectedLimit  int
		expectedOffset int
		expectedPage   int
		expectedSize   int
		expectedPages  int64
		expectedError  bool
		expectedCode   int
	}{
		{
			name:           "Thành công - Mặc định trang 1, 20 dòng và tháng hiện tại",
			ctx:            withOrgCtx("org-123"),
			id:             "staff-1",
			total:          1,
			expectedLimit:  20,
			expectedOffset: 0,
			expectedPage:   1,
			expectedSize:   20,
			expectedPages:  1,
		},
		{
			name:           "Thành công - Phân trang tùy chọn",
			ctx:            withOrgCtx("org-123"),
			id:             "staff-1",
			dateFrom:       "2026-09-01",
			dateTo:         "2026-09-30",
			page:           2,
			pageSize:       5,
			total:          7,
			expectedLimit:  5,
			expectedOffset: 5,
			expectedPage:   2,
			expectedSize:   5,
			expectedPages:  2,
		},
		{
			name:           "Thành công - Có từ khóa tìm kiếm",
			ctx:            withOrgCtx("org-123"),
			id:             "staff-1",
			search:         "HD-001",
			total:          1,
			expectedLimit:  20,
			expectedOffset: 0,
			expectedPage:   1,
			expectedSize:   20,
			expectedPages:  1,
		},
		{
			name:           "Thành công - Chuẩn hóa page/page_size không hợp lệ",
			ctx:            withOrgCtx("org-123"),
			id:             "staff-1",
			page:           0,
			pageSize:       1000,
			total:          0,
			expectedLimit:  100,
			expectedOffset: 0,
			expectedPage:   1,
			expectedSize:   100,
			expectedPages:  0,
		},
		{
			name:          "Thất bại - Thiếu id nhân viên",
			ctx:           withOrgCtx("org-123"),
			id:            " ",
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - Thiếu organization_id trong context",
			ctx:           context.Background(),
			id:            "staff-1",
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - date_from không hợp lệ",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-1",
			dateFrom:      "01-09-2026",
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - date_from sau date_to",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-1",
			dateFrom:      "2026-09-30",
			dateTo:        "2026-09-01",
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - Không tìm thấy nhân viên",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-missing",
			staffErr:      domain.ErrStaffNotFound,
			expectedError: true,
			expectedCode:  404,
		},
		{
			name:           "Thất bại - Lỗi database khi lấy lịch sử",
			ctx:            withOrgCtx("org-123"),
			id:             "staff-1",
			historyErr:     errors.New("db connection refused"),
			expectedLimit:  20,
			expectedOffset: 0,
			expectedError:  true,
			expectedCode:   500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockStaffRepository)
			needsStaffLookup := !tt.expectedError ||
				tt.expectedCode == 404 ||
				tt.expectedCode == 500
			if needsStaffLookup {
				mockRepo.On("GetStaffByID", mock.Anything, "org-123", tt.id).Return(staff, tt.staffErr)
			}
			if tt.expectedCode == 0 || tt.expectedCode == 500 {
				mockRepo.On(
					"GetStaffServiceHistory",
					mock.Anything,
					"org-123",
					tt.id,
					tt.dateFrom,
					tt.dateTo,
					tt.search,
					tt.expectedLimit,
					tt.expectedOffset,
				).Return(summary, items, tt.total, tt.historyErr)
			}

			uc := NewStaffUsecase(mockRepo)
			res, err := uc.GetStaffServiceHistory(
				tt.ctx,
				tt.id,
				tt.dateFrom,
				tt.dateTo,
				tt.search,
				tt.page,
				tt.pageSize,
			)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, res)
				assertFlatAppError(t, err, tt.expectedCode)
				mockRepo.AssertExpectations(t)
				return
			}

			assert.NoError(t, err)
			assert.NotNil(t, res)
			assert.Equal(t, summary, res.Summary)
			assert.Equal(t, items, res.Data)
			assert.Equal(t, tt.expectedPage, res.Page)
			assert.Equal(t, tt.expectedSize, res.PageSize)
			assert.Equal(t, tt.total, res.Total)
			assert.Equal(t, tt.expectedPages, res.TotalPages)
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestStaffUsecase_DeleteStaff(f *testing.T) {
	tests := []struct {
		name          string
		ctx           context.Context
		id            string
		mockReturnErr error
		callRepo      bool
		expectedError bool
		expectedCode  int
	}{
		{
			name:          "Thành công - Xóa mềm nhân viên",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-1",
			mockReturnErr: nil,
			callRepo:      true,
			expectedError: false,
		},
		{
			name:          "Thất bại - Thiếu id nhân viên",
			ctx:           withOrgCtx("org-123"),
			id:            "",
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - Thiếu organization_id trong context",
			ctx:           context.Background(),
			id:            "staff-1",
			mockReturnErr: nil,
			callRepo:      false,
			expectedError: true,
			expectedCode:  400,
		},
		{
			name:          "Thất bại - Không tìm thấy nhân viên (đã xóa / khác org)",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-missing",
			mockReturnErr: domain.ErrStaffNotFound,
			callRepo:      true,
			expectedError: true,
			expectedCode:  404,
		},
		{
			name:          "Thất bại - Lỗi database khi xóa",
			ctx:           withOrgCtx("org-123"),
			id:            "staff-1",
			mockReturnErr: errors.New("db connection refused"),
			callRepo:      true,
			expectedError: true,
			expectedCode:  500,
		},
	}

	for _, tt := range tests {
		f.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockStaffRepository)
			if tt.callRepo {
				mockRepo.On("DeleteStaff", mock.Anything, "org-123", tt.id).Return(tt.mockReturnErr)
			}

			uc := NewStaffUsecase(mockRepo)
			deletedID, err := uc.DeleteStaff(tt.ctx, tt.id)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Empty(t, deletedID)
				assertFlatAppError(t, err, tt.expectedCode)
				if tt.callRepo {
					mockRepo.AssertExpectations(t)
				} else {
					mockRepo.AssertNotCalled(t, "DeleteStaff", mock.Anything, mock.Anything, mock.Anything)
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.id, deletedID)
				mockRepo.AssertExpectations(t)
			}
		})
	}
}
