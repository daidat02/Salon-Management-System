# Spec — Kế hoạch E2E Frontend (Playwright)

> Trạng thái: `ready-for-agent`
> Phạm vi: `client/` (Next.js 16 App Router)
> Đi kèm: **103 ticket** triển khai tại `.scratch/e2e-test-plan/issues/` (mỗi test một file; `00` là prefactor, `01–03` là hạ tầng).

## Problem Statement

Frontend salon hiện chưa có hạ tầng E2E nào. Người dùng (chủ salon, quản lý, lễ tân) thao tác trên ~20 màn hình nghiệp vụ quan trọng — lịch hẹn, đơn hàng, thu ngân/POS, kho, thu chi, nhân sự, cấu hình — nhưng không có lưới an toàn tự động. Lỗi hồi quy (sai tổng tiền, sai trạng thái đơn, trừ tồn kho sai, route/role bị lộ, form không lưu) chỉ phát hiện khi tester thao tác tay. Điều này khiến mỗi lần release phải regression thủ công, chậm và dễ sót.

## Solution

Xây một bộ test E2E bằng **Playwright + TypeScript** chạy trên **real stack** (Next + Go API + Postgres seed), phủ **tất cả route**, phân tầng ưu tiên, mỗi test là một kịch bản độc lập có dữ liệu riêng và dọn dẹp. Bộ test chia 3 tầng chạy:

- **P0 — Smoke doanh thu** (bắt buộc xanh trên mỗi PR): auth, overview, appointments, orders + payment, cashier/POS, inventory inbound/outbound, customers, RBAC route guard.
- **P1 — Quản trị** (nightly): products, services, categories, inventory detail/debt, cashflow, staff.
- **P2 — Smoke/mock** (thủ công hoặc nightly): landing, register, forgot-password, settings, reports, not-found.

Mỗi test được mô tả bởi một ticket riêng, có Test ID, preconditions, steps, expected, role, data, priority, và gắn nhãn `BLOCKED` nếu màn hình còn mock data.

## Environment & Routing

- **Landing**: `http://localhost:3000/landing` (root `/` redirect → `/landing`).
- **Auth & Dashboard**: `http://app.localhost:3000/...` (subdomain routing qua `src/proxy.ts`).
  - `/app/*` → 308 redirect về cùng host không `/app`.
  - Chưa có cookie `refresh_token` → redirect `/login?next=<path>`.
  - Đã có cookie + `/` → `/overview`.
- **API**: same-origin `/api/v1/*`, Next rewrite → Go `http://localhost:8080`.
- **Auth token**: access token in-memory Redux + mirror `sessionStorage`; refresh token cookie httpOnly. 401 → `POST /api/v1/refresh-token` rồi retry; thất bại → full-page redirect `/login?next=<current>`.
- **Ngoại lệ endpoint**: register gọi `/api/register` (không `/v1`).
- **Backend seed**: chạy `server` docker compose + `make migrate-up` trước suite. Test data độc lập với seed (xem Data Strategy).

## Roles & Permissions (RBAC)

| Role | Label | Quyền chính |
|---|---|---|
| `owner` | Chủ salon | toàn bộ, gồm `staff:delete`, `payroll:manage`, `order:refund` |
| `manager` | Quản lý salon | toàn bộ trừ `staff:delete`, `payroll:manage`, `order:refund` |
| `receptionist` | Lễ tân | chỉ `cashflow:create` |

**Route bị chặn** (`RoleGuard` → `AccessDenied`): `/settings`, `/reports`, `/inventory/inbound`, `/inventory/outbound`, `/staff` — chỉ owner/manager.
**UI chặn hành động** (ẩn nút, không disable): `catalog:write`, `inventory:write`, `cashflow:write`, `cashflow:create`, `staff:write`, `payroll:manage`, `order:cancel`, `order:refund`, `reports:view`.
**AccessDenied copy**: `Không có quyền truy cập` / `Vai trò hiện tại không được phép mở trang này.` / nút `Về trang tổng quan`.

## Conventions

