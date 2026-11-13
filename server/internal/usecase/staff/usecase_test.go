package staff

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/daidat02/server/internal/delivery/http/middlewares"
	settingDomain "github.com/daidat02/server/internal/domain/setting"
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

func TestStaffUsecase_GetStaffPayroll(t *testing.T) {
	defaultSettings := func() *settingDomain.PayrollSettings {
		s := settingDomain.DefaultPayrollSettings()
		return &s
	}

	t.Run("Thành công - kỳ chưa có bảng lương thì tính live", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		staff := validStaff()
		live := &domain.StaffPayrollResponse{
			StaffID:             "staff-1",
			BaseSalary:          8000000,
			StandardWorkingDays: 26,
			ActualWorkingDays:   24,
			ProratedBaseSalary:  7384615.38,
			TotalCommission:     1039500,
			NetPay:              8300000,
		}
		mockRepo.On("GetPayrollSettings", mock.Anything, "org-123").Return(defaultSettings(), nil).Once()
		mockRepo.On("GetStaffByID", mock.Anything, "org-123", "staff-1").Return(staff, nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, "org-123", "staff-1", "2026-11-01").
			Return(nil, domain.ErrPayrollNotFound).Once()
		mockRepo.On("GetStaffPayroll", mock.Anything, "org-123", "staff-1", "2026-10-26", "2026-11-26", 26).
			Return(live, nil).Once()

		uc := NewStaffUsecase(mockRepo)
		res, err := uc.GetStaffPayroll(withOrgCtx("org-123"), "staff-1", "2026-11")

		assert.NoError(t, err)
		assert.Equal(t, "live", res.Source)
		assert.Nil(t, res.PayrollStatus)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Thành công - kỳ đã có bảng lương thì đọc snapshot", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		staff := validStaff()
		payroll := &domain.Payroll{
			ID:                  "payroll-1",
			StaffID:             "staff-1",
			Status:              domain.PayrollStatusApproved,
			BaseSalary:          7000000,
			CommissionAmount:    1000000,
			BonusAmount:         500000,
			AdvanceAmount:       200000,
			DeductionAmount:     100000,
			NetPay:              8200000,
			StandardWorkingDays: 26,
			TotalLeaveDays:      2,
			ActualWorkingDays:   24,
			PenaltyAmount:       40000,
			AdjustmentDeduction: 60000,
			TotalOrders:         10,
			TotalItems:          15,
			TotalAmountValue:    5000000,
		}
		mockRepo.On("GetPayrollSettings", mock.Anything, "org-123").Return(defaultSettings(), nil).Once()
		mockRepo.On("GetStaffByID", mock.Anything, "org-123", "staff-1").Return(staff, nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, "org-123", "staff-1", "2026-11-01").
			Return(payroll, nil).Once()

		uc := NewStaffUsecase(mockRepo)
		res, err := uc.GetStaffPayroll(withOrgCtx("org-123"), "staff-1", "2026-11")

		assert.NoError(t, err)
		assert.Equal(t, "payroll", res.Source)
		assert.NotNil(t, res.PayrollStatus)
		assert.Equal(t, domain.PayrollStatusApproved, *res.PayrollStatus)
		assert.Equal(t, payroll.BaseSalary, res.ProratedBaseSalary)
		assert.Equal(t, payroll.StandardWorkingDays, res.StandardWorkingDays)
		assert.Equal(t, payroll.TotalLeaveDays, res.TotalLeaveDays)
		assert.Equal(t, payroll.ActualWorkingDays, res.ActualWorkingDays)
		assert.Equal(t, payroll.CommissionAmount, res.TotalCommission)
		assert.Equal(t, payroll.DeductionAmount, res.TotalDeduction)
		assert.Equal(t, payroll.NetPay, res.NetPay)
		mockRepo.AssertNotCalled(t, "GetStaffPayroll", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("Thành công - bảng lương cancelled thì tính live", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		staff := validStaff()
		payroll := &domain.Payroll{StaffID: "staff-1", Status: domain.PayrollStatusCancelled}
		live := &domain.StaffPayrollResponse{StaffID: "staff-1"}
		mockRepo.On("GetPayrollSettings", mock.Anything, "org-123").Return(defaultSettings(), nil).Once()
		mockRepo.On("GetStaffByID", mock.Anything, "org-123", "staff-1").Return(staff, nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, "org-123", "staff-1", "2026-11-01").
			Return(payroll, nil).Once()
		mockRepo.On("GetStaffPayroll", mock.Anything, "org-123", "staff-1", "2026-10-26", "2026-11-26", 26).
			Return(live, nil).Once()

		uc := NewStaffUsecase(mockRepo)
		res, err := uc.GetStaffPayroll(withOrgCtx("org-123"), "staff-1", "2026-11")

		assert.NoError(t, err)
		assert.Equal(t, "live", res.Source)
	})

	t.Run("Thành công - dùng start_day và ngày công từ cấu hình", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		staff := validStaff()
		settings := &settingDomain.PayrollSettings{
			StartDay:            25,
			StandardWorkingDays: 22,
			AutoDraftCutoffDay:  7,
		}
		live := &domain.StaffPayrollResponse{StaffID: "staff-1"}
		mockRepo.On("GetPayrollSettings", mock.Anything, "org-123").Return(settings, nil).Once()
		mockRepo.On("GetStaffByID", mock.Anything, "org-123", "staff-1").Return(staff, nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, "org-123", "staff-1", "2026-11-01").
			Return(nil, domain.ErrPayrollNotFound).Once()
		mockRepo.On("GetStaffPayroll", mock.Anything, "org-123", "staff-1", "2026-10-25", "2026-11-25", 22).
			Return(live, nil).Once()

		uc := NewStaffUsecase(mockRepo)
		_, err := uc.GetStaffPayroll(withOrgCtx("org-123"), "staff-1", "2026-11")

		assert.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Thành công - lỗi đọc cấu hình thì dùng mặc định", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		staff := validStaff()
		live := &domain.StaffPayrollResponse{StaffID: "staff-1"}
		mockRepo.On("GetPayrollSettings", mock.Anything, "org-123").Return(nil, errors.New("db down")).Once()
		mockRepo.On("GetStaffByID", mock.Anything, "org-123", "staff-1").Return(staff, nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, "org-123", "staff-1", "2026-11-01").
			Return(nil, domain.ErrPayrollNotFound).Once()
		mockRepo.On("GetStaffPayroll", mock.Anything, "org-123", "staff-1", "2026-10-26", "2026-11-26", 26).
			Return(live, nil).Once()

		uc := NewStaffUsecase(mockRepo)
		_, err := uc.GetStaffPayroll(withOrgCtx("org-123"), "staff-1", "2026-11")

		assert.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Thành công - nhân viên vào làm sau kỳ thì trả rỗng", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		staff := validStaff()
		staff.HireDate = time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC)
		mockRepo.On("GetPayrollSettings", mock.Anything, "org-123").Return(defaultSettings(), nil).Once()
		mockRepo.On("GetStaffByID", mock.Anything, "org-123", "staff-1").Return(staff, nil).Once()

		uc := NewStaffUsecase(mockRepo)
		res, err := uc.GetStaffPayroll(withOrgCtx("org-123"), "staff-1", "2026-11")

		assert.NoError(t, err)
		assert.Nil(t, res)
		mockRepo.AssertNotCalled(t, "GetPayrollByPeriod", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("Thành công - fallback created_at khi thiếu hire_date", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		staff := validStaff()
		staff.HireDate = time.Time{}
		created := time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC)
		staff.CreatedAt = &created
		mockRepo.On("GetPayrollSettings", mock.Anything, "org-123").Return(defaultSettings(), nil).Once()
		mockRepo.On("GetStaffByID", mock.Anything, "org-123", "staff-1").Return(staff, nil).Once()

		uc := NewStaffUsecase(mockRepo)
		res, err := uc.GetStaffPayroll(withOrgCtx("org-123"), "staff-1", "2026-11")

		assert.NoError(t, err)
		assert.Nil(t, res)
	})

	t.Run("Thất bại - thiếu id nhân viên", func(t *testing.T) {
		uc := NewStaffUsecase(new(MockStaffRepository))
		res, err := uc.GetStaffPayroll(withOrgCtx("org-123"), " ", "2026-11")

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - thiếu kỳ lương", func(t *testing.T) {
		uc := NewStaffUsecase(new(MockStaffRepository))
		res, err := uc.GetStaffPayroll(withOrgCtx("org-123"), "staff-1", " ")

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - kỳ lương sai định dạng", func(t *testing.T) {
		uc := NewStaffUsecase(new(MockStaffRepository))
		res, err := uc.GetStaffPayroll(withOrgCtx("org-123"), "staff-1", "11-2026")

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - thiếu organization_id trong context", func(t *testing.T) {
		uc := NewStaffUsecase(new(MockStaffRepository))
		res, err := uc.GetStaffPayroll(context.Background(), "staff-1", "2026-11")

		assert.Nil(t, res)
		assertFlatAppError(t, err, 400)
	})

	t.Run("Thất bại - không tìm thấy nhân viên", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		mockRepo.On("GetPayrollSettings", mock.Anything, "org-123").Return(defaultSettings(), nil).Once()
		mockRepo.On("GetStaffByID", mock.Anything, "org-123", "staff-missing").
			Return(nil, domain.ErrStaffNotFound).Once()

		uc := NewStaffUsecase(mockRepo)
		res, err := uc.GetStaffPayroll(withOrgCtx("org-123"), "staff-missing", "2026-11")

		assert.Nil(t, res)
		assertFlatAppError(t, err, 404)
	})

	t.Run("Thất bại - lỗi đọc bảng lương theo kỳ", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		staff := validStaff()
		mockRepo.On("GetPayrollSettings", mock.Anything, "org-123").Return(defaultSettings(), nil).Once()
		mockRepo.On("GetStaffByID", mock.Anything, "org-123", "staff-1").Return(staff, nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, "org-123", "staff-1", "2026-11-01").
			Return(nil, errors.New("db down")).Once()

		uc := NewStaffUsecase(mockRepo)
		res, err := uc.GetStaffPayroll(withOrgCtx("org-123"), "staff-1", "2026-11")

		assert.Nil(t, res)
		assertFlatAppError(t, err, 500)
	})

	t.Run("Thất bại - lỗi tính lương live", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		staff := validStaff()
		mockRepo.On("GetPayrollSettings", mock.Anything, "org-123").Return(defaultSettings(), nil).Once()
		mockRepo.On("GetStaffByID", mock.Anything, "org-123", "staff-1").Return(staff, nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, "org-123", "staff-1", "2026-11-01").
			Return(nil, domain.ErrPayrollNotFound).Once()
		mockRepo.On("GetStaffPayroll", mock.Anything, "org-123", "staff-1", "2026-10-26", "2026-11-26", 26).
			Return(nil, errors.New("db down")).Once()

		uc := NewStaffUsecase(mockRepo)
		res, err := uc.GetStaffPayroll(withOrgCtx("org-123"), "staff-1", "2026-11")

		assert.Nil(t, res)
		assertFlatAppError(t, err, 500)
	})
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

