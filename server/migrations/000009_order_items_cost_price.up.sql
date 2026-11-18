ALTER TABLE order_items
    ADD COLUMN cost_price NUMERIC(14,2) CHECK (cost_price >= 0);

-- Backfill giá vốn cho dòng sản phẩm cũ bằng giá nhập hiện tại của sản phẩm.
-- Dòng dịch vụ để NULL (không có giá nhập).
UPDATE order_items oi
SET cost_price = p.cost_price
FROM products p
WHERE oi.item_type = 'product' AND oi.product_id = p.id;
