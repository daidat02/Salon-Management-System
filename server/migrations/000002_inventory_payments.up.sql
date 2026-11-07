ALTER TABLE inventory_documents
    ADD COLUMN payment_tracked BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN due_date DATE,
    ADD COLUMN gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (vat_rate >= 0 AND vat_rate <= 100),
    ADD COLUMN vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN shipping_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN invoice_code VARCHAR(50);

ALTER TABLE inventory_document_items
    ADD COLUMN discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    ADD COLUMN discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0;

CREATE INDEX idx_cash_flows_inventory_document_id ON cash_flows(inventory_document_id);
CREATE INDEX idx_inventory_docs_due_date ON inventory_documents(organization_id, due_date);
