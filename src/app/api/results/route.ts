import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { submission } from "@/lib/model";
import { configured, query } from "@/lib/db";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "허용되지 않은 요청입니다." },
      { status: 403 },
    );
  if (!configured())
    return NextResponse.json(
      { error: "서비스 설정이 필요합니다." },
      { status: 503 },
    );
  try {
    if (Number(request.headers.get("content-length")) > 4096) throw Error();
    const body = submission.safeParse(await request.json());
    if (!body.success)
      return NextResponse.json(
        { error: "10개의 응답과 올바른 제출 ID가 필요합니다." },
        { status: 400 },
      );
    if (!process.env.RATE_LIMIT_SECRET)
      return NextResponse.json(
        { error: "서비스 설정이 필요합니다." },
        { status: 503 },
      );
    const actor = createHmac("sha256", process.env.RATE_LIMIT_SECRET)
      .update(
        request.headers.get("x-vercel-forwarded-for")?.split(",")[0] || "local",
      )
      .digest("hex");
    let result: { id: string } | undefined;
    try {
      [result] = await query<{ id: string }>(
        "select public.submit_result($1::uuid,$2::uuid,$3::boolean[],$4) id",
        [body.data.quizId, body.data.requestId, body.data.answers, actor],
      );
    } catch {
      return NextResponse.json(
        { error: "저장할 수 없습니다. 공개 회차와 요청 횟수를 확인해 주세요." },
        { status: 400 },
      );
    }
    if (!result) throw Error("Missing result");
    return NextResponse.json({ id: result.id });
  } catch {
    return NextResponse.json(
      { error: "올바른 요청이 아닙니다." },
      { status: 400 },
    );
  }
}
