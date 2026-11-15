#!/usr/bin/env bash
# Tạo tổ chức demo + 3 tài khoản E2E (owner/manager/receptionist) trong cùng org.
#
# Yêu cầu:
#   - Backend Go đang chạy và migration đã up.
#   - psql kết nối được DB (E2E_DB_URL).
#
# Biến môi trường:
#   E2E_API_ORIGIN    mặc định http://localhost:8080
#   E2E_DB_URL        bắt buộc, vd: postgres://postgres:secret@localhost:5432/salon_db?sslmode=disable
#   E2E_ORG_SLUG      mặc định e2e-<timestamp>
#   E2E_OWNER_PHONE   mặc định 0900000001
#   E2E_OWNER_PASSWORD mặc định E2ePassw0rd!
#   E2E_MANAGER_PHONE mặc định 0900000002
#   E2E_RECEPTIONIST_PHONE mặc định 0900000003
#
# Sau khi chạy, export các biến in ra ở cuối (hoặc dùng trực tiếp trong CI).
set -euo pipefail

API_ORIGIN="${E2E_API_ORIGIN:-http://localhost:8080}"
DB_URL="${E2E_DB_URL:-}"
ORG_SLUG="${E2E_ORG_SLUG:-e2e-$(date +%s)}"
OWNER_PHONE="${E2E_OWNER_PHONE:-0900000001}"
OWNER_PASSWORD="${E2E_OWNER_PASSWORD:-E2ePassw0rd!}"
MANAGER_PHONE="${E2E_MANAGER_PHONE:-0900000002}"
RECEPTIONIST_PHONE="${E2E_RECEPTIONIST_PHONE:-0900000003}"

if [[ -z "$DB_URL" ]]; then
  echo "Thiếu E2E_DB_URL (chuỗi kết nối Postgres)." >&2
  exit 1
fi

echo "→ Tạo tổ chức demo '$ORG_SLUG' với owner $OWNER_PHONE"
curl -fsS -X POST "$API_ORIGIN/api/v1/organizations" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Salon E2E $ORG_SLUG\",\"slug\":\"$ORG_SLUG\",\"timezone\":\"Asia/Ho_Chi_Minh\",\"owner_phone\":\"$OWNER_PHONE\",\"owner_password\":\"$OWNER_PASSWORD\",\"owner_full_name\":\"Owner E2E\"}" \
  >/dev/null

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ Tạo tài khoản manager/receptionist trong cùng tổ chức"
psql "$DB_URL" \
  -v owner_phone="$OWNER_PHONE" \
  -v manager_phone="$MANAGER_PHONE" \
  -v receptionist_phone="$RECEPTIONIST_PHONE" \
  -v password="$OWNER_PASSWORD" \
  -f "$SCRIPT_DIR/provision-roles.sql"

cat <<EOF

Đã tạo xong. Export các biến sau trước khi chạy Playwright:

export E2E_OWNER_PHONE=$OWNER_PHONE
export E2E_OWNER_PASSWORD=$OWNER_PASSWORD
export E2E_MANAGER_PHONE=$MANAGER_PHONE
export E2E_MANAGER_PASSWORD=$OWNER_PASSWORD
export E2E_RECEPTIONIST_PHONE=$RECEPTIONIST_PHONE
export E2E_RECEPTIONIST_PASSWORD=$OWNER_PASSWORD
EOF