- **Test ID**: `E2E-<PAGE>-<NNN>` (vd `E2E-APT-003`). Ticket file: `NN-<page>-<slug>.md`.
- **Selector policy**: ưu tiên `getByRole` + exact visible text tiếng Việt; dùng `data-testid` chỉ khi text không ổn định (thêm vào code là một ticket prefactor riêng nếu cần).
- **Network**: chờ theo UI/response API, không `waitForTimeout`. Mỗi test tự chờ trạng thái cuối (toast/redirect/list refresh).
- **Toast**: component hiện chỉ render toast `success`; test không assert error/info toast. Ưu tiên assert inline error (`getByText` trong dialog) hoặc trạng thái UI.
- **Storage state**: login một lần mỗi role trong `globalSetup` → lưu `storageState` cho owner/manager/receptionist; test dùng lại, có 1 test riêng cho luồng login UI.
- **Screenshot/trace**: `off` khi pass; `on-first-retry` trace/video/screenshot.
- **Time**: test liên quan thời gian dùng ngày tương lai gần và mock clock nếu cần; không phụ thuộc giờ hệ thống cho dữ liệu nghiệp vụ.

## Data Strategy

1. **Baseline seed** cố định (tổ chức, owner, 1 chi nhánh, vài dịch vụ/sản phẩm/nhân viên/quỹ).
2. **Mỗi test tự tạo dữ liệu riêng** với suffix duy nhất (`Date.now()`/random) cho SĐT, mã SKU, tên, email → tránh đụng nhau và chạy song song được.
3. **Cleanup** qua API/DB trong `afterEach`/fixture; test không xóa dữ liệu seed ngoài phạm vi của nó.
4. **Reset DB đầy đủ** chỉ ở nightly job (`docker compose down -v && make migrate-up && seed`).
5. **Không** assert theo số liệu tuyệt đối của dashboard nếu phụ thuộc dữ liệu seed dễ đổi; assert theo delta (trước/sau) hoặc theo dữ liệu test vừa tạo.
6. Helper fixtures: `createCustomer`, `createProduct`, `createService`, `createAppointment`, `createOrder`, `createInventoryDocument`, `createCashflow`, `createStaff`, `createFund` (gọi API trực tiếp với token role phù hợp).

## CI & Execution

- **PR**: `@smoke` (P0) — timeout mục tiêu ≤ 10 phút, 1 worker cho dữ liệu chia sẻ hoặc shard theo role.
- **Nightly**: full P0 + P1 (+ P2 nếu ổn định), reset DB.
- **P2 mock**: chạy thủ công hoặc nightly, không block PR.
- **GitHub Actions**: service Postgres + migrate + seed, build/start Next, chạy `npx playwright test`.
- Artifacts: HTML report + trace khi fail.

## Test Catalog

> Chi tiết từng scenario nằm trong ticket tương ứng. Bảng dưới là chỉ mục.

| Page | Route | Priority | Tests |
|---|---|---|---|
| Infra | — | P0 | 00 testid prefactor, 01 scaffold, 02 fixtures, 03 CI |
| Auth | `/login` | P0 | E2E-AUTH-001..008 |
| Register | `/register` | P2 | E2E-REG-001..002 |
| Forgot password | `/forgot-password` | P2 · BLOCKED | E2E-FPW-001 |
| Landing | `/landing` | P2 | E2E-LAND-001 |
| Not found | 404 | P2 | E2E-404-001 |
| Overview | `/overview` | P0 | E2E-OVW-001..003 |
| Appointments | `/appointments` | P0 | E2E-APT-001..010 |
| Orders | `/orders` | P0 | E2E-ORD-001..010 |
| Cashier | `/cashier` | P0 | E2E-CSH-001..002 |
| POS | `/cashier/pos` | P0 | E2E-POS-001..006 |
| Customers | `/customers` | P0 | E2E-CUS-001..005 |
| Products | `/products` | P1 | E2E-PRD-001..004 |
| Services | `/services` | P1 | E2E-SVC-001..004 |
| Categories | `/categories` | P1 | E2E-CAT-001..004 |
| Inventory | `/inventory` | P0 | E2E-INV-001..002 |
| Inventory inbound/outbound | `/inventory/inbound` `/outbound` | P0 | E2E-INV-003..006 |
| Inventory detail | `/inventory/[id]` | P1 | E2E-INV-007..008 |
| Cashflow | `/cashflow` | P1 | E2E-CFL-001..006 |
| Staff | `/staff` | P1 | E2E-STF-001..003 |
| Staff detail | `/staff/[id]` | P1 | E2E-STF-004..008 |
| Settings | `/settings/*` | P2 | E2E-SET-001..007 |
| Reports | `/reports` | P2 | E2E-RPT-001..004 |
| RBAC | cross-cutting | P0 | E2E-RBAC-001..005 |

---

## Auth & Session

