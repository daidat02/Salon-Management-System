-- Đưa khung giờ làm việc dùng chung ra khỏi JSONB days.
-- days chỉ còn {weekday, is_open}; giờ mở/đóng/nghỉ lưu bằng số phút từ 00:00.
ALTER TABLE business_hours
    ADD COLUMN open_time_minutes SMALLINT NOT NULL DEFAULT 510,
    ADD COLUMN close_time_minutes SMALLINT NOT NULL DEFAULT 1230,
    ADD COLUMN break_start_minutes SMALLINT DEFAULT 750,
    ADD COLUMN break_end_minutes SMALLINT DEFAULT 810;

ALTER TABLE business_hours
    ADD CONSTRAINT business_hours_open_range
        CHECK (open_time_minutes >= 0 AND close_time_minutes <= 1440
               AND open_time_minutes < close_time_minutes),
    ADD CONSTRAINT business_hours_break_range
        CHECK (
            (break_start_minutes IS NULL AND break_end_minutes IS NULL)
            OR (
                break_start_minutes IS NOT NULL AND break_end_minutes IS NOT NULL
                AND break_start_minutes >= open_time_minutes
                AND break_end_minutes <= close_time_minutes
                AND break_start_minutes < break_end_minutes
            )
        );

-- Bỏ các field giờ cũ trong từng phần tử days, chỉ giữ weekday + is_open.
UPDATE business_hours
SET days = (
    SELECT jsonb_agg(
        jsonb_build_object(
            'weekday', (d->>'weekday')::int,
            'is_open', COALESCE((d->>'is_open')::boolean, false)
        )
        ORDER BY (d->>'weekday')::int
    )
    FROM jsonb_array_elements(days) AS d
);

ALTER TABLE business_hours
    ALTER COLUMN days SET DEFAULT '[
        {"weekday": 1, "is_open": true},
        {"weekday": 2, "is_open": true},
        {"weekday": 3, "is_open": true},
        {"weekday": 4, "is_open": true},
        {"weekday": 5, "is_open": true},
        {"weekday": 6, "is_open": true},
        {"weekday": 7, "is_open": true}
    ]'::jsonb;
