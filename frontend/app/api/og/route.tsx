import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get("title") || "A Live Map of Human Curiosity";
    const subtitle =
      searchParams.get("subtitle") ||
      "See what the world is reading right now. Privacy-first, fuzzed coordinates.";
    const streak = searchParams.get("streak");
    const readers = searchParams.get("readers");

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "space-between",
            backgroundColor: "#07090e",
            backgroundImage:
              "radial-gradient(circle at 25% 20%, rgba(139, 92, 246, 0.25) 0%, transparent 55%), radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.2) 0%, transparent 50%)",
            padding: "60px 70px",
            fontFamily: "sans-serif",
            color: "#f8fafc",
          }}
        >
          {/* Top Brand Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 20px",
              borderRadius: "9999px",
              backgroundColor: "rgba(15, 20, 32, 0.85)",
              border: "1px solid rgba(99, 102, 241, 0.35)",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#06b6d4",
                boxShadow: "0 0 10px #06b6d4",
              }}
            />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#f8fafc",
              }}
            >
              CurioMap
            </span>
          </div>

          {/* Main Title & Subtitle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              maxWidth: "1000px",
            }}
          >
            {streak ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#f59e0b",
                }}
              >
                <span>🔥</span>
                <span>{streak}-DAY READING STREAK</span>
              </div>
            ) : null}
            <h1
              style={{
                fontSize: "58px",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                color: "#ffffff",
                margin: 0,
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: "24px",
                color: "#94a3b8",
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          </div>

          {/* Bottom Telemetry Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              paddingTop: "24px",
              borderTop: "1px solid rgba(99, 102, 241, 0.2)",
            }}
          >
            <div style={{ display: "flex", gap: "28px" }}>
              {readers ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: "#06b6d4" }}>
                    {readers}
                  </span>
                  <span style={{ fontSize: "16px", color: "#64748b" }}>active readers</span>
                </div>
              ) : null}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px", color: "#64748b" }}>
                  Coordinates fuzzed ~15 km · Open source
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#8b5cf6",
              }}
            >
              curiomap.app
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (err) {
    console.error("Failed to generate OG image:", err);
    return new Response("Failed to generate image", { status: 500 });
  }
}
