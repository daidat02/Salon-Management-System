import type { NextConfig } from "next";

const apiProxyTarget = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  async rewrites() {
    // Production: reverse proxy xử lý /api -> backend Go, Next không cần rewrite.
    // Dev: Next proxy /api -> Go. Có thể override bằng API_PROXY_TARGET.
    if (process.env.NODE_ENV === "production" && !apiProxyTarget) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget ?? "http://localhost:8080"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
