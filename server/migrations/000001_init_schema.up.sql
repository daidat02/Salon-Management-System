
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS unaccent;
-- Trigger dùng chung: tự động set updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 1. ORGANIZATIONS
-- ==========================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address VARCHAR(255),
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
    email VARCHAR(150),
    website VARCHAR(255),
    tax_code VARCHAR(20),
    slogan VARCHAR(255),
    logo_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 2. USERS (chỉ tài khoản nội bộ)
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(150),
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('owner', 'manager', 'receptionist')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked', 'disabled')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX uq_users_org_email ON users(organization_id, email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX uq_users_org_phone ON users(organization_id, phone) WHERE phone IS NOT NULL;

-- ==========================================
-- 3. CUSTOMERS
-- ==========================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    birth_date DATE,
    note TEXT,
    total_spent NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
    total_visits INTEGER NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
    reward_points INTEGER NOT NULL DEFAULT 0 CHECK (reward_points >= 0),
    is_flagged_risk BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (organization_id, phone)
);
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 4. STAFF (thợ/nhân viên — CHỈ quản lý & thống kê)
-- ==========================================
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(150),
    birth_date DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    address TEXT,
    position VARCHAR(50) NOT NULL DEFAULT 'technician',
    employment_type VARCHAR(20) CHECK (employment_type IN ('fulltime', 'parttime')),
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    base_salary NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_holder VARCHAR(150),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    hire_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (organization_id, code)
);
CREATE TRIGGER trg_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 5. CATEGORIES
-- ==========================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('service', 'product', 'material')),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, type, name)
);
CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 6. SERVICES (Dịch vụ)
-- ==========================================
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    buffer_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0),
    price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 7. PRODUCTS (Sản phẩm bán lẻ / tiêu hao nội bộ)
-- ==========================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    unit VARCHAR(20),
    net_unit Varchar(10),
    net_amount NUMERIC(12,2) CHECK (net_amount >= 0),
    product_type VARCHAR(20) NOT NULL DEFAULT 'retail' CHECK (product_type IN ('retail', 'material', 'both')),
    show_on_web BOOLEAN NOT NULL DEFAULT true,
    cost_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    sell_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (sell_price >= 0),
    stock_quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    reserved_quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    min_stock NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, sku)
);
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger ép ẩn Sản phẩm khỏi Web nếu nó chỉ là vật tư (material)
CREATE OR REPLACE FUNCTION check_product_web_visibility()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.product_type = 'material' AND NEW.show_on_web = true THEN
        NEW.show_on_web = false; 
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_product_web
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION check_product_web_visibility();

-- ==========================================
-- 8. SERVICE_MATERIALS (Định mức vật tư/sản phẩm cho dịch vụ)
-- ==========================================
CREATE TABLE service_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    -- Đơn vị của quantity (VD tuýp/can khi recipe theo đơn vị lớn, ml/g khi theo đơn vị nhỏ nhất).
    unit VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, service_id, product_id)
);
CREATE TRIGGER trg_service_materials_updated_at
    BEFORE UPDATE ON service_materials
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 9. BLACKLISTS (Quản lý chặn / cọc)
-- ==========================================
CREATE TABLE blacklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('phone', 'ip', 'device_id')),
    value VARCHAR(255) NOT NULL, 
    reason TEXT,
    require_deposit BOOLEAN NOT NULL DEFAULT true, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, type, value)
);
CREATE TRIGGER trg_blacklists_updated_at
    BEFORE UPDATE ON blacklists
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 10. APPOINTMENTS (Lịch hẹn + Logic Cọc)
-- ==========================================
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show')),
    source VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'walk_in', 'phone')),
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    note TEXT,
    cancelled_reason VARCHAR(255),

    -- Các trường bổ sung phục vụ Blacklist & Đặt cọc
    device_id VARCHAR(255),
    client_ip VARCHAR(50),
    required_deposit_amount NUMERIC(14,2) DEFAULT 0 CHECK (required_deposit_amount >= 0),
    deposit_status VARCHAR(20) DEFAULT 'none' CHECK (deposit_status IN ('none', 'pending', 'paid', 'refunded', 'waived', 'failed')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, code),
    CHECK (end_time > start_time)
);
CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 11. APPOINTMENT_ITEMS (Chi tiết dịch vụ/sản phẩm trong lịch hẹn)
-- ==========================================
CREATE TABLE appointment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('service', 'product')),
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
    CHECK (
        (item_type = 'service' AND service_id IS NOT NULL AND product_id IS NULL) OR
        (item_type = 'product' AND product_id IS NOT NULL AND service_id IS NULL)
    )
);

