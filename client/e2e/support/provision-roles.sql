\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pgcrypto;

WITH org AS (
    SELECT organization_id
    FROM users
    WHERE phone = :'owner_phone' AND role = 'owner'
    LIMIT 1
),
seed(phone, full_name, role) AS (
    VALUES
        (:'manager_phone', 'Manager E2E', 'manager'),
        (:'receptionist_phone', 'Receptionist E2E', 'receptionist')
)
INSERT INTO users (organization_id, phone, password_hash, full_name, role, status)
SELECT org.organization_id,
       seed.phone,
       crypt(:'password', gen_salt('bf', 10)),
       seed.full_name,
       seed.role,
       'active'
FROM org, seed
WHERE NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.organization_id = org.organization_id AND u.phone = seed.phone
);

SELECT phone, role, status
FROM users
WHERE phone IN (:'owner_phone', :'manager_phone', :'receptionist_phone')
ORDER BY role;
