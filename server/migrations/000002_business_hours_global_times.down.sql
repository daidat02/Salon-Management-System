-- Khôi phục days chứa giờ chi tiết từ các cột phút dùng chung.
UPDATE business_hours
SET days = (
    SELECT jsonb_agg(
        jsonb_build_object(
            'weekday', (d->>'weekday')::int,
            'is_open', COALESCE((d->>'is_open')::boolean, false),
            'open_time', to_char(time '00:00' + make_interval(mins => open_time_minutes), 'HH24:MI'),
            'close_time', to_char(time '00:00' + make_interval(mins => close_time_minutes), 'HH24:MI'),
            'break_start', CASE
                WHEN break_start_minutes IS NULL THEN NULL
                ELSE to_char(time '00:00' + make_interval(mins => break_start_minutes), 'HH24:MI')
            END,
            'break_end', CASE
                WHEN break_end_minutes IS NULL THEN NULL
                ELSE to_char(time '00:00' + make_interval(mins => break_end_minutes), 'HH24:MI')
            END,
            'note', NULL
        )
        ORDER BY (d->>'weekday')::int
    )
    FROM jsonb_array_elements(days) AS d
);

ALTER TABLE business_hours
    ALTER COLUMN days SET DEFAULT '[
        {"weekday": 1, "is_open": true, "open_time": "08:30", "close_time": "20:30", "break_start": "12:30", "break_end": "13:30", "note": "Lịch thông thường"},
        {"weekday": 2, "is_open": true, "open_time": "08:30", "close_time": "20:30", "break_start": "12:30", "break_end": "13:30", "note": "Lịch thông thường"},
        {"weekday": 3, "is_open": true, "open_time": "08:30", "close_time": "20:30", "break_start": "12:30", "break_end": "13:30", "note": "Lịch thông thường"},
        {"weekday": 4, "is_open": true, "open_time": "08:30", "close_time": "20:30", "break_start": "12:30", "break_end": "13:30", "note": "Lịch thông thường"},
        {"weekday": 5, "is_open": true, "open_time": "08:30", "close_time": "21:00", "break_start": "12:30", "break_end": "13:30", "note": "Khung giờ cao điểm tối"},
        {"weekday": 6, "is_open": true, "open_time": "08:00", "close_time": "21:30", "break_start": null, "break_end": null, "note": "Ngày đông khách - tăng ca"},
        {"weekday": 7, "is_open": true, "open_time": "08:00", "close_time": "21:30", "break_start": null, "break_end": null, "note": "Ngày đông khách - tăng ca"}
    ]'::jsonb;

ALTER TABLE business_hours
    DROP CONSTRAINT IF EXISTS business_hours_break_range,
    DROP CONSTRAINT IF EXISTS business_hours_open_range;

ALTER TABLE business_hours
    DROP COLUMN IF EXISTS break_end_minutes,
    DROP COLUMN IF EXISTS break_start_minutes,
    DROP COLUMN IF EXISTS close_time_minutes,
    DROP COLUMN IF EXISTS open_time_minutes;
