package product

import (
	"fmt"
	"math"
	"strings"
)

// Quy ước đơn vị (mirror client voucherData.buildUnitOptions):
//   - SP có net (net_unit khác unit, net_amount > 0): 2 nấc,
//     net_unit x1 (nhỏ nhất) và unit x net_amount (lớn).
//   - SP không net: 1 nấc duy nhất là unit x1.
// Tồn kho, giữ chỗ, snapshot vật tư LUÔN lưu ở đơn vị nhỏ nhất.
// unit rỗng nghĩa là dùng đơn vị lớn của SP (mặc định UI đang chọn).

// hasNet kiểm tra SP có 2 nấc đơn vị không (net_unit khác unit và net_amount > 0).
// Trả về (net_unit đã trim, true) khi có net, ngược lại ("", false).
// Mọi helper dưới dùng chung để khỏi lệch logic.
func hasNet(productUnit string, netUnit *string, netAmount *float64) (string, bool) {
	pu := strings.TrimSpace(productUnit)
	nu := ""
	if netUnit != nil {
		nu = strings.TrimSpace(*netUnit)
	}
	var na float64
	if netAmount != nil {
		na = *netAmount
	}
	if nu != "" && nu != pu && na > 0 {
		return nu, true
	}
	return "", false
}

// BaseUnit trả đơn vị nhỏ nhất của sản phẩm (net_unit khi có net, ngược lại unit lớn).
func BaseUnit(productUnit string, netUnit *string, netAmount *float64) string {
	if nu, ok := hasNet(productUnit, netUnit, netAmount); ok {
		return nu
	}
	return strings.TrimSpace(productUnit)
}

// BaseFactor trả hệ số quy 1 đơn vị unit ra đơn vị nhỏ nhất.
// Đơn vị lạ (không phải unit/net_unit của SP) thì lỗi.
func BaseFactor(productUnit, unit string, netUnit *string, netAmount *float64) (float64, error) {
	pu := strings.TrimSpace(productUnit)
	u := strings.TrimSpace(unit)
	nu, ok := hasNet(productUnit, netUnit, netAmount)
	var na float64
	if netAmount != nil {
		na = *netAmount
	}

	if u == "" || u == pu {
		if ok {
			return na, nil
		}
		return 1, nil
	}
	if ok && u == nu {
		return 1, nil
	}
	return 0, fmt.Errorf("đơn vị %q không hợp lệ", unit)
}

// LargeFactor hệ số của đơn vị lớn (để chia giá về đơn vị nhỏ nhất).
func LargeFactor(productUnit string, netUnit *string, netAmount *float64) float64 {
	var na float64
	if netAmount != nil {
		na = *netAmount
	}
	if _, ok := hasNet(productUnit, netUnit, netAmount); ok {
		return na
	}
	return 1
}

// roundMoney làm tròn tiền về 2 chữ số thập phân.
func roundMoney(v float64) float64 {
	return math.Round(v*100) / 100
}

// ToBase quy đổi (unit, qty, pricePerLargeUnit) về đơn vị nhỏ nhất.
// Trả về (baseQty, basePrice). Giá gốc luôn hiểu là giá trên đơn vị lớn.
func ToBase(productUnit, unit string, netUnit *string, netAmount *float64, qty, pricePerLarge float64) (float64, float64, error) {
	factor, err := BaseFactor(productUnit, unit, netUnit, netAmount)
	if err != nil {
		return 0, 0, err
	}
	large := LargeFactor(productUnit, netUnit, netAmount)
	return qty * factor, roundMoney(pricePerLarge / large), nil
}
