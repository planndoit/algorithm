import { NextResponse } from "next/server";
// Admin authorization is enforced with Neon Auth and admin_users in every page/action.
export function proxy() {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/admin/:path*"] };
