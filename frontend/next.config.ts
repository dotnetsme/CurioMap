import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: { unoptimized: true },
  async rewrites() {
    // Same-origin API proxy: the browser talks to /api, Next forwards to the
    // .NET API (Fly private network in production, localhost in development).
    const api = process.env.API_INTERNAL_URL ?? "http://localhost:8080";
    return [{ source: "/api/:path*", destination: `${api}/:path*` }];
  },
};

export default nextConfig;
