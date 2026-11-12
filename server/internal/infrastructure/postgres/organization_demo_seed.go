package postgres

import (
	"context"
	"time"

	"github.com/daidat02/server/pkg/utils"
	"github.com/jackc/pgx/v5"
)

type demoCategory struct {
	Key         string
	Type        string
	Name        string
	Description string
}

type demoProduct struct {
	CategoryKey string
	SKU         string
	Name        string
	Unit        string
	NetUnit     string
	NetAmount   float64
	ProductType string
	ShowOnWeb   bool
	CostPrice   float64
	SellPrice   float64
	Stock       float64
	MinStock    float64
}

type demoServiceMaterial struct {
	SKU      string
	Quantity float64
	Unit     string
}

type demoService struct {
	CategoryKey     string
	Name            string
	Description     string
	DurationMinutes int
	BufferMinutes   int
	Price           float64
	Materials       []demoServiceMaterial
}

type demoCustomer struct {
	FullName  string
	Phone     string
	Gender    string
	BirthDate *time.Time
	Note      string
}

type demoStaff struct {
	Code           string
	FullName       string
	Phone          string
	Email          string
	Gender         string
	Address        string
	Position       string
	CommissionRate float64
	BaseSalary     float64
	HireDate       *time.Time
}

var demoCategories = []demoCategory{
	{Key: "svc-cut", Type: "service", Name: "Cắt tóc", Description: "Cắt, gội và tạo kiểu tóc"},
	{Key: "svc-color", Type: "service", Name: "Uốn & Nhuộm", Description: "Uốn, nhuộm và highlight"},
	{Key: "svc-care", Type: "service", Name: "Chăm sóc da & tóc", Description: "Hair spa, ủ tóc và chăm sóc da đầu"},
	{Key: "svc-nail", Type: "service", Name: "Làm móng & Mi", Description: "Sơn gel, chăm sóc móng và nối mi"},
	{Key: "pc-hair", Type: "product", Name: "Chăm sóc tóc", Description: "Dầu gội, dầu xả và sản phẩm dưỡng tóc"},
	{Key: "pc-retail", Type: "product", Name: "Sản phẩm bán lẻ", Description: "Sản phẩm trưng bày và bán tại salon"},
	{Key: "pc-chemical", Type: "material", Name: "Hóa chất salon", Description: "Thuốc nhuộm, thuốc uốn và dầu gội chuyên dụng"},
	{Key: "pc-consumable", Type: "material", Name: "Vật tư phụ trợ", Description: "Vật tư tiêu hao và sản phẩm dùng trong dịch vụ"},
}

var demoProducts = []demoProduct{
	{CategoryKey: "pc-hair", SKU: "SP-DAU-GOI-KERATIN", Name: "Dầu gội phục hồi Keratin 500ml", Unit: "Chai", NetUnit: "ml", NetAmount: 500, ProductType: "retail", ShowOnWeb: true, CostPrice: 180000, SellPrice: 320000, Stock: 24, MinStock: 5},
	{CategoryKey: "pc-hair", SKU: "SP-DAU-XA-ARGAN", Name: "Dầu xả mềm tóc Argan 500ml", Unit: "Chai", NetUnit: "ml", NetAmount: 500, ProductType: "retail", ShowOnWeb: true, CostPrice: 180000, SellPrice: 320000, Stock: 20, MinStock: 5},
	{CategoryKey: "pc-hair", SKU: "SP-TINH-DAU-DUONG", Name: "Tinh dầu dưỡng tóc 100ml", Unit: "Lọ", NetUnit: "ml", NetAmount: 100, ProductType: "retail", ShowOnWeb: true, CostPrice: 120000, SellPrice: 220000, Stock: 30, MinStock: 5},
	{CategoryKey: "pc-hair", SKU: "SP-SERUM-DA-DAU", Name: "Serum da đầu 60ml", Unit: "Lọ", NetUnit: "ml", NetAmount: 60, ProductType: "retail", ShowOnWeb: true, CostPrice: 150000, SellPrice: 280000, Stock: 18, MinStock: 5},
	{CategoryKey: "pc-retail", SKU: "SP-SAP-VUOT", Name: "Sáp vuốt tóc 100g", Unit: "Hộp", NetUnit: "g", NetAmount: 100, ProductType: "retail", ShowOnWeb: true, CostPrice: 90000, SellPrice: 180000, Stock: 40, MinStock: 10},
	{CategoryKey: "pc-retail", SKU: "SP-NUOC-HOA", Name: "Nước hoa salon 50ml", Unit: "Chai", NetUnit: "ml", NetAmount: 50, ProductType: "retail", ShowOnWeb: true, CostPrice: 250000, SellPrice: 450000, Stock: 12, MinStock: 3},
	{CategoryKey: "pc-chemical", SKU: "VT-THUOC-NHUOM", Name: "Thuốc nhuộm nâu 100g", Unit: "Tuýp", NetUnit: "g", NetAmount: 100, ProductType: "material", ShowOnWeb: false, CostPrice: 120000, Stock: 35, MinStock: 10},
	{CategoryKey: "pc-chemical", SKU: "VT-THUOC-UON", Name: "Thuốc uốn 500ml", Unit: "Chai", NetUnit: "ml", NetAmount: 500, ProductType: "material", ShowOnWeb: false, CostPrice: 200000, Stock: 15, MinStock: 5},
	{CategoryKey: "pc-chemical", SKU: "VT-DAU-GOI-SALON", Name: "Dầu gội salon 5L", Unit: "Can", NetUnit: "ml", NetAmount: 5000, ProductType: "material", ShowOnWeb: false, CostPrice: 350000, Stock: 8, MinStock: 2},
	{CategoryKey: "pc-consumable", SKU: "VT-KHAN-GIAY", Name: "Khăn giấy salon 1kg", Unit: "Kg", NetUnit: "g", NetAmount: 1000, ProductType: "material", ShowOnWeb: false, CostPrice: 80000, Stock: 25, MinStock: 5},
	{CategoryKey: "pc-hair", SKU: "SP-COMBO-GOI-XA", Name: "Combo dầu gội + dầu xả 500ml", Unit: "Bộ", NetUnit: "ml", NetAmount: 1000, ProductType: "both", ShowOnWeb: true, CostPrice: 330000, SellPrice: 590000, Stock: 10, MinStock: 3},
	{CategoryKey: "pc-consumable", SKU: "VT-GEL-U", Name: "Gel ủ tóc 1kg", Unit: "Hũ", NetUnit: "g", NetAmount: 1000, ProductType: "both", ShowOnWeb: true, CostPrice: 220000, SellPrice: 420000, Stock: 14, MinStock: 4},
}