**Preconditions chung**: app host `app.localhost:3000`, backend + seed sẵn. Dùng account seed: owner/manager/receptionist (mật khẩu seed cố định, ghi trong fixture).

| Test ID | Scenario | Steps chính | Expected |
|---|---|---|---|
| E2E-AUTH-001 | Đăng nhập thành công | Mở `/login`, nhập SĐT + mật khẩu owner, bấm `Đăng nhập` | Redirect `/overview`; heading chào xuất hiện; `refresh_token` cookie tồn tại |
| E2E-AUTH-002 | Sai mật khẩu | Nhập đúng SĐT + sai mật khẩu | Vẫn ở `/login`, hiển thị message lỗi backend (fallback `Đăng nhập thất bại`), nút trở lại trạng thái thường |
| E2E-AUTH-003 | Tôn trọng `?next` | Mở `/login?next=/orders`, login thành công | Redirect đúng `/orders` |
| E2E-AUTH-004 | Ghi nhớ đăng nhập | Tick `Ghi nhớ đăng nhập` (mặc định), login, reload | Vẫn authenticated (token mirror `sessionStorage`); logout xóa token |
| E2E-AUTH-005 | Đăng xuất | Từ dashboard bấm `Đăng xuất` | Redirect `/login`, cookie phiên bị xóa; mở lại route bảo vệ bị đẩy về login |
| E2E-AUTH-006 | Guard chưa đăng nhập | Xóa cookie, mở `/orders?status=completed` | Redirect `/login?next=/orders%3Fstatus%3Dcompleted` |
| E2E-AUTH-007 | Refresh token | Login, xóa access token trong bộ nhớ/`sessionStorage`, gọi hành động cần API | Request 401 được refresh + retry; UI vẫn hoạt động, không bị đẩy về login |
| E2E-AUTH-008 | Root redirect | Login rồi mở `/` | Redirect `/overview` |

## Register / Forgot / Public

| Test ID | Scenario | Steps | Expected |
|---|---|---|---|
| E2E-REG-001 | Đăng ký thành công | Mở `/register`, nhập full_name, SĐT mới, email, role, mật khẩu ≥6, nhập lại; submit | Hiện `Đăng ký thành công`, text `Tài khoản {phone} đã được tạo...`, nút `Đăng nhập ngay` → `/login` |
| E2E-REG-002 | Validate đăng ký | (a) mật khẩu ≠ nhập lại; (b) mật khẩu <6 | (a) `Mật khẩu nhập lại chưa khớp.`; (b) `Mật khẩu phải từ 6 ký tự trở lên.` |
| E2E-FPW-001 · BLOCKED | Quên mật khẩu (mock) | Mở `/forgot-password`, nhập SĐT, submit | Hiện `Đã gửi yêu cầu` + text `Nếu số {phone} tồn tại...`; nút `Gửi lại mã` quay lại form. **Chưa có API thật** — chỉ test UI, không assert gửi SMS |
| E2E-LAND-001 | Landing smoke | Mở `/landing` | Thấy heading `Salon Project — Landing Page`; link `Vào Dashboard` trỏ `NEXT_PUBLIC_APP_URL`; root `/` redirect `/landing` |
| E2E-404-001 | Trang 404 | Mở app host path không tồn tại (đã login) | Hiện `Không tìm thấy trang`, `Mã lỗi: 404 • NOT_FOUND`; `Về Dashboard` → `/overview`; `Về trang chủ` → `/landing` |

## Overview (`/overview`)

| Test ID | Scenario | Steps | Expected |
|---|---|---|---|
| E2E-OVW-001 | Render dữ liệu | Login owner, mở `/overview` | 4 KPI `Doanh thu hôm nay`, `Giá trị đơn trung bình`, `Lịch hẹn hôm nay`, `Tổng đơn hàng`; greeting `Chào buổi sáng, {name}`; chart `Doanh thu 7 ngày qua`; bảng `Lịch hẹn hôm nay` + `Đơn hàng gần đây` |
| E2E-OVW-002 | Lỗi + thử lại | Chặn `GET /api/v1/overview` trả 500 | Banner `Không tải được số liệu tổng quan: ...` + nút `Thử lại`; bỏ chặn, bấm `Thử lại` → dữ liệu hiện |
| E2E-OVW-003 | Điều hướng | Bấm `Xem tất cả` ở lịch hẹn/đơn, `+ Nhập kho ngay` (owner) | Điều hướng `/appointments`, `/orders`, `/inventory/inbound` |

## Appointments (`/appointments`)

