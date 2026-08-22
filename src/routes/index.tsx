import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Loader2, Download, ImageIcon, Bold, Italic } from "lucide-react";

import { fetchTweet, type TweetData } from "@/lib/tweet.functions";
import { Poster, BACKGROUNDS, POSTER_W, type BackgroundId, type PosterFormat } from "@/components/poster";
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

function splitParagraphs(
  text: string,
  perPage: number,
  mediaIndex = -1,
  mediaReserve = 0,
): string[] {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paras.length === 0) return [text];
  const pages: string[] = [];
  let i = 0;
  while (i < paras.length) {
    const isMediaPage = pages.length === mediaIndex;
    const take = Math.max(
      1,
      isMediaPage ? Math.floor(perPage * (1 - mediaReserve)) : perPage,
    );
    pages.push(paras.slice(i, i + take).join("\n\n"));
    i += take;
  }
  return pages;
}


type SplitMode = "paragraph" | "chars";

function unitsOf(text: string, mode: SplitMode): string[] {
  if (mode === "paragraph") {
    return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  }
  return text.match(/\S+\s*/g) ?? [];
}

function joinUnits(units: string[], mode: SplitMode): string {
  return mode === "paragraph" ? units.join("\n\n") : units.join("").trim();
}

/**
 * Move texto entre a página `index` e a seguinte.
 * Em modo parágrafo, o excedente é redistribuído em cascata respeitando o
 * padrão `perPage` — criando novos slides em vez de inflar o slide seguinte.
 */
