ALTER TABLE payrolls
    DROP CONSTRAINT IF EXISTS payrolls_organization_id_staff_id_period_month_key;

CREATE UNIQUE INDEX idx_payrolls_unique_active_period
    ON payrolls (organization_id, staff_id, period_month)
    WHERE status <> 'cancelled';