| Test ID | Scenario | Steps | Expected |
|---|---|---|---|
| E2E-APT-001 | Lịch tuần mặc định | Mở `/appointments` | Mặc định `Lịch tuần`; grid 08:00–19:00 T2–CN; `Tuần trước`/`Tuần sau`/`Tuần này` đổi tuần; footer `Tuần ... • N lịch hẹn` |
| E2E-APT-002 | Danh sách + tìm/lọc | Chuyển `Danh sách`; search theo SĐT seed; lọc `Đã xác nhận`; `Đặt lại bộ lọc` | Bảng cột `Giờ hẹn/Khách hàng/Thông tin/Nhân viên/Tạm tính/Trạng thái`; kết quả khớp; reset về `/appointments` |
| E2E-APT-003 | Tạo – khách cũ | `Đặt lịch mới`; nhập SĐT khách có sẵn; bấm `Kiểm tra`; chọn dịch vụ; ngày/giờ hợp lệ; `Lưu lịch hẹn` | Toast `Đã tạo lịch hẹn`; dialog đóng; lịch xuất hiện ở danh sách/tuần |
| E2E-APT-004 | Tạo – khách mới | Nhập SĐT chưa có; bấm `Kiểm tra` → `Không tìm thấy khách...`; nhập `Tên khách hàng mới`, dịch vụ, giờ; lưu | Lịch tạo thành công; khách mới được tạo/gắn |
| E2E-APT-005 | Validate tạo lịch | Submit thiếu SĐT; thiếu dịch vụ; thiếu ngày/giờ; giờ kết thúc ≤ bắt đầu | Lần lượt: `Vui lòng nhập số điện thoại khách hàng.`, `Vui lòng chọn ít nhất một dịch vụ.`, `Vui lòng chọn ngày và giờ hẹn hợp lệ.`, `Giờ kết thúc phải sau giờ bắt đầu.` |
| E2E-APT-006 | Drawer chi tiết | Mở lịch từ tuần/danh sách | Drawer `Mã lịch hẹn: {code}`; thông tin khách, dịch vụ, trạng thái; nút `Cập nhật`, `Đổi lịch`, `Hủy lịch`, `Bắt đầu thanh toán` |
| E2E-APT-007 | Đổi lịch | Trên lịch `pending/confirmed`, bấm `Đổi lịch`; chọn ngày/giờ mới; `Xác nhận đổi lịch` | Toast `Đã đổi lịch hẹn`; giờ mới hiển thị |
| E2E-APT-008 | Hủy lịch | Bấm `Hủy lịch`; nhập lý do; `Xác nhận hủy` | Toast `Đã hủy lịch hẹn`; trạng thái `Đã hủy`; nút đổi/hủy bị disable |
| E2E-APT-009 | Chặn thanh toán trạng thái cuối | Mở lịch `completed/cancelled/no_show` | `Bắt đầu thanh toán` disabled + banner lý do |
| E2E-APT-010 | Validate khung giờ | Tạo lịch trong quá khứ; ngoài giờ mở cửa; ngày salon đóng | Message tương ứng: `Không thể đặt lịch trong quá khứ.`, `Giờ hẹn nằm ngoài khung mở cửa ...`, `Salon đóng cửa vào ngày đã chọn.` |

## Orders (`/orders`) + Order detail (`/orders/[id]`)