var demoServices = []demoService{
	{CategoryKey: "svc-cut", Name: "Cắt tóc nam", Description: "Cắt tóc nam kèm gội và sấy tạo kiểu", DurationMinutes: 30, BufferMinutes: 5, Price: 120000, Materials: []demoServiceMaterial{{SKU: "VT-DAU-GOI-SALON", Quantity: 20, Unit: "ml"}}},
	{CategoryKey: "svc-cut", Name: "Cắt tóc nữ", Description: "Cắt tóc nữ theo khuôn mặt và sấy tạo kiểu", DurationMinutes: 45, BufferMinutes: 10, Price: 200000, Materials: []demoServiceMaterial{{SKU: "VT-DAU-GOI-SALON", Quantity: 30, Unit: "ml"}}},
	{CategoryKey: "svc-cut", Name: "Gội đầu dưỡng sinh", Description: "Gội đầu, massage da đầu và sấy khô", DurationMinutes: 40, BufferMinutes: 5, Price: 150000, Materials: []demoServiceMaterial{{SKU: "VT-DAU-GOI-SALON", Quantity: 25, Unit: "ml"}, {SKU: "VT-KHAN-GIAY", Quantity: 30, Unit: "g"}}},
	{CategoryKey: "svc-color", Name: "Uốn tóc", Description: "Uốn tóc theo yêu cầu, gồm gội và dưỡng sau uốn", DurationMinutes: 120, BufferMinutes: 15, Price: 800000, Materials: []demoServiceMaterial{{SKU: "VT-THUOC-UON", Quantity: 200, Unit: "ml"}, {SKU: "VT-DAU-GOI-SALON", Quantity: 50, Unit: "ml"}, {SKU: "VT-KHAN-GIAY", Quantity: 50, Unit: "g"}}},
	{CategoryKey: "svc-color", Name: "Nhuộm tóc", Description: "Nhuộm phủ bạc hoặc đổi tông màu", DurationMinutes: 120, BufferMinutes: 15, Price: 900000, Materials: []demoServiceMaterial{{SKU: "VT-THUOC-NHUOM", Quantity: 100, Unit: "g"}, {SKU: "VT-DAU-GOI-SALON", Quantity: 50, Unit: "ml"}}},
	{CategoryKey: "svc-color", Name: "Highlight tóc", Description: "Highlight nhiều tông màu theo yêu cầu", DurationMinutes: 150, BufferMinutes: 20, Price: 1200000, Materials: []demoServiceMaterial{{SKU: "VT-THUOC-NHUOM", Quantity: 120, Unit: "g"}, {SKU: "VT-DAU-GOI-SALON", Quantity: 30, Unit: "ml"}}},
	{CategoryKey: "svc-care", Name: "Hair spa phục hồi", Description: "Chăm sóc chuyên sâu cho tóc hư tổn", DurationMinutes: 60, BufferMinutes: 10, Price: 350000, Materials: []demoServiceMaterial{{SKU: "VT-GEL-U", Quantity: 100, Unit: "g"}, {SKU: "VT-DAU-GOI-SALON", Quantity: 30, Unit: "ml"}}},
	{CategoryKey: "svc-care", Name: "Ủ tóc keratin", Description: "Ủ keratin giúp tóc mềm mượt và chắc khỏe", DurationMinutes: 60, BufferMinutes: 10, Price: 400000, Materials: []demoServiceMaterial{{SKU: "VT-GEL-U", Quantity: 120, Unit: "g"}, {SKU: "VT-DAU-GOI-SALON", Quantity: 30, Unit: "ml"}}},
	{CategoryKey: "svc-care", Name: "Gội đầu thư giãn", Description: "Gội đầu nhẹ nhàng kèm massage thư giãn", DurationMinutes: 30, BufferMinutes: 5, Price: 100000, Materials: []demoServiceMaterial{{SKU: "VT-DAU-GOI-SALON", Quantity: 25, Unit: "ml"}, {SKU: "VT-KHAN-GIAY", Quantity: 20, Unit: "g"}}},
	{CategoryKey: "svc-nail", Name: "Sơn gel móng tay", Description: "Cắt sửa móng và sơn gel móng tay", DurationMinutes: 60, BufferMinutes: 10, Price: 250000},
	{CategoryKey: "svc-nail", Name: "Nối mi cổ điển", Description: "Nối mi cổ điển theo dáng mắt", DurationMinutes: 90, BufferMinutes: 10, Price: 350000},
	{CategoryKey: "svc-nail", Name: "Chăm sóc móng chân", Description: "Làm sạch, cắt sửa và dưỡng móng chân", DurationMinutes: 45, BufferMinutes: 10, Price: 200000},
}

