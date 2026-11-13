DROP INDEX IF EXISTS idx_payrolls_unique_active_period;

ALTER TABLE payrolls
    ADD CONSTRAINT payrolls_organization_id_staff_id_period_month_key
    UNIQUE (organization_id, staff_id, period_month);
