package utils

import "strings"

// StrPtr biến "" (hoặc chỉ khoảng trắng) thành nil để chứa trong
// field nullable của response. Chuỗi còn lại được TrimSpace.
func StrPtr(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	v := strings.TrimSpace(s)
	return &v
}

// StrVal mở pointer string, nil thành "".
func StrVal(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