var demoCustomers = []demoCustomer{
	{FullName: "Nguyễn Thị Lan", Phone: "0901234501", Gender: "female", BirthDate: demoDate(1992, time.March, 15), Note: "Khách quen, thích tông nâu lạnh"},
	{FullName: "Trần Minh Anh", Phone: "0901234502", Gender: "male", BirthDate: demoDate(1988, time.July, 22), Note: "Cắt tóc ngắn mỗi 3 tuần"},
	{FullName: "Lê Thu Trang", Phone: "0901234503", Gender: "female", BirthDate: demoDate(1995, time.November, 8), Note: "Quan tâm chăm sóc tóc hư tổn"},
	{FullName: "Phạm Quốc Huy", Phone: "0901234504", Gender: "male", BirthDate: demoDate(1990, time.January, 30), Note: "Thường đặt lịch cuối tuần"},
	{FullName: "Hoàng Ngọc Mai", Phone: "0901234505", Gender: "female", BirthDate: demoDate(1998, time.May, 17), Note: "Thích highlight tông sáng"},
	{FullName: "Vũ Đức Thành", Phone: "0901234506", Gender: "male", BirthDate: demoDate(1985, time.September, 12), Note: "Khách doanh nghiệp"},
	{FullName: "Đặng Thanh Hương", Phone: "0901234507", Gender: "female", BirthDate: demoDate(1993, time.December, 3), Note: "Dị ứng nhẹ với hóa chất có mùi mạnh"},
	{FullName: "Bùi Minh Khoa", Phone: "0901234508", Gender: "male", BirthDate: demoDate(2000, time.April, 25), Note: "Sinh viên, ưu tiên khung giờ chiều"},
	{FullName: "Ngô Thảo Vy", Phone: "0901234509", Gender: "female", BirthDate: demoDate(1997, time.August, 19), Note: "Làm móng định kỳ 2 tuần/lần"},
	{FullName: "Trịnh Gia Bảo", Phone: "0901234510", Gender: "male", BirthDate: demoDate(1991, time.June, 7), Note: "Khách giới thiệu từ người quen"},
}

