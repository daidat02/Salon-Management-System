package utils

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"time"
)

// GenerateOrderCode sinh mã đơn dạng ORD-ddMMyy-HHmm + 4 số ngẫu nhiên.
// VD: ORD-300926-14304821
func GenerateOrderCode() string {
	now := time.Now()
	var randPart [4]byte
	for i := range randPart {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			randPart[i] = byte('0' + now.Nanosecond()%10)
			continue
		}
		randPart[i] = byte('0' + n.Int64())
	}
	return fmt.Sprintf("ORD-%02d%02d%02d-%02d%02d%s",
		now.Day(), int(now.Month()), now.Year()%100,
		now.Hour(), now.Minute(), string(randPart[:]))
}

// GenerateAppointmentCode sinh mã lịch hẹn vừa VARCHAR(20), vd APT-3F9A2C1D.
// Phần đuôi là 4 byte ngẫu nhiên (8 ký tự hex), KHÔNG lấy từ NewID() vì UUIDv7
// có 8 ký tự đầu là timestamp nên nhiều lịch tạo trong cùng ~1 phút sẽ trùng mã.
func GenerateAppointmentCode() string {
	var b [4]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fmt.Sprintf("APT-%08X", uint32(time.Now().UnixNano()))
	}
	return fmt.Sprintf("APT-%X", b)
}

// GenerateCashFlowCode sinh mã phiếu thu/chi dạng PT-yyMM-XXXX (income)
// hoặc PC-yyMM-XXXX (expense), vd PT-2610-4821. Phần số ngẫu nhiên nên
// caller phải xử lý unique violation (23505) bằng cách sinh lại.
func GenerateCashFlowCode(kind string) string {
	prefix := "PC"
	if kind == "income" {
		prefix = "PT"
	}
	now := time.Now()
	var randPart [4]byte
	for i := range randPart {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			randPart[i] = byte('0' + now.Nanosecond()%10)
			continue
		}
		randPart[i] = byte('0' + n.Int64())
	}
	return fmt.Sprintf("%s-%02d%02d-%s",
		prefix, now.Year()%100, int(now.Month()), string(randPart[:]))
}