-- ==========================================
-- 11.5 SUPPLIERS (Nhà cung cấp hàng hóa cho kho)
-- ==========================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Các liên kết đối tượng (Tùy loại phiếu mà điền cái tương ứng, còn lại để NULL)
    supplier_id UUID REFERENCES suppliers(id),       -- Dùng khi nhập mua từ nhà cung cấp
    -- order_id trỏ tới orders (bảng tạo ở mục 13) nên FK gắn bằng ALTER TABLE phía dưới
    order_id UUID,                                    -- Dùng khi xuất bán hoặc khách trả hàng
    
    document_code VARCHAR(50) NOT NULL,              -- Mã chứng từ (VD: NK-202609-001, XK-202609-001)
    type VARCHAR(20) NOT NULL CHECK (type IN ('import', 'export', 'adjust', 'sale', 'return')),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
    
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,   -- Tổng tiền của chứng từ
    note TEXT,                       
    reason TEXT,               
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, document_code),
    UNIQUE (order_id)
);

-- Index tối ưu tìm kiếm theo tổ chức và loại phiếu
CREATE INDEX idx_inventory_docs_org_type ON inventory_documents(organization_id, type);
CREATE INDEX idx_inventory_docs_order_id ON inventory_documents(order_id);

CREATE TABLE inventory_document_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES inventory_documents(id) ON DELETE CASCADE, -- Khóa ngoại trỏ lên bảng chứng từ mới
    product_id UUID NOT NULL REFERENCES products(id),                             
    
    -- 📸 PHẦN SNAPSHOT (Lưu cứng lại tại thời điểm phát sinh giao dịch)
    product_name VARCHAR(255) NOT NULL,               -- Lưu tên sản phẩm lúc đó
    sku VARCHAR(100) NOT NULL,                        -- Lưu mã SKU lúc đó
    unit VARCHAR(20) NOT NULL,                        -- Đơn vị tính lớn (chai, hộp, cái...)
    net_unit VARCHAR(20),                             -- Đơn vị định lượng nhỏ (ml, g...)
    net_amount NUMERIC(12,2),                         -- Quy cách (VD: 1000 ml/chai)
    
    quantity NUMERIC(12,2) NOT NULL,                  -- Số lượng theo đơn vị lớn
    unit_price NUMERIC(14,2) NOT NULL,                -- Đơn giá tại thời điểm đó
    total_price NUMERIC(14,2) NOT NULL                -- Thành tiền (quantity * unit_price)
);

-- Index tối ưu tìm kiếm chi tiết theo chứng từ
CREATE INDEX idx_inv_doc_items_doc_id ON inventory_document_items(document_id);

-- ==========================================
-- 12. INVENTORY_TRANSACTIONS (Giao dịch kho)
-- ==========================================
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('import', 'export', 'adjust', 'sale', 'return')),
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity <> 0),
    reference_type VARCHAR(50),
    reference_id UUID,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 13. ORDERS (Đơn hàng)
-- ==========================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    subtotal_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirm', 'delivery', 'completed', 'cancelled', 'refunded')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, code),
    CHECK (total_amount = GREATEST(subtotal_amount - discount_amount, 0))
);
-- FK từ chứng từ kho sang đơn hàng (orders tạo ở mục 13, sau inventory_documents)
ALTER TABLE inventory_documents
    ADD CONSTRAINT fk_inventory_documents_order_id FOREIGN KEY (order_id) REFERENCES orders(id);
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 14. ORDER_ITEMS (Chi tiết đơn hàng)
-- ==========================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('service', 'product')),
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit VARCHAR(20),
    unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
    CHECK (
        (item_type = 'service' AND service_id IS NOT NULL AND product_id IS NULL) OR
        (item_type = 'product' AND product_id IS NOT NULL AND service_id IS NULL)
    )
);
-- ===========================================
-- 14.1 ORDER_ITEM_MATERIALS (Chi tiết vật tư tiêu hao cho từng order_item)
-- ===========================================
CREATE TABLE order_item_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID REFERENCES order_items(id),
    product_id UUID REFERENCES products(id),
    quantity NUMERIC(12, 2) NOT NULL,       -- Số lượng thực tế dùng (gram, ml)
    unit_cost_at_time NUMERIC(12, 2) NOT NULL, -- GIÁ VỐN TẠI THỜI ĐIỂM DÙNG (Cực kỳ quan trọng để tính chính xác lợi nhuận đơn đó)
    -- Đơn vị của quantity (đơn vị nhỏ nhất sau quy đổi ở luồng gán lại;
    -- đơn vị định mức ở snapshot tự động từ dịch vụ).
    unit VARCHAR(20)
);

