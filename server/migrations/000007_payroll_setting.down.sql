ALTER TABLE payrolls
    DROP COLUMN IF EXISTS standard_working_days,
    DROP COLUMN IF EXISTS total_leave_days,
    DROP COLUMN IF EXISTS actual_working_days,
    DROP COLUMN IF EXISTS penalty_amount,
    DROP COLUMN IF EXISTS adjustment_deduction,
    DROP COLUMN IF EXISTS total_orders,
    DROP COLUMN IF EXISTS total_items,
    DROP COLUMN IF EXISTS total_amount_value;

DROP TABLE IF EXISTS payroll_settings CASCADE;
