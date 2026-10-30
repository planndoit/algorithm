import { auth, authConfigured } from "@/lib/db";
import type { NextRequest } from "next/server";
// No public signup or user-management API. Operators create users in Neon Console.
const allowed = new Set([
  "get-session",
  "sign-in/email",
  "sign-out",
  "forget-password/email-otp",
  "email-otp/reset-password",
]);
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!authConfigured())
    return Response.json({ error: "인증 설정이 필요합니다." }, { status: 503 });
  const path = new URL(request.url).pathname.replace(/^\/api\/auth\//, "");
  if (!allowed.has(path))
    return Response.json(
      { error: "허용되지 않은 경로입니다." },
      { status: 404 },
    );
  if (request.method === "POST") {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return Response.json(
        { error: "허용되지 않은 요청입니다." },
        { status: 403 },
      );
    if (Number(request.headers.get("content-length")) > 4096)
      return Response.json({ error: "요청이 너무 큽니다." }, { status: 413 });
  }
  const handlers = auth().handler();
  return request.method === "GET"
    ? handlers.GET(request, context)
    : handlers.POST(request, context);
}
export const GET = handle;
export const POST = handle;