var demoStaffMembers = []demoStaff{
	{Code: "NV001", FullName: "Nguyễn Thu Hà", Phone: "0912345601", Email: "thuha@salonos.vn", Gender: "female", Address: "Quận 1, TP.HCM", Position: "Thợ chính", CommissionRate: 12, BaseSalary: 7000000, HireDate: demoDate(2023, time.March, 1)},
	{Code: "NV002", FullName: "Trần Quốc Bảo", Phone: "0912345602", Email: "quocbao@salonos.vn", Gender: "male", Address: "Quận 3, TP.HCM", Position: "Thợ chính", CommissionRate: 10, BaseSalary: 6500000, HireDate: demoDate(2023, time.June, 15)},
	{Code: "NV003", FullName: "Lê Ngọc Mai", Phone: "0912345603", Email: "ngocmai@salonos.vn", Gender: "female", Address: "Bình Thạnh, TP.HCM", Position: "Thợ phụ", CommissionRate: 7, BaseSalary: 5000000, HireDate: demoDate(2024, time.February, 1)},
	{Code: "NV004", FullName: "Phạm Đức Long", Phone: "0912345604", Email: "duclong@salonos.vn", Gender: "male", Address: "Phú Nhuận, TP.HCM", Position: "Thợ chính", CommissionRate: 15, BaseSalary: 8000000, HireDate: demoDate(2022, time.September, 10)},
	{Code: "NV005", FullName: "Hoàng Yến Nhi", Phone: "0912345605", Email: "yennhi@salonos.vn", Gender: "female", Address: "Quận 7, TP.HCM", Position: "Lễ tân", CommissionRate: 5, BaseSalary: 5500000, HireDate: demoDate(2024, time.May, 20)},
	{Code: "NV006", FullName: "Vũ Minh Tuấn", Phone: "0912345606", Email: "minhtuan@salonos.vn", Gender: "male", Address: "Tân Bình, TP.HCM", Position: "Quản lý ca", CommissionRate: 8, BaseSalary: 9000000, HireDate: demoDate(2021, time.November, 1)},
}

const insertDemoServiceMaterialQuery = `
	INSERT INTO service_materials (id, organization_id, service_id, product_id, quantity, unit)
	VALUES ($1, $2, $3, $4, $5, $6)
`

func demoDate(year int, month time.Month, day int) *time.Time {
	value := time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	return &value
}

func seedDemoData(ctx context.Context, tx pgx.Tx, orgID string) error {
	categoryIDs := make(map[string]string, len(demoCategories))
	for _, category := range demoCategories {
		categoryID := utils.NewID()
		categoryIDs[category.Key] = categoryID
		if _, err := tx.Exec(
			ctx,
			createCategoryQuery,
			categoryID,
			orgID,
			category.Type,
			category.Name,
			category.Description,
			true,
		); err != nil {
			return err
		}
	}

	productIDs := make(map[string]string, len(demoProducts))
	for _, product := range demoProducts {
		productID := utils.NewID()
		productIDs[product.SKU] = productID
		stockQuantity := product.Stock
		minStock := product.MinStock
		if product.NetAmount > 0 {
			stockQuantity *= product.NetAmount
			minStock *= product.NetAmount
		}
		if _, err := tx.Exec(
			ctx,
			createProductQuery,
			productID,
			orgID,
			categoryIDs[product.CategoryKey],
			product.SKU,
			product.Name,
			product.Unit,
			product.NetUnit,
			product.NetAmount,
			product.ProductType,
			product.ShowOnWeb,
			product.CostPrice,
			product.SellPrice,
			stockQuantity,
			minStock,
			true,
		); err != nil {
			return err
		}
	}

	for _, service := range demoServices {
		serviceID := utils.NewID()
		if _, err := tx.Exec(
			ctx,
			createServiceQuery,
			serviceID,
			orgID,
			categoryIDs[service.CategoryKey],
			service.Name,
			service.Description,
			service.DurationMinutes,
			service.BufferMinutes,
			service.Price,
			true,
		); err != nil {
			return err
		}

		for _, material := range service.Materials {
			if _, err := tx.Exec(
				ctx,
				insertDemoServiceMaterialQuery,
				utils.NewID(),
				orgID,
				serviceID,
				productIDs[material.SKU],
				material.Quantity,
				material.Unit,
			); err != nil {
				return err
			}
		}
	}

	for _, customer := range demoCustomers {
		if _, err := tx.Exec(
			ctx,
			createCustomerQuery,
			utils.NewID(),
			orgID,
			customer.FullName,
			customer.Phone,
			customer.Gender,
			customer.BirthDate,
			customer.Note,
		); err != nil {
			return err
		}
	}

	for _, staff := range demoStaffMembers {
		if _, err := tx.Exec(
			ctx,
			createStaffQuery,
			utils.NewID(),
			orgID,
			staff.Code,
			staff.FullName,
			staff.Phone,
			staff.Email,
			nil,
			staff.Gender,
			staff.Address,
			staff.Position,
			"fulltime",
			staff.CommissionRate,
			staff.BaseSalary,
			nil,
			nil,
			nil,
			"active",
			staff.HireDate,
		); err != nil {
			return err
		}
	}

	return nil
}
