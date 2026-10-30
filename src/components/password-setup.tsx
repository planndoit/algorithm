"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
export default function PasswordSetup() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const body = sent
        ? {
            email,
            otp: String(form.get("otp")),
            password: String(form.get("password")),
          }
        : { email };
      if (sent && form.get("password") !== form.get("confirm")) {
        setMessage("두 비밀번호가 같지 않아요.");
        return;
      }
      const response = await fetch(
        sent
          ? "/api/auth/email-otp/reset-password"
          : "/api/auth/forget-password/email-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        setMessage(
          sent
            ? "인증코드와 비밀번호를 확인해 주세요. 코드는 만료될 수 있어요."
            : "요청하지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
        return;
      }
      if (sent) setDone(true);
      else {
        setSent(true);
        setMessage(
          "등록된 계정이라면 인증코드가 전송됩니다. 스팸함도 확인해 주세요.",
        );
      }
    } catch {
      setMessage("연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="narrow">
      <span className="eyebrow">ADMIN ACCESS</span>
      <h1>비밀번호 설정 · 재설정</h1>
      <p className="muted">
        관리자로 등록한 이메일로 인증코드를 받아 비밀번호를 설정하세요.
      </p>
      {done ? (
        <>
          <div className="notice" role="status">
            비밀번호를 설정했어요. 관리자 화면에서 로그인해 주세요.
          </div>
          <Link className="button primary" href="/admin">
            관리자 로그인
          </Link>
        </>
      ) : (
        <form onSubmit={submit}>
          <label>
            관리자 이메일
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={sent}
              autoComplete="email"
              required
            />
          </label>
          {sent && (
            <>
              <label>
                이메일 인증코드
                <input
                  name="otp"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  autoComplete="one-time-code"
                  minLength={6}
                  maxLength={6}
                  required
                />
              </label>
              <label>
                새 비밀번호 (12자 이상)
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label>
                비밀번호 확인
                <input
                  name="confirm"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </label>
            </>
          )}
          <button className="button primary" disabled={busy}>
            {busy
              ? "처리 중…"
              : sent
                ? "비밀번호 설정하기"
                : "이메일로 인증코드 받기"}
          </button>
          <p role="status" className="fine">
            {message}
          </p>
          {sent && (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                setSent(false);
                setMessage("");
              }}
            >
              이메일 변경 / 코드 다시 요청
            </button>
          )}
          <Link className="button secondary" href="/admin">
            로그인으로 돌아가기
          </Link>
        </form>
      )}
    </main>
  );
}