| Test ID | Scenario | Steps | Expected |
|---|---|---|---|
| E2E-ORD-001 | Danh sách + lọc | Mở `/orders`; lọc `Hoàn tất` → `Đã hủy` → `Đã hoàn tiền`; search mã đơn | Bảng lịch sử lọc đúng; search chỉ theo mã đơn; empty `Không có dữ liệu` |
| E2E-ORD-002 | Chi tiết đơn | Mở đơn từ danh sách | Header `Chi tiết đơn hàng {code}`; bảng dịch vụ/sản phẩm; tổng tiền; sidebar khách + thanh toán |
| E2E-ORD-003 | Hủy đơn | Đơn `pending`/`confirm`, owner bấm `Hủy đơn` → xác nhận | Toast `Đã hủy đơn hàng`; badge `Đã hủy`; giữ chỗ kho được nhả (kiểm tra tồn) |
| E2E-ORD-004 | Hoàn đơn | Đơn `completed`, owner bấm `Hoàn đơn` → xác nhận | Toast `Đã hoàn đơn hàng`; badge `Đã hoàn tiền`; tồn kho cộng lại |
| E2E-ORD-005 | Sửa số lượng dòng | Ở đơn `pending`, tăng/giảm số lượng dòng | Tổng tiền cập nhật; giá trị ≤0 bị từ chối |
| E2E-ORD-006 | Xóa dòng hàng | Bấm xóa dòng không phải cuối cùng → `Xóa dòng` | Dòng biến mất, tổng cập nhật; xóa dòng cuối bị server từ chối |
| E2E-ORD-007 | Cập nhật nhân viên | `Cập nhật nhân viên`, chọn nhân viên, lưu | Toast `Đã lưu nhân viên thực hiện`; phân công hiển thị |
| E2E-ORD-008 | Gắn khách hàng | Đơn chưa có khách, `Tìm / thêm khách`, tìm SĐT, gắn | Toast `Đã gắn khách {name} vào đơn`; sidebar hiện hồ sơ |
| E2E-ORD-009 | Thanh toán chốt đơn | Đơn `pending`, bấm `Thu {remaining}`; chọn phương thức; `Xác nhận thu` | Toast `Thu tiền thành công`; đơn `Hoàn tất`; `Đã thu` = tổng; nút thu biến mất |
| E2E-ORD-010 | Giảm giá vượt mức | Payment dialog, nhập giảm giá > còn thiếu | Client clamp; nếu gửi vượt, server `Giảm giá vượt quá số tiền còn thiếu`, đơn không chốt |

## Cashier (`/cashier`)

| Test ID | Scenario | Steps | Expected |
|---|---|---|---|
| E2E-CSH-001 | Đơn cần xử lý | Tạo đơn `pending`; mở `/cashier` | Card đơn hiện mã/khách/tổng; filter `Chờ xử lý/Đã xác nhận/Đang giao` đúng; nút `Chi tiết`, `Thu tiền ngay` → order detail |
| E2E-CSH-002 | Trạng thái rỗng | Không có đơn active (hoặc filter không khớp) | `Không có đơn cần xử lý` + `Thử đổi bộ lọc...`; CTA `Tạo đơn mới` |

## POS (`/cashier/pos`)

| Test ID | Scenario | Steps | Expected |
|---|---|---|---|
| E2E-POS-001 | Tạo đơn mới | Mở POS; thêm 1 dịch vụ + 1 sản phẩm từ catalog; `Tạo đơn` | Toast `Tạo đơn thành công`; redirect `/cashier`; đơn xuất hiện với tổng đúng |
| E2E-POS-002 | Khách mới | Trong POS nhập SĐT + tên khách mới; tạo đơn | Khách được tạo/gắn; toast success; đơn có khách |
| E2E-POS-003 | Khách cũ | Nhập SĐT khách seed, `Tìm` | Panel hiện khách; tạo đơn gắn đúng khách |
| E2E-POS-004 | Sửa giỏ | Thêm món, tăng/giảm số lượng, xóa món, `Hủy đơn` | Tạm tính đúng; SL min 1; `Hủy đơn` xóa giỏ client (không gọi API) |
| E2E-POS-005 | Tạo từ lịch hẹn | Mở `/cashier/pos?appointmentId={id}` của lịch `confirmed` | Banner `Tạo đơn từ lịch hẹn {code}`; tạo đơn thành công; lịch chuyển trạng thái phục vụ |
| E2E-POS-006 | Chế độ sửa đơn | Mở `/cashier/pos?orderId={id}` đơn `pending`; thêm món; `Thêm vào đơn` | Toast `Thêm món thành công`; đơn cập nhật, không redirect |

## Customers (`/customers`)

| Test ID | Scenario | Steps | Expected |
|---|---|---|---|
| E2E-CUS-001 | Danh sách + tìm | Mở `/customers`; search tên/SĐT | Bảng cột đúng; kết quả khớp; `Đặt lại bộ lọc` reset |
| E2E-CUS-002 | Tạo khách | `Thêm khách hàng`; nhập họ tên + SĐT + giới tính; lưu | Toast `Tạo khách hàng thành công`; khách xuất hiện đầu danh sách |
| E2E-CUS-003 | Sửa khách | Mở drawer → `Chỉnh sửa hồ sơ`; đổi tên/ghi chú; lưu | Toast `Cập nhật khách hàng thành công`; dữ liệu cập nhật |
| E2E-CUS-004 | Validate khách | Submit thiếu tên/SĐT | `Vui lòng nhập họ tên và số điện thoại` |
| E2E-CUS-005 | Drawer hồ sơ | Mở drawer khách có đơn | Stats lần ghé/tổng chi/điểm; `Lịch sử đơn hàng gần đây` hiện đơn thật; block lịch hẹn gắn nhãn `(mock tạm)` |