-- ===========================================
-- 14.2 ORDER_ITEM_STAFF (NV thực hiện từng món + chia hoa hồng)
-- 1 món có thể nhiều NV. type = loại hoa hồng: percent (% doanh thu),
-- fixed (số tiền cố định), profit (% lợi nhuận). Tổng share_pct của các
-- dòng percent/profit trong 1 món = 100 (validate ở usecase).
-- order_items.staff_id giữ lại để backward-compat.
-- ===========================================
CREATE TABLE order_item_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'percent' CHECK (type IN ('percent', 'fixed', 'profit')),
    share_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (share_pct >= 0 AND share_pct <= 100),
    commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0), -- tiền hoa hồng UI tự nhập, chốt tại lúc lưu
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (order_item_id, staff_id)
);

-- ==========================================
-- 15. PAYMENTS (Thanh toán)
-- ==========================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    method VARCHAR(20) NOT NULL CHECK (method IN ('cash', 'bank_transfer', 'gateway', 'card')),
    provider VARCHAR(50),
    provider_txn_id VARCHAR(100),
    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_payments_provider_txn ON payments(provider, provider_txn_id) WHERE provider_txn_id IS NOT NULL;

-- ==========================================
-- 16. NOTIFICATIONS (Thông báo)
-- ==========================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'email', 'zalo', 'in_app')),
    template_code VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 17. FUNDS (Nguồn tiền / quỹ: két tiền mặt, TK ngân hàng, ví điện tử)
-- Số dư quỹ KHÔNG sửa trực tiếp — chỉ biến động qua cash_flows đã duyệt.
-- ==========================================
CREATE TABLE funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    fund_type VARCHAR(20) NOT NULL CHECK (fund_type IN ('cash', 'bank', 'e_wallet')),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
    -- Số dư lưu trữ (stored balance): lock dòng + cập nhật nguyên tử trong tx
    -- khi ghi cash_flows (chống race khi 2 thu ngân chốt đơn cùng lúc).
    current_balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_configured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, code)
);
CREATE TRIGGER trg_funds_updated_at
    BEFORE UPDATE ON funds
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 18. CASH_FLOW_CATEGORIES (Danh mục thu/chi)
-- ==========================================
CREATE TABLE cash_flow_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    kind VARCHAR(10) NOT NULL CHECK (kind IN ('income', 'expense')),
    category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('revenue', 'operating_expense', 'non_pnl')),
    is_system BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, code)
);
CREATE TRIGGER trg_cash_flow_categories_updated_at
    BEFORE UPDATE ON cash_flow_categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 19. CASH_FLOWS (Phiếu thu/chi)
-- kind='income'  -> phiếu thu (PT-...)
-- kind='expense' -> phiếu chi  (PC-...)
-- ==========================================
CREATE TABLE cash_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,
    kind VARCHAR(10) NOT NULL CHECK (kind IN ('income', 'expense')),
    category_id UUID REFERENCES cash_flow_categories(id) ON DELETE SET NULL,
    fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE RESTRICT,
    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled')),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    inventory_document_id UUID REFERENCES inventory_documents(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (organization_id, code)
);
CREATE TRIGGER trg_cash_flows_updated_at
    BEFORE UPDATE ON cash_flows
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 20. PAYROLLS (Bảng lương theo kỳ tháng)
-- commission_amount: tổng từ order_item_staff.commission_amount trong kỳ.
-- net_pay do app tính: base + commission + bonus - advance - deduction.
-- ==========================================
CREATE TABLE payrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
    period_month DATE NOT NULL,
    base_salary NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
    commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
    bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
    advance_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (advance_amount >= 0),
    deduction_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (deduction_amount >= 0),
    net_pay NUMERIC(14,2) NOT NULL CHECK (net_pay >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
    cash_flow_id UUID REFERENCES cash_flows(id) ON DELETE SET NULL,
    paid_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, staff_id, period_month)
);
CREATE TRIGGER trg_payrolls_updated_at
    BEFORE UPDATE ON payrolls
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 21. STAFF_SALARY_ADJUSTMENTS (Thưởng/phạt, phụ cấp/khấu trừ)
-- payroll_id null khi draft; gán khi chốt lương để khóa.
-- ==========================================
CREATE TABLE staff_salary_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    payroll_id UUID REFERENCES payrolls(id) ON DELETE SET NULL,
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('ALLOWANCE', 'DEDUCTION')),
    amount BIGINT NOT NULL DEFAULT 0,
    reason VARCHAR(255) NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_staff_salary_adjustments_updated_at
    BEFORE UPDATE ON staff_salary_adjustments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 22. ATTENDANCES (Điểm danh / nghỉ phép)
