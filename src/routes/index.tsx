import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Loader2, Download, ImageIcon } from "lucide-react";

import { fetchTweet, type TweetData } from "@/lib/tweet.functions";
import { Poster, BACKGROUNDS, POSTER_W, POSTER_H, type BackgroundId } from "@/components/poster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "X Post to Image — poster PNG 1080x1920 de posts do X" },
      {
        name: "description",
        content:
          "Cole o link de um post do X e gere um PNG vertical 1080x1920 com fundos sólidos ou granulados, sombra suave e contadores opcionais.",
      },
      { property: "og:title", content: "X Post to Image" },
      {
        property: "og:description",
        content: "Transforme posts do X em imagens PNG verticais prontas para stories.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const CHUNK_LIMIT = 620;

function splitText(
  text: string,
  limit = CHUNK_LIMIT,
  mediaIndex = -1,
  mediaReserve = 0,
): string[] {
  const limitFor = (i: number) =>
    Math.max(120, Math.round(i === mediaIndex ? limit * (1 - mediaReserve) : limit));
  if (text.length <= limitFor(0)) return [text];
  const chunks: string[] = [];
  let current = "";
  for (const word of text.split(/(\s+)/)) {
    if ((current + word).length > limitFor(chunks.length) && current.trim()) {
      chunks.push(current.trim());
      current = word.trimStart();
    } else {
      current += word;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}


function Home() {
  const load = useServerFn(fetchTweet);
  const [url, setUrl] = useState("");
  const [tweet, setTweet] = useState<TweetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [background, setBackground] = useState<BackgroundId>("blue-grain");
  const [widthPct, setWidthPct] = useState(82);
  const [showStats, setShowStats] = useState(true);
  const [showMedia, setShowMedia] = useState(true);
  const [verified, setVerified] = useState(true);
  const [mediaPage, setMediaPage] = useState(0);
  const [page, setPage] = useState(0);
  const [autoFit, setAutoFit] = useState(true);
  const [charLimit, setCharLimit] = useState(CHUNK_LIMIT);
  const [mediaScale, setMediaScale] = useState(100);

  const exportRef = useRef<HTMLDivElement>(null);

  const hasMedia = !!tweet && (tweet.media.length > 0 || !!tweet.card);
  const reserve = autoFit && showMedia && hasMedia ? (tweet!.media.length > 0 ? 0.45 : 0.55) : 0;

  const pages = useMemo(
    () => (tweet ? splitText(tweet.text, charLimit, reserve ? mediaPage : -1, reserve) : []),
    [tweet, charLimit, mediaPage, reserve],
  );
  const current = Math.min(page, Math.max(pages.length - 1, 0));


  async function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await load({ data: { url } });
      setTweet(data);
      setPage(0);
      setMediaPage(Math.max(splitText(data.text).length - 1, 0));
      setVerified(true);
    } catch (err) {
      setTweet(null);
      setError(err instanceof Error ? err.message : "Falha ao carregar o post.");
    } finally {
      setLoading(false);
    }
  }

  async function exportPage(index: number) {
    const node = exportRef.current;
    if (!node || !tweet) return;
    setPage(index);
    await new Promise((r) => setTimeout(r, 120));
    const dataUrl = await toPng(node, {
      width: POSTER_W,
      height: POSTER_H,
      pixelRatio: 1,
      cacheBust: true,
    });
    const link = document.createElement("a");
    const suffix = pages.length > 1 ? `-${index + 1}` : "";
    link.download = `x-post-${tweet.username}-${Date.now()}${suffix}.png`;
    link.href = dataUrl;
    link.click();
  }

  async function handleExport(all: boolean) {
    if (!tweet) return;
    setExporting(true);
    try {
      if (all) {
        for (let i = 0; i < pages.length; i++) await exportPage(i);
      } else {
        await exportPage(current);
      }
    } catch {
      setError("Não foi possível gerar o PNG. Tente novamente.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ImageIcon className="size-4" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">X Post to Image</h1>
            <p className="text-xs text-muted-foreground">Posts do X em PNG 1080×1920</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,360px)_1fr]">
        <section className="space-y-6">
          <form onSubmit={handleLoad} className="space-y-3">
            <Label htmlFor="url">Link do post</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://x.com/usuario/status/123..."
            />
            <Button type="submit" className="w-full" disabled={loading || !url.trim()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? "Carregando post..." : "Carregar post"}
            </Button>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </form>

          <div className="space-y-3">
            <Label>Fundo</Label>
            <div className="grid grid-cols-5 gap-2">
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  title={b.label}
                  onClick={() => setBackground(b.id)}
                  className={`h-12 rounded-lg border-2 transition-transform hover:scale-105 ${
                    background === b.id ? "border-primary" : "border-border"
                  }`}
                  style={{ background: b.swatch }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {BACKGROUNDS.find((b) => b.id === background)?.label}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Largura do bloco</Label>
              <span className="text-sm text-muted-foreground">{widthPct}%</span>
            </div>
            <Slider
              min={60}
              max={95}
              step={1}
              value={[widthPct]}
              onValueChange={([v]) => setWidthPct(v ?? 82)}
            />
          </div>

          <div className="space-y-4 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="stats">Mostrar contadores</Label>
              <Switch id="stats" checked={showStats} onCheckedChange={setShowStats} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="media">Mostrar mídia / prévia do link</Label>
              <Switch id="media" checked={showMedia} onCheckedChange={setShowMedia} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="verified">Selo de verificado</Label>
              <Switch id="verified" checked={verified} onCheckedChange={setVerified} />
            </div>
            {showMedia && pages.length > 1 && tweet && (tweet.media.length > 0 || tweet.card) ? (
              <div className="space-y-2">
                <Label>Imagem na página</Label>
                <div className="flex flex-wrap gap-2">
                  {pages.map((_, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={i === mediaPage ? "default" : "outline"}
                      onClick={() => setMediaPage(i)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {pages.length > 1 ? (
            <div className="space-y-2">
              <Label>Páginas ({pages.length})</Label>
              <div className="flex flex-wrap gap-2">
                {pages.map((_, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant={i === current ? "default" : "outline"}
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button disabled={!tweet || exporting} onClick={() => handleExport(false)}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Exportar PNG
            </Button>
            {pages.length > 1 ? (
              <Button variant="outline" disabled={exporting} onClick={() => handleExport(true)}>
                Exportar todas as {pages.length} imagens
              </Button>
            ) : null}
          </div>
        </section>

        <section className="flex justify-center">
          {tweet ? (
            <div
              className="overflow-hidden rounded-2xl border border-border"
              style={{ width: 360, height: 640 }}
            >
              <div style={{ transform: `scale(${360 / POSTER_W})`, transformOrigin: "top left" }}>
                <Poster
                  innerRef={exportRef}
                  tweet={tweet}
                  text={pages[current] ?? ""}
                  background={background}
                  widthPct={widthPct}
                  showStats={showStats}
                  showMedia={showMedia}
                  mediaPage={mediaPage}
                  verified={verified}
                  page={current}
                  pages={pages.length}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-[640px] w-[360px] items-center justify-center rounded-2xl border border-dashed border-border text-center text-sm text-muted-foreground">
              Cole o link de um post do X para ver o preview
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
