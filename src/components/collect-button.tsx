"use client";
import { useFormStatus } from "react-dom";
export default function CollectButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="admin-button primary" disabled={disabled || pending}>
      {pending ? "인기 후보를 수집하고 있어요…" : "↻ 지금 수집하기"}
    </button>
  );
}
