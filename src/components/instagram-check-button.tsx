"use client";
import { useFormStatus } from "react-dom";
export default function InstagramCheckButton({
  disabled,
}: {
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="admin-button primary" disabled={disabled || pending}>
      {pending ? "계정·조회 권한 확인 중…" : "Instagram 연결 확인"}
    </button>
  );
}
