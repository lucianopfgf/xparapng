import { useEffect, useRef } from "react";
import type { TweetData } from "@/lib/tweet.functions";

function EditableText({
  text,
  style,
  editable,
  onTextChange,
  onSplitAt,
}: {
  text: string;
  style: React.CSSProperties;
  editable?: boolean;
  onTextChange?: (t: string) => void;
  onSplitAt?: (caret: number) => void;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.innerText !== text) el.innerText = text;
  }, [text]);

  function caretOffset(el: HTMLElement) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return el.innerText.length;
    const range = sel.getRangeAt(0).cloneRange();
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().length;
  }

  return (
    <p
      ref={ref}
      contentEditable={editable ? true : undefined}
      suppressContentEditableWarning
      spellCheck={false}
      onKeyDown={(e) => {
        if (!editable) return;
        if (e.key === "Enter" && e.shiftKey) {
          e.preventDefault();
          onSplitAt?.(caretOffset(e.currentTarget));
        }
      }}
      onInput={(e) => onTextChange?.((e.currentTarget as HTMLElement).innerText)}
      style={{ ...style, outline: "none" }}
    >
      {text}
    </p>
  );
}


function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")}K`;
  return String(n);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
  return `${time} · ${date}`;
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
} as const;

function Stat({ path, value, color }: { path: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color }}>
      <svg {...iconProps} style={{ width: 26, height: 26 }}>
        <path d={path} />
      </svg>
      <span style={{ fontSize: 24, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export type CardTheme = "light" | "dark";

function VerifiedBadge({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 22 22" aria-hidden style={{ width: size, height: size, flexShrink: 0 }}>
      <path
        fill="#1d9bf0"
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.816.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
      />
    </svg>
  );
}

function LinkCard({
  card,
  scale,
  mediaScale,
  border,
  sub,
}: {
  card: NonNullable<TweetData["card"]>;
  scale: number;
  mediaScale: number;
  border: string;
  sub: string;
}) {
  return (
    <div
      style={{
        marginTop: 28 * scale,
        borderRadius: 20 * scale,
        overflow: "hidden",
        border: `1px solid ${border}`,
      }}
    >
      {card.image ? (
        <img
          src={card.image}
          alt=""
          style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 560 * scale * mediaScale }}
        />
      ) : null}
      <div style={{ padding: 24 * scale, display: "flex", flexDirection: "column", gap: 8 * scale }}>
        <span style={{ fontSize: 24 * scale, color: sub }}>{card.domain}</span>
        <span style={{ fontSize: 28 * scale, fontWeight: 600 }}>{card.title}</span>
        {card.description ? (
          <span style={{ fontSize: 24 * scale, color: sub }}>{card.description}</span>
        ) : null}
      </div>
    </div>
  );
}

export function TweetCard({
  tweet,
  text,
  showStats,
  showMedia,
  verified,
  theme,
  scale = 1,
  mediaScale = 1,
}: {
  tweet: TweetData;
  text: string;
  showStats: boolean;
  showMedia: boolean;
  verified?: boolean;
  theme: CardTheme;
  scale?: number;
  mediaScale?: number;
}) {
  const dark = theme === "dark";
  const fg = dark ? "#e7e9ea" : "#0f1419";
  const sub = dark ? "#71767b" : "#536471";
  const border = dark ? "#2f3336" : "#eff3f4";

  return (
    <div
      style={{
        background: dark ? "#000000" : "#ffffff",
        borderRadius: 24 * scale,
        padding: 44 * scale,
        boxShadow: "0 40px 90px rgba(0,0,0,0.30), 0 8px 24px rgba(0,0,0,0.16)",
        fontFamily:
          '"Chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: fg,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 * scale }}>
        {tweet.avatar ? (
          <img
            src={tweet.avatar}
            alt=""
            style={{
              width: 84 * scale,
              height: 84 * scale,
              borderRadius: "9999px",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
          <span style={{ fontSize: 30 * scale, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 * scale }}>
            {tweet.name}
            {(verified ?? tweet.verified) ? <VerifiedBadge size={30 * scale} /> : null}
          </span>
          <span style={{ fontSize: 27 * scale, color: sub }}>@{tweet.username}</span>
        </div>
        <div style={{ marginLeft: "auto", color: fg }}>
          <svg {...iconProps} style={{ width: 40 * scale, height: 40 * scale }}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
      </div>

      <p
        style={{
          fontSize: 36 * scale,
          lineHeight: 1.42,
          margin: `${28 * scale}px 0 0`,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text}
      </p>

      {showMedia && tweet.media.length > 0 ? (
        <div
          style={{
            marginTop: 28 * scale,
            display: "grid",
            gridTemplateColumns: tweet.media.length > 1 ? "1fr 1fr" : "1fr",
            gap: 8 * scale,
            borderRadius: 20 * scale,
            overflow: "hidden",
            border: `1px solid ${border}`,
          }}
        >
          {tweet.media.slice(0, 4).map((m, i) => (
            <img
              key={i}
              src={m.url}
              alt=""
              style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 620 * scale * mediaScale }}
            />
          ))}
        </div>
      ) : null}

      {showMedia && tweet.media.length === 0 && tweet.card ? (
        <LinkCard card={tweet.card} scale={scale} mediaScale={mediaScale} border={border} sub={sub} />
      ) : null}


      <div style={{ marginTop: 26 * scale, fontSize: 25 * scale, color: sub }}>
        {formatDate(tweet.createdAt)}
      </div>

      {showStats ? (
        <div
          style={{
            marginTop: 26 * scale,
            paddingTop: 26 * scale,
            borderTop: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            gap: 46 * scale,
            transform: `scale(${scale})`,
            transformOrigin: "left center",
            width: `${100 / scale}%`,
          }}
        >
          <Stat
            color={sub}
            value={formatCount(tweet.replies)}
            path="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13z"
          />
          <Stat
            color={sub}
            value={formatCount(tweet.retweets)}
            path="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"
          />
          <Stat
            color={sub}
            value={formatCount(tweet.likes)}
            path="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.053-4.64 7.128-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.91-1.91z"
          />
          <Stat
            color={sub}
            value={formatCount(tweet.views)}
            path="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"
          />
        </div>
      ) : null}
    </div>
  );
}