func payrollFixture() *domain.StaffPayrollResponse {
	return &domain.StaffPayrollResponse{
		StaffID:             "staff-1",
		DateFrom:            time.Date(2026, 10, 26, 0, 0, 0, 0, time.UTC),
		DateTo:              time.Date(2026, 11, 26, 0, 0, 0, 0, time.UTC),
		BaseSalary:          8000000,
		StandardWorkingDays: 26,
		TotalLeaveDays:      2,
		ActualWorkingDays:   24,
		ProratedBaseSalary:  7384615.38,
		BonusAmount:         500000,
		AdjustmentDeduction: 60000,
		PenaltyAmount:       40000,
		AdvanceAmount:       200000,
		TotalDeduction:      100000,
		TotalOrders:         10,
		TotalItems:          15,
		TotalCommission:     1039500,
		TotalAmountValue:    5000000,
		NetPay:              8694115.38,
	}
}

func payrollSettingsFixture() *settingDomain.PayrollSettings {
	s := settingDomain.DefaultPayrollSettings()
	return &s
}

func TestStaffUsecase_CreatePayroll(t *testing.T) {
	const (
		orgID       = "org-123"
		staffID     = "staff-1"
		targetMonth = "2026-11"
	)

	staffInfo := &domain.StaffBasicInfo{
		ID:       staffID,
		Code:     "NV001",
		FullName: "Nguyễn Văn A",
		Position: "Thợ cắt tóc",
	}

	t.Run("draft - chưa có bảng lương thì lưu nháp đủ snapshot", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		mockRepo.On("GetStaffBasicByID", mock.Anything, orgID, staffID).Return(staffInfo, nil).Once()
		mockRepo.On("GetPayrollSettings", mock.Anything, orgID).Return(payrollSettingsFixture(), nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, orgID, staffID, "2026-11-01").
			Return(nil, domain.ErrPayrollNotFound).Once()
		mockRepo.On("GetStaffPayroll", mock.Anything, orgID, staffID, "2026-10-26", "2026-11-26", 26).
			Return(payrollFixture(), nil).Once()
		mockRepo.On("CreatePayroll", mock.Anything, mock.MatchedBy(func(p *domain.Payroll) bool {
			return p.Status == domain.PayrollStatusDraft &&
				p.BaseSalary == 7384615.38 &&
				p.CommissionAmount == 1039500 &&
				p.BonusAmount == 500000 &&
				p.AdvanceAmount == 200000 &&
				p.DeductionAmount == 100000 &&
				p.NetPay == 8694115.38 &&
				p.StandardWorkingDays == 26 &&
				p.TotalLeaveDays == 2 &&
				p.ActualWorkingDays == 24 &&
				p.PenaltyAmount == 40000 &&
				p.AdjustmentDeduction == 60000 &&
				p.TotalOrders == 10 &&
				p.TotalItems == 15 &&
				p.TotalAmountValue == 5000000
		}), staffInfo).Return(nil).Once()

		uc := NewStaffUsecase(mockRepo)
		err := uc.CreatePayroll(withOrgCtx(orgID), staffID, targetMonth, "draft")

		assert.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("approved - chưa có bảng lương thì tính live rồi chốt", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		mockRepo.On("GetStaffBasicByID", mock.Anything, orgID, staffID).Return(staffInfo, nil).Once()
		mockRepo.On("GetPayrollSettings", mock.Anything, orgID).Return(payrollSettingsFixture(), nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, orgID, staffID, "2026-11-01").
			Return(nil, domain.ErrPayrollNotFound).Once()
		mockRepo.On("GetStaffPayroll", mock.Anything, orgID, staffID, "2026-10-26", "2026-11-26", 26).
			Return(payrollFixture(), nil).Once()
		mockRepo.On("CreatePayroll", mock.Anything, mock.MatchedBy(func(p *domain.Payroll) bool {
			return p.Status == domain.PayrollStatusApproved && p.BaseSalary == 7384615.38
		}), staffInfo).Return(nil).Once()

		uc := NewStaffUsecase(mockRepo)
		err := uc.CreatePayroll(withOrgCtx(orgID), staffID, targetMonth, "approved")

		assert.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("approved - đã có draft thì chỉ chuyển trạng thái, không tính lại", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		mockRepo.On("GetStaffBasicByID", mock.Anything, orgID, staffID).Return(staffInfo, nil).Once()
		mockRepo.On("GetPayrollSettings", mock.Anything, orgID).Return(payrollSettingsFixture(), nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, orgID, staffID, "2026-11-01").
			Return(&domain.Payroll{ID: "payroll-draft", StaffID: staffID, Status: domain.PayrollStatusDraft, NetPay: 8694115.38}, nil).Once()
		mockRepo.On("CreatePayroll", mock.Anything, mock.MatchedBy(func(p *domain.Payroll) bool {
			return p.ID == "payroll-draft" && p.Status == domain.PayrollStatusApproved
		}), staffInfo).Return(nil).Once()

		uc := NewStaffUsecase(mockRepo)
		err := uc.CreatePayroll(withOrgCtx(orgID), staffID, targetMonth, "approved")

		assert.NoError(t, err)
		mockRepo.AssertNotCalled(t, "GetStaffPayroll", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
		mockRepo.AssertExpectations(t)
	})

	t.Run("approved - đã có approved thì trả 409", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		mockRepo.On("GetStaffBasicByID", mock.Anything, orgID, staffID).Return(staffInfo, nil).Once()
		mockRepo.On("GetPayrollSettings", mock.Anything, orgID).Return(payrollSettingsFixture(), nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, orgID, staffID, "2026-11-01").
			Return(&domain.Payroll{ID: "payroll-1", StaffID: staffID, Status: domain.PayrollStatusApproved}, nil).Once()

		uc := NewStaffUsecase(mockRepo)
		err := uc.CreatePayroll(withOrgCtx(orgID), staffID, targetMonth, "approved")

		assertFlatAppError(t, err, 409)
		mockRepo.AssertNotCalled(t, "CreatePayroll", mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("approved - bảng lương cũ cancelled thì được tạo mới", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		mockRepo.On("GetStaffBasicByID", mock.Anything, orgID, staffID).Return(staffInfo, nil).Once()
		mockRepo.On("GetPayrollSettings", mock.Anything, orgID).Return(payrollSettingsFixture(), nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, orgID, staffID, "2026-11-01").
			Return(&domain.Payroll{ID: "payroll-old", StaffID: staffID, Status: domain.PayrollStatusCancelled}, nil).Once()
		mockRepo.On("GetStaffPayroll", mock.Anything, orgID, staffID, "2026-10-26", "2026-11-26", 26).
			Return(payrollFixture(), nil).Once()
		mockRepo.On("CreatePayroll", mock.Anything, mock.MatchedBy(func(p *domain.Payroll) bool {
			return p.Status == domain.PayrollStatusApproved && p.ID != "payroll-old"
		}), staffInfo).Return(nil).Once()

		uc := NewStaffUsecase(mockRepo)
		err := uc.CreatePayroll(withOrgCtx(orgID), staffID, targetMonth, "approved")

		assert.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("draft - đã có bảng lương thì trả 409", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		mockRepo.On("GetStaffBasicByID", mock.Anything, orgID, staffID).Return(staffInfo, nil).Once()
		mockRepo.On("GetPayrollSettings", mock.Anything, orgID).Return(payrollSettingsFixture(), nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, orgID, staffID, "2026-11-01").
			Return(&domain.Payroll{ID: "payroll-1", StaffID: staffID, Status: domain.PayrollStatusDraft}, nil).Once()

		uc := NewStaffUsecase(mockRepo)
		err := uc.CreatePayroll(withOrgCtx(orgID), staffID, targetMonth, "draft")

		assertFlatAppError(t, err, 409)
		mockRepo.AssertNotCalled(t, "GetStaffPayroll", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("trạng thái không hợp lệ trả 400", func(t *testing.T) {
		uc := NewStaffUsecase(new(MockStaffRepository))
		err := uc.CreatePayroll(withOrgCtx(orgID), staffID, targetMonth, "paid")

		assertFlatAppError(t, err, 400)
	})
}

func TestStaffUsecase_CreatePayrollDrafts(t *testing.T) {
	const orgID = "org-123"

	t.Run("chặn kỳ tương lai theo UTC+7", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		uc := NewStaffUsecase(mockRepo)

		_, err := uc.CreatePayrollDrafts(withOrgCtx(orgID), "2999-01")

		assertFlatAppError(t, err, 400)
		mockRepo.AssertNotCalled(t, "ListStaffForPayrollDraft", mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("chặn kỳ sai định dạng", func(t *testing.T) {
		uc := NewStaffUsecase(new(MockStaffRepository))

		_, err := uc.CreatePayrollDrafts(withOrgCtx(orgID), "01-2026")

		assertFlatAppError(t, err, 400)
	})

	t.Run("tổng hợp created, skipped, failed theo từng nhân viên", func(t *testing.T) {
		mockRepo := new(MockStaffRepository)
		staffs := []*domain.Staff{
			{ID: "staff-a", Code: "NV001", FullName: "Nhân viên A", Position: "Thợ", Status: "active"},
			{ID: "staff-b", Code: "NV002", FullName: "Nhân viên B", Position: "Thợ", Status: "active"},
			{ID: "staff-c", Code: "NV003", FullName: "Nhân viên C", Position: "Thợ", Status: "on_leave"},
			{ID: "staff-d", Code: "NV004", FullName: "Nhân viên D", Position: "Thợ", Status: "active"},
		}
		mockRepo.On("GetPayrollSettings", mock.Anything, orgID).Return(payrollSettingsFixture(), nil).Once()
		mockRepo.On("ListStaffForPayrollDraft", mock.Anything, orgID, "2026-11-26").Return(staffs, nil).Once()

		mockRepo.On("GetPayrollByPeriod", mock.Anything, orgID, "staff-a", "2026-11-01").
			Return(nil, domain.ErrPayrollNotFound).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, orgID, "staff-b", "2026-11-01").
			Return(&domain.Payroll{ID: "payroll-b", StaffID: "staff-b", Status: domain.PayrollStatusApproved}, nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, orgID, "staff-c", "2026-11-01").
			Return(&domain.Payroll{ID: "payroll-c", StaffID: "staff-c", Status: domain.PayrollStatusCancelled}, nil).Once()
		mockRepo.On("GetPayrollByPeriod", mock.Anything, orgID, "staff-d", "2026-11-01").
			Return(nil, domain.ErrPayrollNotFound).Once()

		mockRepo.On("GetStaffPayroll", mock.Anything, orgID, "staff-a", "2026-10-26", "2026-11-26", 26).
			Return(payrollFixture(), nil).Once()
		mockRepo.On("GetStaffPayroll", mock.Anything, orgID, "staff-c", "2026-10-26", "2026-11-26", 26).
			Return(payrollFixture(), nil).Once()
		mockRepo.On("GetStaffPayroll", mock.Anything, orgID, "staff-d", "2026-10-26", "2026-11-26", 26).
			Return(nil, errors.New("db down")).Once()

		mockRepo.On("CreatePayroll", mock.Anything, mock.MatchedBy(func(p *domain.Payroll) bool {
			return p.StaffID == "staff-a" && p.Status == domain.PayrollStatusDraft
		}), mock.Anything).Return(nil).Once()
		mockRepo.On("CreatePayroll", mock.Anything, mock.MatchedBy(func(p *domain.Payroll) bool {
			return p.StaffID == "staff-c" && p.Status == domain.PayrollStatusDraft
		}), mock.Anything).Return(nil).Once()

		uc := NewStaffUsecase(mockRepo)
		res, err := uc.CreatePayrollDrafts(withOrgCtx(orgID), "2026-11")

		assert.NoError(t, err)
		assert.Equal(t, "2026-11", res.TargetMonth)
		assert.Equal(t, 2, res.Created)
		assert.Equal(t, 1, res.Skipped)
		assert.Equal(t, 1, res.Failed)
		assert.Len(t, res.Items, 4)
		assert.Equal(t, "created", res.Items[0].Result)
		assert.Equal(t, "skipped", res.Items[1].Result)
		assert.Equal(t, "created", res.Items[2].Result)
		assert.Equal(t, "failed", res.Items[3].Result)
		mockRepo.AssertExpectations(t)
	})
}
