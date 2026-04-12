"use client";

import {
  goldChipButtonStyle,
  hudFont,
  hudMiniPanel,
} from "@/components/gameHudStyles";
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
  /** Overrides the Chat trigger (e.g. segmented button group right segment). */
  chatButtonStyle?: CSSProperties;
};

const logStyle: CSSProperties = {
  flex: 1,
  minHeight: 120,
  maxHeight: "min(42vh, 280px)",
  overflowY: "auto",
  margin: 0,
  padding: "8px 10px",
  fontSize: 13,
  lineHeight: 1.4,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  color: "#003d5c",
  background: "rgba(255,255,255,0.45)",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.65)",
};

const rowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "stretch",
};

export function MatchChatPanel({
  chatText,
  disabled,
  onSend,
  onPoll,
  pollMs = 1000,
  chatButtonStyle,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLPreElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const submit = useCallback(async () => {
    const t = draft.trim();
    if (!t || disabled) return;
    setDraft("");
    await onSend(t);
  }, [draft, disabled, onSend]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={chatButtonStyle ?? goldChipButtonStyle()}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Chat
      </button>

      {open ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 55,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            boxSizing: "border-box",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Match chat"
            style={{
              ...hudMiniPanel,
              ...hudFont,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: 14,
              width: "min(92vw, 400px)",
              maxWidth: "100%",
              maxHeight: "min(88vh, 520px)",
              pointerEvents: "auto",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 15, color: "#003d5c" }}>
                Match chat
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ ...goldChipButtonStyle(), padding: "6px 12px" }}
              >
                Close
              </button>
            </div>
            <pre ref={logRef} style={logStyle}>
              {chatText || "—"}
            </pre>
            <div style={rowStyle}>
              <input
                ref={inputRef}
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
                  fontSize: 14,
                  padding: "8px 10px",
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
                  padding: "8px 12px",
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
        </div>
      ) : null}
    </>
  );
}
