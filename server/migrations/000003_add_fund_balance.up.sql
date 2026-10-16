-- Migration 000003: số dư lưu trữ của quỹ (stored balance).
-- funds trước đây chỉ có opening_balance; số dư cộng dồn qua cash_flows
-- cần cột current_balance để lock dòng + cập nhật nguyên tử trong tx
-- (chống race khi 2 thu ngân chốt đơn cùng lúc).
-- Chạy lại an toàn: ADD COLUMN IF NOT EXISTS + backfill có điều kiện.

ALTER TABLE funds
    ADD COLUMN IF NOT EXISTS current_balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_balance >= 0);

-- Quỹ chưa từng phát sinh phiếu thì khởi tạo bằng số dư đầu kỳ.
-- (Điều kiện NOT EXISTS giúp chạy lại an toàn, không reset số dư thật.)
UPDATE funds f
SET current_balance = f.opening_balance
WHERE NOT EXISTS (
    SELECT 1 FROM cash_flows c
    WHERE c.fund_id = f.id AND c.deleted_at IS NULL
);
