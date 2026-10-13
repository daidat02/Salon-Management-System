package utils

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
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
func GenerateAppointmentCode() string {
	id := strings.ReplaceAll(NewID(), "-", "")
	if len(id) > 8 {
		id = id[:8]
	}
	return "APT-" + strings.ToUpper(id)
}
