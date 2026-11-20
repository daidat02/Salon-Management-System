# Salon Management System

![CI](https://github.com/daidat02/Salon-Management-System/actions/workflows/ci.yml/badge.svg?branch=main)
![CD](https://github.com/daidat02/Salon-Management-System/actions/workflows/cd.yml/badge.svg?branch=main)
![Go](https://img.shields.io/badge/Go-1.27-00ADD8?logo=go&logoColor=white)
![Gin](https://img.shields.io/badge/Gin-REST_API-008ECF?logo=gin&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-Reverse_Proxy-009639?logo=nginx&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-EC2-FF9900?logo=amazonaws&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT_+_Refresh_Rotation-000000?logo=jsonwebtokens&logoColor=white)

**Salon Management System** là nền tảng quản trị salon tóc & spa, hợp nhất lịch hẹn, POS/đơn hàng, kho – vật tư, thu chi và bảng lương trong một hệ thống duy nhất. Backend Go theo Clean Architecture, frontend Next.js App Router, triển khai thật trên AWS EC2 sau Cloudflare + Nginx.

Dữ liệu được cô lập theo `organization_id` ngay từ đầu và **luôn lấy từ JWT** thay vì body request — sẵn sàng mở rộng multi-tenant mà không phải thiết kế lại CSDL.

## Mục lục

1. [Live Demo](#live-demo)
2. [Ảnh chụp màn hình](#ảnh-chụp-màn-hình)
3. [Tính năng nổi bật](#tính-năng-nổi-bật)
4. [Kiến trúc hệ thống & triển khai](#kiến-trúc-hệ-thống--triển-khai)
5. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
6. [Thiết kế cơ sở dữ liệu](#thiết-kế-cơ-sở-dữ-liệu)
7. [Hướng dẫn cài đặt & chạy local](#hướng-dẫn-cài-đặt--chạy-local)
8. [Quy trình CI/CD](#quy-trình-cicd)
9. [Phạm vi & hướng phát triển](#phạm-vi--hướng-phát-triển)

## Live Demo

| Mục               | Đường dẫn                |
| ----------------- | ------------------------ |
| Landing page      | https://vietops.site     |
| Ứng dụng quản trị | https://app.vietops.site |
| Health check      | https://vietops.site/api/health |

Tài khoản demo local sau khi chạy `client/e2e/support/provision.sh`:

| Vai trò      | Số điện thoại | Mật khẩu       |
| ------------ | ------------- | -------------- |
| Owner        | `0900000001`  | `E2ePassw0rd!` |
| Manager      | `0900000002`  | `E2ePassw0rd!` |
| Receptionist | `0900000003`  | `E2ePassw0rd!` |

## Ảnh chụp màn hình

| Tổng quan                                      | Lịch hẹn                                          |
| ---------------------------------------------- | ------------------------------------------------- |
| ![Tổng quan](docs/screenshots/02-overview.png) | ![Lịch hẹn](docs/screenshots/03-appointments.png) |

| Thu ngân (POS)                               | Quản lý kho                                    |
| -------------------------------------------- | ---------------------------------------------- |
| ![Thu ngân](docs/screenshots/04-cashier.png) | ![Kho hàng](docs/screenshots/05-inventory.png) |

| Thu chi                                      | Báo cáo doanh thu                           |
| -------------------------------------------- | ------------------------------------------- |
| ![Thu chi](docs/screenshots/06-cashflow.png) | ![Báo cáo](docs/screenshots/07-reports.png) |

## Tính năng nổi bật

### Nền tảng & phân quyền

- **Tenant context an toàn** — mọi bảng nghiệp vụ đều có `organization_id`; API lấy org từ JWT claim, không nhận từ body/query, nên không thể đọc chéo dữ liệu salon khác.
- **RBAC 3 vai trò** — `owner` toàn quyền (lương, refund, xóa nhân sự), `manager` quản lý danh mục/kho/nhân sự/duyệt thu chi, `receptionist` đặt lịch, bán hàng và chăm sóc khách.
- **Xác thực JWT + Refresh Token Rotation** — access token ngắn hạn, refresh token lưu hash trong DB, xoay vòng mỗi lần refresh, phát hiện reuse và thu hồi cả token family; refresh cookie `httpOnly`.

### Nghiệp vụ cốt lõi

- **Lịch hẹn** — tạo lịch theo khung giờ, lịch tuần, tìm-hoặc-tạo khách theo số điện thoại (chống race bằng unique + retry), đổi lịch, hủy, chuyển trạng thái, gán nhân viên.
- **POS & đơn hàng** — thêm/sửa/xóa dòng hàng, gán nhân viên theo từng item, server tự tính subtotal/total, khởi tạo & xác nhận thanh toán, hoàn tất/hủy/refund, in phiếu bán hàng.
- **Kho & vật tư** — nhà cung cấp, phiếu nhập/xuất, thanh toán phiếu nhập, sổ cái `inventory_transactions`, cảnh báo sắp hết hàng, định mức vật tư tiêu hao theo từng dịch vụ.
- **Tài chính** — quỹ tiền mặt, danh mục thu chi, luồng duyệt thu chi (owner/manager), thống kê dòng tiền.
- **Nhân sự & lương** — chấm công, nghỉ phép, hoa hồng theo doanh số, phụ cấp/điều chỉnh lương, tạo bảng lương nháp theo kỳ.
- **Báo cáo & cấu hình** — dashboard tổng quan, báo cáo doanh thu, cấu hình đặt lịch, thông báo, thanh toán, mẫu hoá đơn và phương thức thanh toán.

### Tính nhất quán dữ liệu

- **Transaction cho nghiệp vụ nhiều bảng** — hoàn tất đơn hàng gói đồng thời: cập nhật trạng thái đơn, ghi payment, trừ tồn kho (`inventory_transactions`), ghi thu chi và cập nhật quỹ. Lỗi ở bất kỳ bước nào → rollback toàn bộ.
- **Tiền tệ & thời gian chuẩn** — tiền dùng `numeric`, thời gian dùng `timestamptz`; báo cáo nhóm theo `AT TIME ZONE 'Asia/Ho_Chi_Minh'` để không lệch ngày do UTC.

## Kiến trúc hệ thống & triển khai

```mermaid
flowchart LR
    U["Trình duyệt<br/>Next.js App Router"] -->|HTTPS| CF["Cloudflare<br/>DNS / SSL"]
    CF --> NG["Nginx Reverse Proxy<br/>Let's Encrypt"]

    subgraph EC2["AWS EC2 · Docker Compose"]
        NG -->|"/"| WEB["salon-client<br/>Next.js standalone :3000"]
        NG -->|"/api/*"| API["salon-server<br/>Go Gin :8080"]
        API --> PG[("PostgreSQL 16")]
        MIG["migrate job<br/>golang-migrate"] --> PG
    end

    API -.->|tuỳ chọn| R2[("Cloudflare R2")]
    GH["GitHub Actions"] -->|build & push| GHCR[("GHCR")]
    GH -->|SSH deploy| EC2
    EC2 -->|pull image| GHCR
```

- **Same-origin**: frontend và backend cùng domain — `/api/*` vào Go, phần còn lại vào Next.js. Nhờ vậy cookie `httpOnly` hoạt động an toàn, không cần CORS phức tạp ở production.
- **TLS** do Cloudflare + Nginx đảm nhận; container backend/frontend chạy bằng user non-root (UID 10001) và có `HEALTHCHECK`.
- **Migration** chạy như một job riêng trong compose, chờ PostgreSQL healthy rồi mới `up` schema trước khi API khởi động.

### Cấu trúc Backend (Clean Architecture)

```text
server/
├── cmd/                          # main.go + wire.go (Gin bootstrap, DI thủ công)
├── configs/                      # nạp cấu hình từ .env
├── migrations/                   # golang-migrate up/down
├── docs/                         # Swagger API
├── internal/
│   ├── domain/<module>/          # entity + validate + DTO + repository interface
│   ├── usecase/<module>/         # nghiệp vụ, điều phối transaction, tạo AppError
│   ├── delivery/http/<module>/   # handler + router + dependencies
│   └── infrastructure/postgres/  # query + repository (pgx/v5)
└── pkg/                          # apperror, response, pagination, utils, database
```

Luồng lỗi một chiều: repository trả lỗi raw → usecase bọc thành `*AppError` đúng **một lần** → `response.Error` chỉ trả `{code, message}`. Handler không tự đoán HTTP status, giúp API nhất quán và dễ test.

## Công nghệ sử dụng

| Nhóm         | Công nghệ                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**  | Go 1.27, Gin, pgx/v5, JWT (access + refresh rotation), bcrypt, Swagger                                                            |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, TanStack Query, Redux Toolkit + redux-persist, Tailwind CSS 4, shadcn/ui, Recharts |
| **Database** | PostgreSQL 16, golang-migrate (up/down), index & constraint ở tầng DB                                                             |
| **Hạ tầng**  | Docker multi-stage, Docker Compose, Nginx, AWS EC2, Cloudflare (DNS/SSL), Let's Encrypt                                           |
| **CI/CD**    | GitHub Actions, Playwright E2E, GHCR (GitHub Container Registry), SSH deploy                                                      |
| **Lưu trữ**  | Cloudflare R2 (S3-compatible, tuỳ chọn)                                                                                           |

## Thiết kế cơ sở dữ liệu

Schema gồm **35 bảng**, chia theo nhóm: tổ chức & người dùng, khách hàng & nhân sự, danh mục/dịch vụ/sản phẩm, lịch hẹn, đơn hàng & thanh toán, kho, thu chi, lương/chấm công, cấu hình salon.

```mermaid
erDiagram
    organizations ||--o{ users : has
    organizations ||--o{ customers : owns
    organizations ||--o{ staff : employs
    organizations ||--o{ services : offers
    organizations ||--o{ products : stocks
    organizations ||--o{ appointments : receives
    organizations ||--o{ orders : records

    appointments ||--o{ appointment_items : contains
    appointments ||--o| orders : converts_to

    orders ||--o{ order_items : contains
    orders ||--o{ payments : paid_by
    order_items ||--o{ order_item_materials : consumes
    order_items ||--o{ order_item_staff : served_by

    services ||--o{ service_materials : requires
    products ||--o{ service_materials : used_in
    products ||--o{ inventory_transactions : moves

    staff ||--o{ payrolls : receives
    organizations ||--o{ cash_flows : tracks
    organizations ||--o{ funds : holds
```

**Các quyết định thiết kế đáng chú ý**

- **Cô lập tenant**: `organization_id` có mặt trên toàn bộ bảng nghiệp vụ; mọi câu query đều filter theo org lấy từ context. Đây là nền tảng để chuyển sang multi-tenant thật khi cần.
- **Transaction khi bán hàng**: `CompleteOrderWithSlip` chạy trong một transaction gồm cập nhật đơn, ghi `payments`, trừ kho qua `inventory_transactions`, tạo `cash_flows` và cập nhật `funds`. Tồn kho không bao giờ bị trừ nửa chừng.
- **Định mức vật tư**: `service_materials` lưu lượng tiêu hao theo đơn vị tính; khi bán dịch vụ, hệ thống quy đổi và trừ kho tương ứng.
- **Múi giờ**: `organizations.timezone` mặc định `Asia/Ho_Chi_Minh`; lưu `timestamptz`, hiển thị/nhóm báo cáo theo timezone salon nên không lệch ngày.
- **Xóa mềm** cho `users`, `customers`, `staff` (giữ lịch sử giao dịch); xóa cứng cho danh mục/dịch vụ/sản phẩm với FK `SET NULL`/`CASCADE` hợp lý.

## Hướng dẫn cài đặt & chạy local

### Yêu cầu

- Go ≥ 1.27
- Node.js ≥ 20 (CI dùng Node 22)
- Docker + Docker Compose
- `golang-migrate` CLI (hoặc dùng job migrate trong Docker)

### 1. Clone & cấu hình môi trường

```bash
git clone https://github.com/daidat02/Salon-Management-System.git
cd Salon-Management-System

cp server/.env.example server/.env
cp client/.env.example client/.env
```

Các biến quan trọng:

| Biến                                                | Ý nghĩa                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `DB_URL`                                            | Chuỗi kết nối PostgreSQL, ví dụ `postgres://postgres:postgres@localhost:5432/salon_db?sslmode=disable` |
| `JWT_SECRET`                                        | Khoá ký JWT, tối thiểu 32 ký tự, **không commit**                                                      |
| `ACCESS_TOKEN_EXPIRE` / `REFRESH_TOKEN_EXPIRE`      | Thời hạn access token / refresh token                                                                  |
| `REFRESH_COOKIE_SECURE` / `REFRESH_COOKIE_SAMESITE` | Thuộc tính cookie refresh token (production: `true` / `lax`)                                           |
| `CORS_ALLOWED_ORIGINS`                              | Danh sách origin frontend được phép                                                                    |
| `R2_*`                                              | Tuỳ chọn — chỉ cần khi dùng Cloudflare R2                                                              |
| `NEXT_PUBLIC_API_URL` / `API_PROXY_TARGET`          | Đường dẫn API và đích rewrite `/api` của Next.js                                                       |

### 2. Khởi chạy database & migration

```bash
cd server
docker compose up -d          # PostgreSQL :5432 (+ Adminer :8081)
make migrate-up               # golang-migrate up
```

### 3. Chạy backend

```bash
cd server
make tidy                     # go mod tidy
make run                      # API → http://localhost:8080
# hoặc: make dev              # hot-reload bằng air
```

Swagger: http://localhost:8080/api/swagger/index.html · Health: http://localhost:8080/api/health

### 4. Chạy frontend

```bash
cd client
npm install
npm run dev                   # http://app.localhost:3000
```

> Next.js dùng subdomain `app.localhost`; thêm `127.0.0.1 app.localhost` vào `/etc/hosts` nếu trình duyệt chưa resolve.

### 5. Tạo dữ liệu & tài khoản demo

Đăng ký salon mới tại `/register`, hoặc provision nhanh 3 vai trò cho môi trường local:

```bash
cd client
E2E_DB_URL='postgres://postgres:postgres@localhost:5432/salon_db?sslmode=disable' \
  bash e2e/support/provision.sh
```

Lệnh hữu ích khác (trong `server/`): `make test`, `make lint`, `make swagger`, `make migrate-down`, `make migrate-create name=ten_bang`.

## Quy trình CI/CD

```mermaid
flowchart LR
    P["Push / PR"] --> CI["CI: go vet + usecase tests<br/>typecheck + ESLint + Playwright"]
    CI -->|pass trên main| CD["CD: build multi-stage Docker"]
    CD --> IMG["Push image :latest + :sha<br/>lên GHCR"]
    IMG --> SCP["SCP compose + nginx config<br/>sang EC2"]
    SCP --> SSH["SSH EC2: pull image<br/>chạy migrate → up -d → reload nginx"]
```

- **CI** (`.github/workflows/ci.yml`) chạy trên push/PR vào `dev`/`main` và nightly: `go vet` + test usecase, `tsc --noEmit` + ESLint, rồi Playwright smoke với PostgreSQL service. Nightly/manual chạy full E2E suite; report được upload làm artifact.
- **CD** (`.github/workflows/cd.yml`) chỉ chạy sau khi workflow CI thành công trên `main` (`workflow_run`). Build multi-stage image cho server và client, push lên GHCR với tag `latest` + commit SHA, sau đó:
  1. SCP `docker-compose.prod.yml` và template Nginx sang EC2;
  2. SSH vào EC2, ghi `.env.prod` từ GitHub Secret;
  3. `docker compose pull` → chạy job migration → `up -d --remove-orphans`;
  4. recreate Nginx để nạp config mới và prune image cũ.

Có thể trigger deploy thủ công bằng `workflow_dispatch` (chọn `all`/`server`/`client`, bật/tắt migration).

### Kiểm thử

```bash
cd server && make lint && make test
cd client && npm run typecheck && npm run lint
cd client && npm run test:e2e:smoke      # cần backend + DB đang chạy
```

## Phạm vi & hướng phát triển

Dự án hiện tối ưu cho **một salon** nhưng giữ `organization_id` trên toàn bộ schema để mở rộng multi-tenant. Các hạng mục tiếp theo:

- Chặn trùng lịch hẹn ở tầng DB (EXCLUDE constraint + kiểm tra giao khung giờ trong transaction).
- Gửi thông báo tự động (nhắc lịch, no-show, xác nhận thanh toán).
- Audit log / outbox cho thao tác nhạy cảm.
- Diễn tập backup–restore và bổ sung observability (metrics, tracing).
- Public booking API cho khách tự đặt lịch.

## Liên hệ / Tác giả

- **Tên:** Đại Đạt
- **Email:** daidat01@gmail.com
- **GitHub:** [github.com/daidat02](https://github.com/daidat02)
- **Repository:** [Salon-Management-System](https://github.com/daidat02/Salon-Management-System)