-- ==========================================
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    payroll_id UUID REFERENCES payrolls(id) ON DELETE SET NULL,
    target_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'LEAVE_EXCUSED', 'LEAVE_UNEXCUSED', 'LATE')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (staff_id, target_date)
);
CREATE TRIGGER trg_attendances_updated_at
    BEFORE UPDATE ON attendances
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 23. STAFF_LEAVES (Đơn nghỉ phép / đi trễ)
-- ==========================================
CREATE TABLE staff_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('ANNUAL', 'EXCUSED', 'LATE')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT staff_leaves_date_range_check CHECK (end_date >= start_date)
);
CREATE TRIGGER trg_staff_leaves_updated_at
    BEFORE UPDATE ON staff_leaves
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 24. BUSINESS_HOURS (1 dòng/org; giờ làm việc 7 ngày lưu trong JSONB)
-- days là array đúng 7 phần tử, weekday 1=T2 .. 7=CN:
-- {weekday, is_open, open_time, close_time, break_start, break_end, note}
-- Dùng giờ tường của salon (không timezone). Validate chi tiết ở usecase.
-- ==========================================
CREATE TABLE business_hours (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    days JSONB NOT NULL DEFAULT '[
        {"weekday": 1, "is_open": true, "open_time": "08:30", "close_time": "20:30", "break_start": "12:30", "break_end": "13:30", "note": "Lịch thông thường"},
        {"weekday": 2, "is_open": true, "open_time": "08:30", "close_time": "20:30", "break_start": "12:30", "break_end": "13:30", "note": "Lịch thông thường"},
        {"weekday": 3, "is_open": true, "open_time": "08:30", "close_time": "20:30", "break_start": "12:30", "break_end": "13:30", "note": "Lịch thông thường"},
        {"weekday": 4, "is_open": true, "open_time": "08:30", "close_time": "20:30", "break_start": "12:30", "break_end": "13:30", "note": "Lịch thông thường"},
        {"weekday": 5, "is_open": true, "open_time": "08:30", "close_time": "21:00", "break_start": "12:30", "break_end": "13:30", "note": "Khung giờ cao điểm tối"},
        {"weekday": 6, "is_open": true, "open_time": "08:00", "close_time": "21:30", "break_start": null, "break_end": null, "note": "Ngày đông khách - tăng ca"},
        {"weekday": 7, "is_open": true, "open_time": "08:00", "close_time": "21:30", "break_start": null, "break_end": null, "note": "Ngày đông khách - tăng ca"}
    ]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT business_hours_days_is_array
        CHECK (jsonb_typeof(days) = 'array' AND jsonb_array_length(days) = 7)
);
CREATE TRIGGER trg_business_hours_updated_at
    BEFORE UPDATE ON business_hours
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 25. ORGANIZATION_NOTIFICATION_SETTINGS (1 dòng/org)
-- daily_report_time hiểu theo organizations.timezone.
-- ==========================================
CREATE TABLE organization_notification_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    appointment_reminder BOOLEAN NOT NULL DEFAULT true,
    new_booking_alert BOOLEAN NOT NULL DEFAULT true,
    low_stock_alert BOOLEAN NOT NULL DEFAULT true,
    daily_revenue_report BOOLEAN NOT NULL DEFAULT true,
    birthday_voucher BOOLEAN NOT NULL DEFAULT true,
    reminder_hours_before SMALLINT NOT NULL DEFAULT 2
        CHECK (reminder_hours_before BETWEEN 0 AND 168),
    low_stock_threshold INTEGER NOT NULL DEFAULT 5
        CHECK (low_stock_threshold >= 0),
    daily_report_time TIME NOT NULL DEFAULT '22:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_organization_notification_settings_updated_at
    BEFORE UPDATE ON organization_notification_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 26. APPOINTMENT_SETTINGS (Cấu hình đặt lịch + quy tắc cọc theo no-show)
