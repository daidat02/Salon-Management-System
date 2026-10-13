package product

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func strPtr(s string) *string { return &s }

func f64Ptr(v float64) *float64 { return &v }

func TestBaseUnit(t *testing.T) {
	tests := []struct {
		name      string
		unit      string
		netUnit   *string
		netAmount *float64
		expected  string
	}{
		{"có net -> net_unit", "chai", strPtr("ml"), f64Ptr(1000), "ml"},
		{"có net g -> g", "hũ", strPtr("g"), f64Ptr(500), "g"},
		{"không net -> unit lớn", "cái", nil, nil, "cái"},
		{"net_unit trùng unit -> unit lớn", "chai", strPtr("chai"), f64Ptr(500), "chai"},
		{"net_amount 0 -> unit lớn", "chai", strPtr("ml"), f64Ptr(0), "chai"},
		{"net_amount âm -> unit lớn", "chai", strPtr("ml"), f64Ptr(-5), "chai"},
		{"net_unit rỗng -> unit lớn", "bịch", strPtr(""), f64Ptr(100), "bịch"},
		{"net_unit khoảng trắng -> unit lớn", "bịch", strPtr("   "), f64Ptr(100), "bịch"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, BaseUnit(tt.unit, tt.netUnit, tt.netAmount))
		})
	}
}

func TestBaseFactor(t *testing.T) {
	ml := strPtr("ml")
	na := f64Ptr(350.0)

	f, err := BaseFactor("chai", "", ml, na)
	assert.NoError(t, err)
	assert.Equal(t, 350.0, f)

	f, err = BaseFactor("chai", "chai", ml, na)
	assert.NoError(t, err)
	assert.Equal(t, 350.0, f)

	f, err = BaseFactor("chai", "ml", ml, na)
	assert.NoError(t, err)
	assert.Equal(t, 1.0, f)

	_, err = BaseFactor("chai", "thùng", ml, na)
	assert.Error(t, err)

	f, err = BaseFactor("cái", "", nil, nil)
	assert.NoError(t, err)
	assert.Equal(t, 1.0, f)
}

func TestToBase(t *testing.T) {
	ml := strPtr("ml")
	na := f64Ptr(350.0)

	qty, price, err := ToBase("chai", "", ml, na, 1, 130000)
	assert.NoError(t, err)
	assert.Equal(t, 350.0, qty)
	assert.Equal(t, 371.43, price)

	qty, price, err = ToBase("chai", "ml", ml, na, 350, 130000)
	assert.NoError(t, err)
	assert.Equal(t, 350.0, qty)
	assert.Equal(t, 371.43, price)
}
