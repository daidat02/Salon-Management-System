CREATE TABLE payroll_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    start_day SMALLINT NOT NULL DEFAULT 26 CHECK (start_day BETWEEN 1 AND 28),
    standard_working_days SMALLINT NOT NULL DEFAULT 26 CHECK (standard_working_days BETWEEN 1 AND 31),
    auto_draft_cutoff_day SMALLINT NOT NULL DEFAULT 7 CHECK (auto_draft_cutoff_day BETWEEN 1 AND 28),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_payroll_settings_updated_at
    BEFORE UPDATE ON payroll_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE payrolls
    ADD COLUMN standard_working_days SMALLINT NOT NULL DEFAULT 26,
    ADD COLUMN total_leave_days INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN actual_working_days INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN penalty_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN adjustment_deduction NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN total_orders INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN total_items INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN total_amount_value NUMERIC(14,2) NOT NULL DEFAULT 0;