-- 1 dòng / organization. Khách có >= no_show_threshold lần no_show trong
-- no_show_lookback_days ngày gần nhất thì lần đặt kế tiếp phải cọc.
-- ==========================================
CREATE TABLE appointment_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,

    -- Quy tắc đặt lịch
    allow_online_booking BOOLEAN NOT NULL DEFAULT true,
    auto_confirm BOOLEAN NOT NULL DEFAULT false,
    slot_step_minutes SMALLINT NOT NULL DEFAULT 30
        CHECK (slot_step_minutes IN (15, 30, 45, 60)),
    max_per_slot SMALLINT NOT NULL DEFAULT 2
        CHECK (max_per_slot >= 1),
    min_lead_minutes INTEGER NOT NULL DEFAULT 60
        CHECK (min_lead_minutes >= 0),
    max_advance_days INTEGER NOT NULL DEFAULT 30
        CHECK (max_advance_days >= 1),

    -- Hủy & đổi lịch
    allow_cancel BOOLEAN NOT NULL DEFAULT true,
    cancel_before_hours SMALLINT NOT NULL DEFAULT 4
        CHECK (cancel_before_hours >= 0),
    max_cancellations_per_month SMALLINT NOT NULL DEFAULT 3
        CHECK (max_cancellations_per_month >= 0),
    allow_reschedule BOOLEAN NOT NULL DEFAULT true,
    reschedule_before_hours SMALLINT NOT NULL DEFAULT 2
        CHECK (reschedule_before_hours >= 0),

    -- Cọc theo số lần không đến (no-show)
    deposit_enabled BOOLEAN NOT NULL DEFAULT true,
    no_show_threshold SMALLINT NOT NULL DEFAULT 2
        CHECK (no_show_threshold >= 1),
    no_show_lookback_days INTEGER NOT NULL DEFAULT 180
        CHECK (no_show_lookback_days >= 1),
    deposit_percent NUMERIC(5,2) NOT NULL DEFAULT 30
        CHECK (deposit_percent BETWEEN 0 AND 100),
    -- 0 = không giới hạn; > 0 = mức cọc tối đa
    deposit_max_amount NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (deposit_max_amount >= 0),

    CONSTRAINT appointment_settings_deposit_value_check CHECK (
        deposit_enabled = false OR deposit_percent > 0
    ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_appointment_settings_updated_at
    BEFORE UPDATE ON appointment_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 27. RECEIPT_SETTINGS (Cấu hình in hóa đơn / phiếu thu)
-- 1 dòng / organization.
-- ==========================================
CREATE TABLE receipt_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,

    -- Khổ giấy & máy in
    paper_size VARCHAR(20) NOT NULL DEFAULT 'K80'
        CHECK (paper_size IN ('K80', 'K57', 'A4', 'A5')),
    auto_cut_paper BOOLEAN NOT NULL DEFAULT true,
    open_cash_drawer BOOLEAN NOT NULL DEFAULT true,

    -- Header
    show_logo BOOLEAN NOT NULL DEFAULT true,
    logo_url TEXT,
    header_text TEXT,
    show_branch_address BOOLEAN NOT NULL DEFAULT true,
    show_cashier_name BOOLEAN NOT NULL DEFAULT true,

    -- Body & customer
    show_customer_info BOOLEAN NOT NULL DEFAULT true,
    mask_customer_phone BOOLEAN NOT NULL DEFAULT false,
    show_vietqr BOOLEAN NOT NULL DEFAULT true,

    -- Footer
    footer_text TEXT,
    show_wifi_info BOOLEAN NOT NULL DEFAULT false,
    wifi_name VARCHAR(100),
    wifi_pass VARCHAR(100),

    -- Automation
    auto_print_on_checkout BOOLEAN NOT NULL DEFAULT true,
    print_copy_count INT NOT NULL DEFAULT 1
        CHECK (print_copy_count >= 1),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_receipt_settings_updated_at
    BEFORE UPDATE ON receipt_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 28. PAYMENT_METHODS (Phương thức thanh toán tại quầy)
-- Mỗi phương thức gắn với 1 quỹ (funds) để hạch toán khi chốt đơn.
-- ==========================================
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE RESTRICT,

    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,

    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_org_method_code UNIQUE (organization_id, code)
);
CREATE TRIGGER trg_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- INDEXES (multi-tenant + FK + nghiệp vụ)
-- ==========================================
CREATE INDEX idx_organizations_slug ON organizations(slug);

