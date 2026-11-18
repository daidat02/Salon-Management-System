# syntax=docker/dockerfile:1

# ==========================================
# GIAI ĐOẠN 1: Biên dịch công cụ Migration
# ==========================================
FROM golang:1.27-alpine AS migrate-builder
# Khai báo phiên bản golang-migrate (có thể ghi đè lúc build bằng --build-arg)
ARG MIGRATE_VERSION=v4.18.1
# Cài git (cần để tải module), tạo thư mục /out và biên dịch CLI migrate chỉ hỗ trợ driver postgres
RUN apk add --no-cache git \
    && mkdir -p /out \
    && GOBIN=/out go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@${MIGRATE_VERSION}

# ==========================================
# GIAI ĐOẠN 2: Biên dịch mã nguồn Go Server
# ==========================================
FROM golang:1.27-alpine AS builder
WORKDIR /src

# Copy go.mod và go.sum trước để Docker cache lại bước tải thư viện nếu file không đổi
COPY go.mod go.sum ./
RUN go mod download

# Copy toàn bộ mã nguồn vào thư mục /src
COPY . .

# Biên dịch ra 1 file binary độc lập (CGO_ENABLED=0), xóa đường dẫn máy local (-trimpath)
# và loại bỏ debug symbol (-ldflags="-s -w") để giảm dung lượng file thực thi
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd

# ==========================================
# GIAI ĐOẠN 3: Môi trường chạy thực tế (Runtime)
# ==========================================
FROM alpine:3.20 AS runtime

# Cài chứng chỉ SSL gốc (ca-certificates) để gọi HTTPS bên ngoài, gói múi giờ (tzdata)
# và tạo group/user hệ thống non-root (UID/GID 10001) để chạy ứng dụng an toàn
RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S -g 10001 app \
    && adduser -S -u 10001 -G app app

WORKDIR /app

# Lấy 2 file binary đã biên dịch từ 2 stage trên và copy thư mục chứa các file SQL migration
COPY --from=builder /out/server /app/server
COPY --from=migrate-builder /out/migrate /app/migrate
COPY --chown=app:app migrations /app/migrations

# Thiết lập biến môi trường mặc định cho production (tắt Swagger/debug log, đặt múi giờ VN)
ENV APP_ENV=production \
    APP_PORT=8080 \
    GIN_MODE=release \
    TZ=Asia/Ho_Chi_Minh

# Chuyển sang chạy container dưới quyền user thường thay vì root
USER app

# Khai báo cổng mặc định của backend
EXPOSE 8080

# Kiểm tra sức khỏe container mỗi 30s bằng cách gọi endpoint /health nội bộ
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health >/dev/null 2>&1 || exit 1

# Lệnh mặc định khởi chạy Go server khi container bật lên
CMD ["/app/server"]