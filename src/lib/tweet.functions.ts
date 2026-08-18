import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type TweetMedia = { url: string; type: "photo" | "video" };

export type TweetData = {
  name: string;
  username: string;
  avatar: string;
  text: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  media: TweetMedia[];
};

function extractId(url: string): string | null {
  const m = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status(?:es)?\/(\d+)/i);
  if (m?.[1]) return m[1];
  if (/^\d{5,25}$/.test(url.trim())) return url.trim();
  return null;
}

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) return "";
  const buf = await res.arrayBuffer();
  const type = res.headers.get("content-type") ?? "image/jpeg";
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] as number);
  return `data:${type};base64,${btoa(binary)}`;
}

export const fetchTweet = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ url: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<TweetData> => {
    const id = extractId(data.url);
    if (!id) throw new Error("URL inválida. Cole o link completo de um post do X.");

    const res = await fetch(`https://api.fxtwitter.com/status/${id}`, {
      headers: { "User-Agent": "Mozilla/5.0 XPostToImage" },
    });
    if (!res.ok) throw new Error("Não foi possível carregar o post. Ele pode ser protegido ou ter sido removido.");
    const json = (await res.json()) as any;
    const t = json?.tweet;
    if (!t) throw new Error("Post não encontrado ou conta protegida.");

    const media: TweetMedia[] = [];
    for (const p of t.media?.photos ?? []) media.push({ url: p.url, type: "photo" });
    for (const v of t.media?.videos ?? []) media.push({ url: v.thumbnail_url ?? v.url, type: "video" });

    const [avatar, ...mediaData] = await Promise.all([
      toDataUrl(t.author?.avatar_url ?? "").catch(() => ""),
      ...media.slice(0, 4).map((m) => toDataUrl(m.url).catch(() => "")),
    ]);

    return {
      name: t.author?.name ?? "",
      username: t.author?.screen_name ?? "",
      avatar,
      text: (t.text ?? "").replace(/https:\/\/t\.co\/\w+$/g, "").trimEnd(),
      createdAt: t.created_at ?? "",
      likes: t.likes ?? 0,
      retweets: t.retweets ?? 0,
      replies: t.replies ?? 0,
      views: t.views ?? 0,
      media: mediaData
        .filter(Boolean)
        .map((url, i) => ({ url, type: media[i]?.type ?? "photo" })),
    };
  });