function resizePage(
  pages: string[],
  index: number,
  target: number,
  mode: SplitMode,
  perPage: number,
): string[] {
  const next = [...pages];
  const combined = [
    ...unitsOf(next[index] ?? "", mode),
    ...(index + 1 < next.length ? unitsOf(next[index + 1] ?? "", mode) : []),
  ];
  if (combined.length === 0) return pages;

  let count: number;
  if (mode === "paragraph") {
    count = Math.max(1, Math.min(target, combined.length));
  } else {
    let len = 0;
    count = 0;
    for (const token of combined) {
      const add = token.length;
      if (count > 0 && len + add > target) break;
      len += add;
      count++;
    }
    count = Math.max(1, count);
  }

  const head = combined.slice(0, count);
  const rest = combined.slice(count);
  next[index] = joinUnits(head, mode);
  if (rest.length) {
    const restText = joinUnits(rest, mode);
    if (index + 1 < next.length) next[index + 1] = restText;
    else next.splice(index + 1, 0, restText);
  } else if (index + 1 < next.length) {
    next.splice(index + 1, 1);
  }

  // Cascata: nenhum slide seguinte pode ultrapassar o padrão de parágrafos.
  if (mode === "paragraph") {
    for (let i = index + 1; i < next.length; i++) {
      const units = unitsOf(next[i] ?? "", "paragraph");
      if (units.length <= perPage) continue;
      next[i] = joinUnits(units.slice(0, perPage), "paragraph");
      const overflow = units.slice(perPage);
      if (i + 1 < next.length) {
        next[i + 1] = joinUnits(
          [...overflow, ...unitsOf(next[i + 1] ?? "", "paragraph")],
          "paragraph",
        );
      } else {
        next.push(joinUnits(overflow, "paragraph"));
      }
    }
  }
  return next;
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
  const [format, setFormat] = useState<PosterFormat>("story");
  const [splitMode, setSplitMode] = useState<"paragraph" | "chars">("paragraph");
  const [paraPerPage, setParaPerPage] = useState(4);

  const exportHeight = format === "feed" ? 1350 : 1920;
  const previewW = 360;
  const previewH = Math.round((previewW * exportHeight) / POSTER_W);


  const exportRef = useRef<HTMLDivElement>(null);

  const hasMedia = !!tweet && (tweet.media.length > 0 || !!tweet.card);
  const reserve = autoFit && showMedia && hasMedia ? (tweet!.media.length > 0 ? 0.45 : 0.55) : 0;

  const [pages, setPages] = useState<string[]>([]);

  useEffect(() => {
    if (!tweet) {
      setPages([]);
      return;
    }
    setPages(
      splitMode === "paragraph"
        ? splitParagraphs(tweet.text, paraPerPage, reserve ? mediaPage : -1, reserve)
        : splitText(tweet.text, charLimit, reserve ? mediaPage : -1, reserve),
    );
  }, [tweet, charLimit, mediaPage, reserve, splitMode, paraPerPage]);

  const current = Math.min(page, Math.max(pages.length - 1, 0));
  const currentText = pages[current] ?? "";
  const nextText = pages[current + 1] ?? "";

  const pageValue =
    splitMode === "paragraph" ? unitsOf(currentText, "paragraph").length : currentText.length;
  const pageMax =
    splitMode === "paragraph"
      ? Math.max(1, pageValue + unitsOf(nextText, "paragraph").length)
      : Math.max(40, currentText.length + nextText.length);

  function handlePageResize(target: number) {
    setPages((p) => resizePage(p, current, target, splitMode, paraPerPage));
  }

  /** Aplica negrito/itálico à seleção atual dentro do texto editável da prévia. */
  function applyFormat(cmd: "bold" | "italic") {
    const el = document.querySelector<HTMLElement>("[data-editable-text]");
    if (!el) return;
    el.focus();
    document.execCommand(cmd);
    // Faz o EditableText re-serializar o conteúdo para markdown.
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }


  const handleTextChange = useCallback(
    (text: string) => {
      setPages((p) => (p[current] === text ? p : p.map((x, i) => (i === current ? text : x))));
    },
    [current],
  );

  const handleSplitAt = useCallback(
    (caret: number) => {
      setPages((p) => {
        const text = p[current] ?? "";
        const before = text.slice(0, caret).trimEnd();
        const after = text.slice(caret).trimStart();
        const next = [...p];
        next[current] = before;
        next.splice(current + 1, 0, after);
        return next;
      });
    },
    [current],
  );


  async function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await load({ data: { url } });
      setTweet(data);
      setPage(0);
      setMediaPage(
        Math.max(
          (splitMode === "paragraph"
            ? splitParagraphs(data.text, paraPerPage)
            : splitText(data.text, charLimit)
          ).length - 1,
          0,
        ),
      );

      setVerified(true);
    } catch (err) {
      setTweet(null);
      setError(err instanceof Error ? err.message : "Falha ao carregar o post.");
    } finally {
      setLoading(false);
    }
  }

  function dataUrlToBlob(dataUrl: string): Blob {
    const [head, b64] = dataUrl.split(",");
    const mime = /:(.*?);/.exec(head ?? "")?.[1] ?? "image/png";
    const bin = atob(b64 ?? "");
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function renderPage(index: number): Promise<File | null> {
    const node = exportRef.current;
    if (!node || !tweet) return null;
    setPage(index);
    await new Promise((r) => setTimeout(r, 180));
    const opts = { width: POSTER_W, height: exportHeight, pixelRatio: 1, cacheBust: true };
    // Safari/iOS costuma falhar na primeira renderização (fontes/imagens ainda
    // não embutidas), então renderizamos duas vezes e usamos o segundo resultado.
    await toPng(node, opts);
    const dataUrl = await toPng(node, opts);
    const suffix = pages.length > 1 ? `-${index + 1}` : "";
    const name = `x-post-${tweet.username}-${Date.now()}${suffix}.png`;
    return new File([dataUrlToBlob(dataUrl)], name, { type: "image/png" });
  }

  function saveFile(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.download = file.name;
    link.href = url;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function deliver(files: File[]) {
    if (files.length === 0) return;
    const nav = navigator as Navigator & {
      canShare?: (d: ShareData) => boolean;
      share?: (d: ShareData) => Promise<void>;
    };
    // iOS (Safari/Chrome): download via <a download> é bloqueado; usamos o
    // menu de compartilhamento nativo para salvar em Fotos/Arquivos.
    if (nav.share && nav.canShare?.({ files })) {
      try {
        await nav.share({ files, title: "X Post to Image" });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    if (nav.share && files.length > 1 && nav.canShare?.({ files: [files[0]!] })) {
      for (const file of files) {
        try {
          await nav.share({ files: [file] });
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          saveFile(file);
        }
      }
      return;
    }
    files.forEach(saveFile);
  }

  async function handleExport(all: boolean) {
    if (!tweet) return;
    setExporting(true);
    try {
      const files: File[] = [];
      if (all) {
        for (let i = 0; i < pages.length; i++) {
          const f = await renderPage(i);
          if (f) files.push(f);
        }
      } else {
        const f = await renderPage(current);
        if (f) files.push(f);
      }
      await deliver(files);
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
            <Label>Formato</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={format === "story" ? "default" : "outline"}
                onClick={() => setFormat("story")}
              >
                Stories 1080×1920
              </Button>
              <Button
                type="button"
                variant={format === "feed" ? "default" : "outline"}
                onClick={() => setFormat("feed")}
              >
                Feed 1080×1350
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {format === "story" ? "16:9 vertical — stories" : "4:5 vertical — feed do Instagram"}
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

          <div className="space-y-3">
            <Label>Divisão do texto</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={splitMode === "paragraph" ? "default" : "outline"}
                onClick={() => setSplitMode("paragraph")}
              >
                Por parágrafos
              </Button>
              <Button
                type="button"
                variant={splitMode === "chars" ? "default" : "outline"}
                onClick={() => setSplitMode("chars")}
              >
                Por caracteres
              </Button>
            </div>
          </div>

          {splitMode === "paragraph" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Parágrafos por página</Label>
                <span className="text-sm text-muted-foreground">{paraPerPage}</span>
              </div>
              <Slider
                min={1}
                max={12}
                step={1}
                value={[paraPerPage]}
                onValueChange={([v]) => setParaPerPage(v ?? 4)}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Texto por página</Label>
                <span className="text-sm text-muted-foreground">{charLimit} car.</span>
              </div>
              <Slider
                min={200}
                max={1000}
                step={1}
                value={[charLimit]}
                onValueChange={([v]) => setCharLimit(v ?? CHUNK_LIMIT)}
              />
            </div>
          )}


          {pages.length > 0 ? (
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <Label>
                  Ajuste da página {current + 1}
                </Label>
                <span className="text-sm text-muted-foreground">
                  {splitMode === "paragraph" ? `${pageValue} parág.` : `${pageValue} car.`}
                </span>
              </div>
              <Slider
                min={1}
                max={pageMax}
                step={1}
                value={[Math.min(pageValue, pageMax)]}
                onValueChange={([v]) => handlePageResize(v ?? pageValue)}
              />
              <p className="text-xs text-muted-foreground">
                Reduzir empurra o final desta página para a próxima; aumentar puxa da próxima. As
                outras páginas não são afetadas.
              </p>
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Tamanho da imagem / prévia</Label>
              <span className="text-sm text-muted-foreground">{mediaScale}%</span>
            </div>
            <Slider
              min={40}
              max={100}
              step={5}
              value={[mediaScale]}
              onValueChange={([v]) => setMediaScale(v ?? 100)}
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
            <div className="flex items-center justify-between">
              <Label htmlFor="autofit">Ajuste automático do texto</Label>
              <Switch id="autofit" checked={autoFit} onCheckedChange={setAutoFit} />
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

        <section className="flex items-start justify-center">
          {/* Prévia sticky: acompanha o scroll da página */}
          <div className="preview-sticky flex flex-col items-center gap-3 self-start">
            {tweet ? (
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => applyFormat("bold")}>
                  <Bold className="size-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyFormat("italic")}>
                  <Italic className="size-4" />
                </Button>
                <span className="self-center text-xs text-muted-foreground">
                  Selecione o texto na prévia
                </span>
              </div>
            ) : null}
            {tweet ? (
              <div
                className="overflow-hidden rounded-2xl border border-border"
                style={{ width: previewW, height: previewH }}
              >
                <div style={{ transform: `scale(${previewW / POSTER_W})`, transformOrigin: "top left" }}>
                  <Poster
                    innerRef={exportRef}
                    tweet={tweet}
                    text={pages[current] ?? ""}
                    background={background}
                    widthPct={widthPct}
                    showStats={showStats}
                    showMedia={showMedia}
                    mediaPage={mediaPage}
                    mediaScale={mediaScale / 100}
                    verified={verified}
                    format={format}
                    page={current}
                    pages={pages.length}
                    editable
                    onTextChange={handleTextChange}
                    onSplitAt={handleSplitAt}
                  />
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-center rounded-2xl border border-dashed border-border text-center text-sm text-muted-foreground"
                style={{ width: previewW, height: previewH }}
              >
                Cole o link de um post do X para ver o preview
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