## Products (`/products`) — P1

| Test ID | Scenario | Expected |
|---|---|---|
| E2E-PRD-001 | Danh sách + lọc | Lọc danh mục/trạng thái/sort; search SKU; bảng + stats render |
| E2E-PRD-002 | Tạo sản phẩm | `Thêm sản phẩm`; nhập SKU, tên, giá; lưu → toast `Tạo sản phẩm thành công`, xuất hiện trong bảng |
| E2E-PRD-003 | Sửa sản phẩm | Drawer → `Chỉnh sửa`; đổi giá bán; lưu → `Cập nhật sản phẩm thành công` |
| E2E-PRD-004 | Validate sản phẩm | Bỏ trống SKU/tên → `Vui lòng nhập SKU và tên sản phẩm` |

## Services (`/services`) — P1

| Test ID | Scenario | Expected |
|---|---|---|
| E2E-SVC-001 | Danh sách + lọc | Lọc danh mục/trạng thái/sort; search tên |
| E2E-SVC-002 | Tạo dịch vụ | Nhập tên/thời lượng/giá → `Tạo dịch vụ thành công` |
| E2E-SVC-003 | Định mức vật tư | Drawer → `Chỉnh sửa` vật tư, thêm dòng, lưu → `Đã lưu định mức vật tư` |
| E2E-SVC-004 | Validate dịch vụ | Thiếu tên/thời lượng/giá → `Vui lòng nhập tên, thời lượng và giá` |

## Categories (`/categories`) — P1

| Test ID | Scenario | Expected |
|---|---|---|
| E2E-CAT-001 | Tab + tạo | Chuyển tab `Danh mục Dịch vụ`/`Sản phẩm`; `Thêm danh mục` → `Tạo danh mục thành công` |
| E2E-CAT-002 | Sửa | Card `Chỉnh sửa` → đổi tên → `Cập nhật danh mục thành công` |
| E2E-CAT-003 | Xóa | Card `Xóa` → dialog `Xóa danh mục` → xác nhận → `Đã xóa danh mục` |
| E2E-CAT-004 | Toggle active | Detail panel bật/tắt switch → toast `Đã kích hoạt danh mục`/`Đã tạm ẩn danh mục` |

## Inventory (`/inventory`, inbound, outbound, detail)

| Test ID | Scenario | Expected |
|---|---|---|
| E2E-INV-001 | Danh sách + stats | 4 stats từ API; bảng SKU; filter danh mục/trạng thái/sort; `Xem lịch sử` scroll tới bảng lịch sử |
| E2E-INV-002 | Lịch sử phiếu | Lọc loại phiếu/công nợ/sort; search mã phiếu; click mã → detail |
| E2E-INV-003 | Tạo phiếu nhập | Thêm sản phẩm, nhập SL/giá/chiết khấu, chọn NCC, trả tiền, chọn quỹ → `Tạo phiếu thành công`; tồn tăng |
| E2E-INV-004 | Validate phiếu nhập | Không sản phẩm; thiếu mã; SL ≤0; trả > tổng; thiếu quỹ → message tương ứng |
| E2E-INV-005 | Tạo phiếu xuất | Thêm sản phẩm ≤ tồn, lý do → `Tạo phiếu thành công`; tồn giảm |
| E2E-INV-006 | Xuất vượt tồn | Nhập SL > tồn → `Phiếu xuất vượt tồn kho: ...` |
| E2E-INV-007 | Chi tiết + công nợ | Mở detail phiếu nhập có nợ; thấy `Công nợ nhà cung cấp`, `Còn nợ`, lịch sử thanh toán |
| E2E-INV-008 | Thanh toán công nợ | `Thanh toán công nợ`, nhập tiền + quỹ → `Đã ghi nhận thanh toán`; còn nợ giảm |

## Cashflow (`/cashflow`) — P1

