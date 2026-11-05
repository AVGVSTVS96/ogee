import { ImageResponse } from "next/og";

export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const now = new Date().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles" });
  console.log("card", req.headers.get("user-agent"), q.toString());
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "linear-gradient(135deg,#0b1020,#1e3a8a 60%,#7c3aed)", color: "white", fontSize: 40 }}>
        <div style={{ display: "flex", fontSize: 28, opacity: 0.7 }}>previews · rendered {now} PT</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 84, fontWeight: 700 }}>{q.get("t") ?? "Preview"}</div>
          <div style={{ fontSize: 40, opacity: 0.85 }}>{q.get("d") ?? ""}</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          {[40, 70, 55, 90, 65, 100, 80].map((h, i) => (
            <div key={i} style={{ width: 60, height: h * 1.4, background: "#a5b4fc", borderRadius: 8 }} />
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "cache-control": "no-store" } },
  );
}
