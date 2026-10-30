import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getResult, getQuiz } from "@/lib/data";
import { outcome } from "@/lib/model";
export const alt = "이번 주 알고리즘력 테스트 결과";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const { resultId } = await params;
  const r = await getResult(resultId);
  const score = r?.score;
  const quiz = r ? await getQuiz(r.quiz_id) : null;
  const type = score === undefined ? null : outcome(score);
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        background: "#eee9ff",
        color: "#4d2bc4",
        fontFamily: "Noto",
      }}
    >
      <div style={{ fontSize: 30 }}>
        {quiz?.is_sample
          ? "샘플 회차 · 알고리즘력 테스트"
          : "이번 주 알고리즘력 테스트"}
      </div>
      <div style={{ fontSize: 140, fontWeight: 900 }}>
        {score === undefined ? "WEEKLY" : `${score} / 100`}
      </div>
      <div style={{ fontSize: 48 }}>
        {type?.title || "당신의 인터넷 감각은?"}
      </div>
      <div style={{ fontSize: 28, marginTop: 30 }}>
        너는 몇 점? 지금 테스트해 봐 ↗
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Noto",
          data: await readFile(
            path.join(process.cwd(), "src/assets/NotoSansKR.ttf"),
          ),
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
}
