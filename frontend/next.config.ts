import type { NextConfig } from "next";

// A script-src policy needs per-request nonces for Next's inline bootstrap scripts, so the CSP
// here is limited to directives that are safe without them.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    // Same-origin API proxy: the browser talks to /api, Next forwards to the
    // .NET API (Fly private network in production, localhost in development).
    const api = process.env.API_INTERNAL_URL ?? "http://localhost:8080";
    return [{ source: "/api/:path*", destination: `${api}/:path*` }];
  },
};

export default nextConfig;
