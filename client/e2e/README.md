# E2E tests (Playwright)

Bộ test E2E chạy trên frontend Next.js thật + backend Go thật + Postgres seed.
Kế hoạch đầy đủ và danh mục test nằm ở [`../docs/E2E_TEST_PLAN.md`](../docs/E2E_TEST_PLAN.md).

## Cấu trúc

```
e2e/
  global-setup.ts        # đăng nhập 3 role, ghi storageState + token
  support/
    env.ts               # URL, tài khoản, đường dẫn .auth
    api.ts               # API client gọi trực tiếp backend (qua Next proxy)
    data.ts              # factory tạo dữ liệu test (customer, product, order...)
    tokens.ts            # đọc token/storageState theo role
    provision.sh         # tạo org demo + 3 tài khoản E2E
    provision-roles.sql  # thêm manager/receptionist vào org
  fixtures/test.ts       # fixture `api`, `apiAs(role)`
  smoke/                 # test P0 chạy mỗi PR
```

## Chuẩn bị môi trường

1. Khởi động DB + backend + frontend:

   ```bash
   cd server
   docker compose up -d
   make migrate-up DATABASE_URL="postgres://postgres:secretpassword@localhost:5432/salon_db?sslmode=disable"
   go run ./cmd

   cd ../client
   npm run dev
   ```

2. Tạo tài khoản test (org demo + owner/manager/receptionist cùng org):

   ```bash
   cd client
   E2E_DB_URL="postgres://postgres:secretpassword@localhost:5432/salon_db?sslmode=disable" \
     bash e2e/support/provision.sh
   ```

   Script in ra các biến `E2E_*` cần export. Mặc định mật khẩu `E2ePassw0rd!`,
   phone `0900000001/02/03`, slug `e2e-<timestamp>`.

3. Export biến môi trường (có thể đặt trong `.env.e2e`, **không commit**):

   ```bash
   export E2E_OWNER_PHONE=0900000001
   export E2E_OWNER_PASSWORD='E2ePassw0rd!'
   export E2E_MANAGER_PHONE=0900000002
   export E2E_MANAGER_PASSWORD='E2ePassw0rd!'
   export E2E_RECEPTIONIST_PHONE=0900000003
   export E2E_RECEPTIONIST_PASSWORD='E2ePassw0rd!'
   ```

   Thiếu tài khoản role nào thì các test của role đó tự `skip`, không fail cả suite.

## Chạy test

```bash
npm run test:e2e            # toàn bộ
npm run test:e2e:smoke      # chỉ smoke (P0, dùng cho PR)
npm run test:e2e:ui         # chế độ UI debug
npm run test:e2e:report     # mở HTML report
```

`webServer` tự chạy `npm run dev` nếu chưa có server; đặt `E2E_APP_URL` /
`E2E_LANDING_URL` / `API_PROXY_TARGET` để đổi đích.

## Dùng role và API trong test

```ts
import { test, expect, roleStorageState } from '../fixtures/test';

test.describe('Trang quản lý nhân viên', () => {
  test.use({ storageState: roleStorageState('manager') });

  test('E2E-STAFF-001 ...', async ({ page, api }) => {
    const staff = await api.post('/staff', {
      /* ... */
    });
    await page.goto('/staff');
    await expect(page.getByText(staff.full_name)).toBeVisible();
  });
});
```

- `api`: API client với token của **owner** (gọi backend trực tiếp, dùng để tạo data).
- `apiAs(role)`: client theo role khác, tự dispose sau test.
- `roleStorageState(role)`: storageState đã đăng nhập; tự skip nếu thiếu tài khoản.

## Quy ước dữ liệu

- Mỗi test tạo dữ liệu riêng qua `support/data.ts` (có `RUN_ID` + suffix ngẫu nhiên).
- Không phụ thuộc thứ tự test; không sửa dữ liệu seed dùng chung.
- Dọn dẹp: nightly job reset DB về seed; test thường chỉ tạo thêm.
- Test ID đặt trong tên test: `E2E-<PAGE>-<NNN>`.

## Lưu ý

- `.auth/`, `test-results/`, `playwright-report/` đã được gitignore.
- Backend set cookie `refresh_token` httpOnly; `access_token` chỉ nằm trong memory.
  `globalSetup` ghi thêm `persist:auth` vào localStorage để app khôi phục user,
  còn token được refresh tự động qua interceptor khi reload.
- `.env` của client bị gitignore; không commit tài khoản/mật khẩu test.
