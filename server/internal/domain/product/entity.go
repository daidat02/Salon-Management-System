package product

import (
	"errors"
	"time"
)

const (
	ProductTypeRetail   = "retail"
	ProductTypeMaterial = "material"
	ProductTypeBoth     = "both"
)

// ProductMonthlySales là doanh số bán ra của một sản phẩm trong một tháng.
type ProductMonthlySales struct {
	MonthStart time.Time
	Quantity   float64
	Revenue    float64
}

type Product struct {
	ID             string
	OrganizationID string
	CategoryID     *string
	CategoryName   *string
	SKU            string
	Name           string
	Unit           string
	NetUnit        *string
	NetAmount      *float64
	ProductType    string
	ShowOnWeb      bool
	CostPrice      float64
	SellPrice      float64
	StockQuantity  float64
	MinStock       float64
	IsActive       bool
	// RevenueThisMonth chỉ dùng cho list API, không phải cột trong bảng products.
	RevenueThisMonth float64
	CreatedAt        *time.Time
	UpdatedAt        *time.Time
}

func (p *Product) Validate() error {
	if p.SKU == "" {
		return errors.New("Mã SKU không được để trống")
	}
	if p.Name == "" {
		return errors.New("Tên sản phẩm không được để trống")
	}
	if p.ProductType != ProductTypeRetail && p.ProductType != ProductTypeMaterial && p.ProductType != ProductTypeBoth {
		return errors.New("Loại sản phẩm không hợp lệ (retail | material | both)")
	}
	if p.CostPrice < 0 {
		return errors.New("Giá vốn không được âm")
	}
	if p.SellPrice < 0 {
		return errors.New("Giá bán không được âm")
	}
	if p.StockQuantity < 0 {
		return errors.New("Tồn kho không được âm")
	}
	if p.MinStock < 0 {
		return errors.New("Tồn kho tối thiểu không được âm")
	}
	return nil
}
