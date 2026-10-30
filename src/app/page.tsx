import Link from "next/link";
import { getQuiz, nextDate } from "@/lib/data";
import { demo } from "@/lib/db";
import { Ad } from "@/components/ad";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [quiz, next] = await Promise.all([getQuiz(), nextDate()]);
  return (
    <main>
      <section className="hero">
        <div className="intro">
          <span className="pill">
            <i /> YOUR WEEKLY INTERNET CHECK-IN
          </span>
          <h1>
            내 알고리즘,
            <br />
            요즘 <em>좀 치나?</em>
            <span className="spark">✳</span>
          </h1>
          <p className="lead">
            요즘 인터넷에서 핫한 것들,
            <br />
            나는 얼마나 알고 있을까?
          </p>
          <div className="hero-meta">
            <span>✦ 10문제</span>
            <span>◷ 약 1분</span>
            <span>↗ 가입 없이 바로</span>
          </div>
          <div className="desktop-caption">
            스크롤은 많이 했는데…
            <br />
            어디 한번 확인해 볼까? 👀
          </div>
        </div>
        <div className="test-card">
          <div className="card-top">
            <span>이번 주 알고리즘력 테스트</span>
            <span className="badge">
              {quiz?.is_sample
                ? "SAMPLE"
                : quiz?.id === "demo"
                  ? "DEMO"
                  : "WEEKLY"}
            </span>
          </div>
          <div className="art" aria-hidden="true">
            <div className="orbit o1" />
            <div className="orbit o2" />
            <span className="float f1">#요즘</span>
            <span className="float f2">👀</span>
            <div className="phone">
              <div className="phone-top">● ● ●</div>
              <div className="phone-face">✳</div>
              <div className="phone-label">FOR YOU</div>
              <div className="phone-line" />
              <div className="phone-line short" />
            </div>
            <span className="float f3">알고 있지? ↗</span>
            <span className="float f4">✦</span>
          </div>
          <h2>이번 주, 당신의 인터넷 감각은?</h2>
          <p className="muted">밈부터 챌린지까지. 아는 만큼 눌러봐.</p>
          {quiz ? (
            <>
              <Link className="button primary" href={`/quiz/${quiz.id}`}>
                {quiz.id === "demo"
                  ? "체험 테스트 시작하기"
                  : quiz.is_sample
                    ? "샘플 회차 테스트하기"
                    : "내 알고리즘력 확인하기"}
                <span>↗</span>
              </Link>
              <p className="fine">
                {quiz.id === "demo" || quiz.is_sample
                  ? "기능 확인용 샘플 · 실제 트렌드 테스트가 아닙니다"
                  : quiz.title}
              </p>
            </>
          ) : (
            <div className="notice">
              첫 테스트를 준비하고 있어요. 곧 만나요!
              {demo() && (
                <>
                  <Link href="/quiz/demo" className="button primary">
                    체험 테스트 시작하기 ↗
                  </Link>
                  <p className="fine">
                    실제 트렌드가 아닌 기능 확인용 샘플입니다.
                  </p>
                </>
              )}
            </div>
          )}
          <div className="card-bottom">
            <span>매주 새로운 10개의 발견</span>
            <span>금요일에 만나요 ✦</span>
          </div>
        </div>
      </section>
      <section className="how">
        <div>
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>가볍게 풀고, 재밌게 공유해.</h2>
        </div>
        <div className="steps">
          {[
            ["01", "보고", "요즘 뜨는 콘텐츠를 만나고"],
            ["02", "누르고", "알면 알아, 모르면 처음 봐"],
            ["03", "공유하고", "친구의 알고리즘력도 확인해 봐"],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="next">
        <span>✳ NEXT DROP</span>
        <p>
          {next
            ? new Date(next).toLocaleDateString("ko-KR", {
                timeZone: "Asia/Seoul",
                month: "long",
                day: "numeric",
              })
            : "다음 회차는 준비 중이에요"}
        </p>
        <small>새로운 한 주, 새로운 알고리즘.</small>
      </section>
      <Ad />
    </main>
  );
}