| Test ID | Scenario | Expected |
|---|---|---|
| E2E-CFL-001 | Stats + chart | 4 card `Tổng Thu/Tổng Chi/Chi Ngoài P&L/Tồn Quỹ Khả Dụng`; chart `Biểu đồ Dòng tiền 7 ngày qua`; pie `Tỷ trọng Chi phí` |
| E2E-CFL-002 | Tạo phiếu thu | `Thêm phiếu`; `Phiếu thu`, số tiền, quỹ, danh mục, diễn giải → `Tạo phiếu thành công`; trạng thái `Chờ duyệt` |
| E2E-CFL-003 | Validate phiếu | Thiếu quỹ / số tiền ≤0 / ngày sai → message tương ứng |
| E2E-CFL-004 | Duyệt phiếu | Pending → `Duyệt phiếu` → xác nhận → `Duyệt phiếu thành công`; số dư quỹ cập nhật theo thu/chi |
| E2E-CFL-005 | Tạo quỹ | `Cài đặt` (stats) → `Tạo quỹ mới`, nhập mã/tên/loại/số dư đầu kỳ → `Tạo quỹ thành công` |
| E2E-CFL-006 | Bộ lọc | Search mã/nội dung; lọc kind/category/sort; footer tổng trang và chênh lệch ròng |

## Staff (`/staff`, `/staff/[id]`) — P1

| Test ID | Scenario | Expected |
|---|---|---|
| E2E-STF-001 | Danh sách + lọc | Search tên/SĐT; lọc trạng thái/sort; bảng cột đúng |
| E2E-STF-002 | Tạo nhân viên | Nhập họ tên/SĐT/vị trí/lương/hoa hồng → `Tạo nhân viên thành công` |
| E2E-STF-003 | Validate nhân viên | Thiếu tên/SĐT/vị trí → `Vui lòng nhập họ tên, số điện thoại và vị trí`; hoa hồng ngoài 0–100 → message |
| E2E-STF-004 | Sửa thông tin chung | Tab `Thông tin chung`, đổi tên/trạng thái, `Lưu thay đổi` → `Cập nhật nhân viên thành công` |
| E2E-STF-005 · owner | Chốt lương | Tab `Bảng lương`, chọn kỳ, `Chốt lương` → xác nhận → `Đã chốt lương`; trạng thái `ĐÃ CHỐT` |
| E2E-STF-006 · owner | Thưởng/phạt | Tab `Lịch sử Thưởng/Phạt`, `Thêm thưởng phạt`, tạo → toast; hủy khoản chưa chốt → `Đã hủy khoản điều chỉnh` |
| E2E-STF-007 | Thêm ngày nghỉ | Tab `Ngày nghỉ & Ca`, `Thêm ngày nghỉ`, chọn khoảng ngày/loại → `Đã thêm ngày nghỉ` |
| E2E-STF-008 · BLOCKED | Tạm ứng (mock) | Tab `Bảng lương` → `Tạm ứng`, nhập tiền, `Ghi nhận tạm ứng` → toast `Chưa kết nối API tạm ứng`. Không có API thật |

## Settings (`/settings/*`) — P2

| Test ID | Scenario | Expected |
|---|---|---|
| E2E-SET-001 | Cửa hàng lưu | `/settings/general` load `Đã kết nối`; sửa tên hotline; `Lưu thay đổi` → `Đã lưu cài đặt chung`; reload giữ dữ liệu |
| E2E-SET-002 | Validate cửa hàng | Email sai; giờ đóng < mở; bỏ hết ngày → message tương ứng; nút Lưu disabled |
| E2E-SET-003 | Lịch hẹn lưu | `/settings/booking` đổi bước thời gian/toggle → `Đã lưu cài đặt lịch hẹn` |
| E2E-SET-004 | Thanh toán | `/settings/payment` tắt hết phương thức → banner `Vui lòng bật ít nhất một phương thức thanh toán.`; bật lại lưu thành công |
| E2E-SET-005 · BLOCKED partial | Tài chính & Quỹ | Danh mục thu chi từ API; toggle `Yêu cầu kiểm két cuối ca` chỉ localStorage. Assert UI + reload giữ toggle, **không** assert server |
| E2E-SET-006 | Thông báo | `/settings/notifications` đổi ngưỡng/giờ → `Đã lưu cấu hình thông báo` |
| E2E-SET-007 | CRM coming soon | `/settings/crm` → `ComingSoonSection` + link `Tài chính & Quỹ` |

## Reports (`/reports`) — P2

