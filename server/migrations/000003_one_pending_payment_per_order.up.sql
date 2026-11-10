-- Mỗi đơn chỉ được có tối đa 1 payment đang chờ xác nhận.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_pending_order
    ON payments(order_id)
    WHERE status = 'pending';
