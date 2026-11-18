# syntax=docker/dockerfile:1

# ==========================================
# GIAI ĐOẠN 1: Cài đặt thư viện (Dependencies)
# ==========================================
FROM node:22-alpine AS deps
WORKDIR /app

# Copy file khai báo thư viện trước để tận dụng Docker Layer Cache
COPY package.json package-lock.json* ./
# Cài đặt chính xác phiên bản trong package-lock.json
RUN npm ci

# ==========================================
# GIAI ĐOẠN 2: Biên dịch mã nguồn (Builder)
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

# Lấy node_modules đã cài ở giai đoạn 1 sang
COPY --from=deps /app/node_modules ./node_modules
# Copy toàn bộ mã nguồn dự án vào container
COPY . .

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_API_VERSION=v1
ARG NEXT_PUBLIC_APP_SUBDOMAIN=app

# Giá trị theo tên miền thật truyền từ GitHub Actions lúc build
ARG NEXT_PUBLIC_ROOT_DOMAIN
ARG NEXT_PUBLIC_APP_URL
ARG API_PROXY_TARGET

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_VERSION=$NEXT_PUBLIC_API_VERSION
ENV NEXT_PUBLIC_APP_SUBDOMAIN=$NEXT_PUBLIC_APP_SUBDOMAIN
ENV NEXT_PUBLIC_ROOT_DOMAIN=$NEXT_PUBLIC_ROOT_DOMAIN
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV API_PROXY_TARGET=$API_PROXY_TARGET

# Tắt gửi dữ liệu thống kê ẩn danh về Vercel và tiến hành build bản standalone
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ==========================================
# GIAI ĐOẠN 3: Môi trường chạy thực tế (Runner)
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

# Thiết lập môi trường production và mở lắng nghe trên toàn bộ network interface
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Tạo group và user hệ thống không có quyền root ngay tại stage runner
RUN addgroup -S -g 10001 app \
    && adduser -S -u 10001 -G app app

COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/static ./.next/static

# Chuyển sang chạy bằng user thường (bảo mật)
USER app

# Khai báo cổng mặc định mà container sử dụng
EXPOSE 3000

# Khởi chạy web server Next.js standalone
CMD ["node", "server.js"]