CREATE INDEX idx_users_org_id ON users(organization_id);
CREATE INDEX idx_users_deleted ON users(organization_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_customers_org_id ON customers(organization_id);
CREATE INDEX idx_customers_phone ON customers(organization_id, phone);
CREATE INDEX idx_customers_active ON customers(organization_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_staff_org_id ON staff(organization_id);
CREATE INDEX idx_staff_status ON staff(organization_id, status) WHERE deleted_at IS NULL;

CREATE INDEX idx_categories_org_type ON categories(organization_id, type);

CREATE INDEX idx_services_org_id ON services(organization_id);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(organization_id, is_active) WHERE is_active = true;

CREATE INDEX idx_products_org_id ON products(organization_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_type ON products(organization_id, product_type);

CREATE INDEX idx_service_materials_service ON service_materials(service_id);

CREATE INDEX idx_blacklists_lookup ON blacklists(organization_id, type, value);

CREATE INDEX idx_appointments_org_id ON appointments(organization_id);
CREATE INDEX idx_appointments_time_range ON appointments(organization_id, start_time, end_time);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_staff ON appointments(staff_id);
CREATE INDEX idx_appointments_status ON appointments(organization_id, status);
CREATE INDEX idx_appointments_device_id ON appointments(organization_id, device_id);
CREATE INDEX idx_appointments_client_ip ON appointments(organization_id, client_ip);

-- Tra cứu nhanh số lần no_show của 1 khách trong khoảng thời gian.
CREATE INDEX idx_appointments_customer_noshow
    ON appointments (organization_id, customer_id, start_time)
    WHERE status = 'no_show';

CREATE INDEX idx_appointment_items_appointment_id ON appointment_items(appointment_id);

CREATE INDEX idx_suppliers_org_id ON suppliers(organization_id);

CREATE INDEX idx_inventory_docs_supplier ON inventory_documents(supplier_id);
CREATE INDEX idx_inv_doc_items_product ON inventory_document_items(product_id);

CREATE INDEX idx_inventory_tx_org_id ON inventory_transactions(organization_id);
CREATE INDEX idx_inventory_tx_product ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_tx_ref ON inventory_transactions(reference_type, reference_id);

CREATE INDEX idx_orders_org_id ON orders(organization_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_appointment ON orders(appointment_id);
CREATE INDEX idx_orders_status ON orders(organization_id, status);

-- Mỗi lịch hẹn chỉ có tối đa 1 đơn còn hiệu lực.
-- Đơn cancelled/refunded được phép tạo lại; partial index chống cả race
-- khi 2 request tạo đơn cùng appointment_id.
CREATE UNIQUE INDEX uq_orders_appointment_active
    ON orders (organization_id, appointment_id)
    WHERE appointment_id IS NOT NULL
      AND status NOT IN ('cancelled', 'refunded');

CREATE INDEX idx_order_items_org_id ON order_items(organization_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_staff ON order_items(staff_id);

CREATE INDEX idx_order_item_staff_item ON order_item_staff(order_item_id);
CREATE INDEX idx_order_item_staff_staff ON order_item_staff(organization_id, staff_id);

CREATE INDEX idx_payments_org_id ON payments(organization_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(organization_id, status);

CREATE INDEX idx_notifications_org_id ON notifications(organization_id);
CREATE INDEX idx_notifications_status ON notifications(organization_id, status) WHERE status = 'queued';

CREATE INDEX idx_cash_flow_categories_org ON cash_flow_categories(organization_id) WHERE is_active;

CREATE INDEX idx_funds_org ON funds(organization_id) WHERE is_active;
CREATE UNIQUE INDEX idx_funds_one_default ON funds(organization_id) WHERE is_default;

CREATE INDEX idx_cash_flows_org_occurred ON cash_flows(organization_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_cash_flows_org_status ON cash_flows(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_cash_flows_category ON cash_flows(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cash_flows_fund ON cash_flows(fund_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cash_flows_order ON cash_flows(order_id) WHERE order_id IS NOT NULL;

CREATE INDEX idx_payrolls_org_period ON payrolls(organization_id, period_month DESC);
CREATE INDEX idx_payrolls_staff ON payrolls(staff_id, period_month DESC);

CREATE INDEX idx_salary_adjustments_staff_date ON staff_salary_adjustments(staff_id, effective_date);
CREATE INDEX idx_attendances_staff_date ON attendances(staff_id, target_date);

CREATE INDEX idx_staff_leaves_staff_date
    ON staff_leaves (organization_id, staff_id, start_date);

CREATE INDEX idx_payment_methods_org ON payment_methods (organization_id) WHERE is_active;
CREATE INDEX idx_payment_methods_fund ON payment_methods (fund_id);