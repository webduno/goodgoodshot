"use client";

import { hudFont, hudMiniPanel } from "@/components/gameHudStyles";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

type Props = {
  chatText: string;
  disabled?: boolean;
  onSend: (message: string) => void | Promise<void>;
  /** Poll parent state (e.g. room row) on this interval. */
  onPoll: () => void;
  pollMs?: number;
};

const panelStyle: CSSProperties = {
  ...hudMiniPanel,
  ...hudFont,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 8,
  width: "min(42vw, 280px)",
  maxHeight: "min(38vh, 220px)",
  pointerEvents: "auto",
  boxSizing: "border-box",
};

const logStyle: CSSProperties = {
  flex: 1,
  minHeight: 72,
  maxHeight: 140,
  overflowY: "auto",
  margin: 0,
  padding: "6px 8px",
  fontSize: 12,
  lineHeight: 1.35,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  color: "#003d5c",
  background: "rgba(255,255,255,0.45)",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.65)",
};

const rowStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "stretch",
};

export function MatchChatPanel({
  chatText,
  disabled,
  onSend,
  onPoll,
  pollMs = 1000,
}: Props) {
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      onPoll();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [onPoll, pollMs]);

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatText]);

  const submit = useCallback(async () => {
    const t = draft.trim();
    if (!t || disabled) return;
    setDraft("");
    await onSend(t);
  }, [draft, disabled, onSend]);

  return (
    <div style={panelStyle}>
      <pre ref={logRef} style={logStyle}>
        {chatText || "—"}
      </pre>
      <div style={rowStyle}>
        <input
          type="text"
          value={draft}
          maxLength={200}
          disabled={disabled}
          placeholder="Message…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13,
            padding: "6px 8px",
            borderRadius: 10,
            border: "1px solid rgba(0, 80, 120, 0.25)",
            ...hudFont,
          }}
        />
        <button
          type="button"
          disabled={disabled || !draft.trim()}
          onClick={() => void submit()}
          style={{
            ...hudFont,
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.88)",
            background:
              "linear-gradient(165deg, #ffffff 0%, #b8ecff 22%, #00aeef 52%, #0072bc 100%)",
            color: "#ffffff",
            textShadow: "0 1px 2px rgba(0, 35, 70, 0.65)",
            cursor: disabled || !draft.trim() ? "not-allowed" : "pointer",
            opacity: disabled || !draft.trim() ? 0.55 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
