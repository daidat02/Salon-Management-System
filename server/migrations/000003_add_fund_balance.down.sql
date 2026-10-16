-- Rollback migration 000003: gỡ số dư lưu trữ của quỹ.
-- cash_flows giữ nguyên (số dư tính lại được từ opening + phiếu đã duyệt).

ALTER TABLE funds DROP COLUMN IF EXISTS current_balance;
