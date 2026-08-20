import type { TweetData } from "@/lib/tweet.functions";
import { TweetCard, type CardTheme } from "./tweet-card";

const grain = (opacity: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="600" height="600" filter="url(#n)" opacity="${opacity}"/></svg>`,
  )}")`;

export type BackgroundId = "black" | "white" | "kapital" | "white-grain" | "blue-grain";

export const BACKGROUNDS: {
  id: BackgroundId;
  label: string;
  css: React.CSSProperties;
  card: CardTheme;
  swatch: string;
}[] = [
  {
    id: "black",
    label: "Preto sólido",
    css: { background: "#000000" },
    card: "light",
    swatch: "#000000",
  },
  {
    id: "white",
    label: "Branco sólido",
    css: { background: "#FFFFFF" },
    card: "light",
    swatch: "#FFFFFF",
  },
  {
    id: "kapital",
    label: "Azul Kapital",
    css: { background: "#0052CC" },
    card: "light",
    swatch: "#0052CC",
  },
  {
    id: "white-grain",
    label: "Branco granulado",
    css: {
      backgroundColor: "#f4f2ee",
      backgroundImage: `${grain(0.35)}, radial-gradient(circle at 30% 20%, #ffffff 0%, #e9e6e0 100%)`,
      backgroundSize: "600px 600px, cover",
    },
    card: "light",
    swatch: "linear-gradient(135deg,#ffffff,#e6e3dd)",
  },
  {
    id: "blue-grain",
    label: "Azul granulado",
    css: {
      backgroundColor: "#0a3fa8",
      backgroundImage: `${grain(0.4)}, radial-gradient(circle at 30% 20%, #1462e8 0%, #052a73 100%)`,
      backgroundSize: "600px 600px, cover",
    },
    card: "light",
    swatch: "linear-gradient(135deg,#1462e8,#052a73)",
  },
];

export const POSTER_W = 1080;
export const POSTER_H_STORY = 1920;
export const POSTER_H_FEED = 1350;

export type PosterFormat = "story" | "feed";

export function posterHeight(format: PosterFormat): number {
  return format === "feed" ? POSTER_H_FEED : POSTER_H_STORY;
}


export function Poster({
  tweet,
  text,
  background,
  widthPct,
  showStats,
  showMedia,
  mediaPage,
  mediaScale = 1,
  verified,
  page,
  pages,
  format,
  innerRef,
  editable,
  onTextChange,
  onSplitAt,
}: {
  tweet: TweetData;
  text: string;
  background: BackgroundId;
  widthPct: number;
  showStats: boolean;
  showMedia: boolean;
  mediaPage: number;
  mediaScale?: number;
  verified: boolean;
  page: number;
  pages: number;
  format: PosterFormat;
  innerRef?: React.Ref<HTMLDivElement>;
  editable?: boolean | undefined;
  onTextChange?: ((t: string) => void) | undefined;
  onSplitAt?: ((caret: number) => void) | undefined;
}) {
  const bg = BACKGROUNDS.find((b) => b.id === background) ?? BACKGROUNDS[0]!;
  const height = posterHeight(format);

  return (
    <div
      ref={innerRef}
      style={{
        width: POSTER_W,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        ...bg.css,
      }}
    >
      <div style={{ width: `${widthPct}%` }}>
        <TweetCard
          tweet={tweet}
          text={text}
          showStats={showStats && page === pages - 1}
          showMedia={showMedia && page === mediaPage}
          mediaScale={mediaScale}
          verified={verified}
          theme={bg.card}
          editable={editable}
          onTextChange={onTextChange}
          onSplitAt={onSplitAt}
        />
      </div>

      {pages > 1 ? (
        <div
          style={{
            position: "absolute",
            bottom: 56,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
            fontSize: 28,
            letterSpacing: 2,
            color: background === "white" || background === "white-grain" ? "#6b7280" : "rgba(255,255,255,0.75)",
          }}
        >
          {page + 1}/{pages}
        </div>
      ) : null}
    </div>
  );
}
