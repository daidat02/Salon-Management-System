DROP INDEX IF EXISTS idx_inventory_docs_due_date;
DROP INDEX IF EXISTS idx_cash_flows_inventory_document_id;

ALTER TABLE inventory_document_items
    DROP COLUMN IF EXISTS discount_amount,
    DROP COLUMN IF EXISTS discount_percent;

ALTER TABLE inventory_documents
    DROP COLUMN IF EXISTS invoice_code,
    DROP COLUMN IF EXISTS paid_amount,
    DROP COLUMN IF EXISTS shipping_fee,
    DROP COLUMN IF EXISTS vat_amount,
    DROP COLUMN IF EXISTS vat_rate,
    DROP COLUMN IF EXISTS discount_amount,
    DROP COLUMN IF EXISTS gross_amount,
    DROP COLUMN IF EXISTS due_date,
    DROP COLUMN IF EXISTS payment_tracked;