| Test ID | Scenario | Expected |
|---|---|---|
| E2E-RPT-001 | Load báo cáo | 4 KPI `Tổng doanh thu/Lợi nhuận thuần/Chi phí vận hành/Tỷ suất lợi nhuận`; chart, cơ cấu, phân rã, top 5 |
| E2E-RPT-002 | Lọc khoảng ngày | Chọn range → URL `date_from/date_to` cập nhật; số liệu gọi lại API |
| E2E-RPT-003 | Xuất CSV | Bấm `Xuất CSV` → tải file `bao-cao-doanh-thu_...csv` có BOM + dòng tiêu đề |
| E2E-RPT-004 | Lỗi + retry | Chặn `/reports/revenue` 500 → `Không tải được báo cáo doanh thu` + `Thử lại` |

## RBAC (cross-cutting) — P0

| Test ID | Scenario | Expected |
|---|---|---|
| E2E-RBAC-001 | Receptionist route chặn | Login receptionist, mở lần lượt `/settings/general`, `/reports`, `/inventory/inbound`, `/inventory/outbound`, `/staff` | Mỗi route hiện `Không có quyền truy cập`; bấm `Về trang tổng quan` → `/overview` |
| E2E-RBAC-002 | Manager payroll | Login manager, mở `/staff/{id}` | Không thấy tab `Bảng lương` và `Lịch sử Thưởng/Phạt`; owner thì thấy |
| E2E-RBAC-003 | Receptionist cashflow | Receptionist mở `/cashflow` | Thấy `Thêm phiếu` (cashflow:create); không thấy nút `Duyệt phiếu`, `Cài đặt` (cashflow:write) |
| E2E-RBAC-004 | Receptionist catalog | Mở `/products`, `/services`, `/categories` | Không thấy `Thêm sản phẩm`/`Thêm dịch vụ`/`Thêm danh mục`; drawer không có `Chỉnh sửa` |
| E2E-RBAC-005 | Sidebar visibility | So sánh sidebar 3 role | Receptionist không thấy `Báo cáo`, `Cài đặt salon`; owner/manager thấy; route bị chặn vẫn hiện `Nhân viên/Kho hàng` với receptionist |

---

## Testing Decisions

- Chỉ test **external behavior** qua UI/HTTP, không assert implementation (state nội bộ, tên component).
- Ưu tiên helper fixture gọi API để tạo precondition; UI chỉ dùng cho hành vi đang kiểm.
- Assert theo **delta** và theo dữ liệu test vừa tạo, không dựa vào số seed tuyệt đối.
- **Không** assert toast lỗi/info (component hiện chỉ render success). Dùng inline error.
- Test chạy **song song được** nhờ suffix dữ liệu; test phụ thuộc thứ tự (vd approval) đánh dấu `serial`.
- **Mock/blocked** phải được đánh dấu rõ; không giả vờ là E2E thật.

### Known gaps ảnh hưởng test (ghi nhận, không sửa trong plan này)

- Toast error/info không render → không dùng làm oracle.
- `/orders` stats mock; `/orders` search chỉ theo mã đơn dù placeholder nói tên/SĐT.
- Appointments/orders `Xuất Excel`, inventory `In phiếu`, cashflow `Xuất CSV` là no-op.
- Sidebar `Đặt lịch mới`, header Bell/Help/Profile là no-op.
- Settings `settings:write`, staff `staff:delete`, `customer:delete` khai báo nhưng không dùng.
- Reports `reports:profit-view` không được enforce trên `/reports`.
- Staff advance là mock; settings finance toggle là localStorage; product drawer lịch sử kho mock; customer drawer lịch hẹn mock.

## Out of Scope

- Unit/component test, visual regression, accessibility audit chuyên sâu.
- Load/performance testing.
- Cross-browser matrix đầy đủ (plan chạy Chromium mặc định; mở rộng Firefox/WebKit ở ticket riêng nếu cần).
- Mobile responsive (sidebar ẩn trên mobile) — chỉ smoke tối thiểu nếu bổ sung.
- Booking flow phía khách/subdomain động (hiện trả `Not Found`).
- Tích hợp thật SMS/Zalo/Email/thanh toán online.
- Sửa bug sản phẩm; plan chỉ ghi nhận known gaps.

## Further Notes

- Đã có ticket **prefactor 00** thêm `data-testid` cho các element thiếu text ổn định (icon buttons: `Đổi lịch`, `Hủy lịch`, inline quantity, toggle, ô số lượng). Ticket này block các test 25, 26, 27, 34, 35, 45, 59, 64, 90, 91, 92.
- Ưu tiên chạy P0 trên mỗi PR để giữ vòng phản hồi ngắn; P1/P2 nightly.
- Khi backend thay đổi envelope API, cập nhật fixture trước khi cập nhật assertion.
