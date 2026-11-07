package setting

import (
	"errors"
)

// ErrReceiptSettingsNotFound khi org chưa có dòng cấu hình in hóa đơn.
var ErrReceiptSettingsNotFound = errors.New("receipt settings not found")

// ReceiptSettings là cấu hình in hóa đơn (bảng receipt_settings).
type ReceiptSettings struct {
	PaperSize           string  `json:"paper_size" db:"paper_size"`
	AutoCutPaper        bool    `json:"auto_cut_paper" db:"auto_cut_paper"`
	OpenCashDrawer      bool    `json:"open_cash_drawer" db:"open_cash_drawer"`
	ShowLogo            bool    `json:"show_logo" db:"show_logo"`
	LogoURL             *string `json:"logo_url" db:"logo_url"`
	HeaderText          *string `json:"header_text" db:"header_text"`
	ShowBranchAddress   bool    `json:"show_branch_address" db:"show_branch_address"`
	ShowCashierName     bool    `json:"show_cashier_name" db:"show_cashier_name"`
	ShowCustomerInfo    bool    `json:"show_customer_info" db:"show_customer_info"`
	MaskCustomerPhone   bool    `json:"mask_customer_phone" db:"mask_customer_phone"`
	ShowVietQR          bool    `json:"show_vietqr" db:"show_vietqr"`
	FooterText          *string `json:"footer_text" db:"footer_text"`
	ShowWifiInfo        bool    `json:"show_wifi_info" db:"show_wifi_info"`
	WifiName            *string `json:"wifi_name" db:"wifi_name"`
	WifiPass            *string `json:"wifi_pass" db:"wifi_pass"`
	AutoPrintOnCheckout bool    `json:"auto_print_on_checkout" db:"auto_print_on_checkout"`
	PrintCopyCount      int     `json:"print_copy_count" db:"print_copy_count"`
}

// DefaultReceiptSettings khớp DEFAULT trong migration receipt_settings.
func DefaultReceiptSettings() *ReceiptSettings {
	return &ReceiptSettings{
		PaperSize:           "K80",
		AutoCutPaper:        true,
		OpenCashDrawer:      true,
		ShowLogo:            true,
		ShowBranchAddress:   true,
		ShowCashierName:     true,
		ShowCustomerInfo:    true,
		MaskCustomerPhone:   false,
		ShowVietQR:          true,
		ShowWifiInfo:        false,
		AutoPrintOnCheckout: true,
		PrintCopyCount:      1,
	}
}

// PaymentMethod là phương thức thanh toán tại quầy gắn với 1 quỹ.
type PaymentMethod struct {
	ID        string `json:"id" db:"id"`
	FundID    string `json:"fund_id" db:"fund_id"`
	FundName  string `json:"fund_name" db:"fund_name"`
	FundType  string `json:"fund_type" db:"fund_type"`
	Code      string `json:"code" db:"code"`
	Name      string `json:"name" db:"name"`
	IsSystem  bool   `json:"is_system" db:"is_system"`
	IsActive  bool   `json:"is_active" db:"is_active"`
	SortOrder int    `json:"sort_order" db:"sort_order"`
}

// PaymentSettingsResponse là dữ liệu tab Thanh toán.
type PaymentSettingsResponse struct {
	Receipt        ReceiptSettings `json:"receipt"`
	PaymentMethods []PaymentMethod `json:"payment_methods"`
}
