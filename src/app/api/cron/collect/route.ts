import { timingSafeEqual } from "node:crypto";
import { runCollection } from "@/lib/collection/runner";
export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (
    !secret ||
    Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  )
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const result = await runCollection("cron");
    return Response.json(result, {
      status: result.status === "failed" ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Collection unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
