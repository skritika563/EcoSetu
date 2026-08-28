/**
 * ScanScrapPage — standalone "what is this?" AI classification tool.
 *
 * Distinct from ScrapInfoStep.jsx's inline "AI Classify" (which feeds a
 * pickup booking's category chips): this page isn't part of any booking
 * flow — it's a quick, no-commitment way to point a camera at scrap and get
 * an answer, reachable from the Home quick actions ("Scan Scrap") on both
 * the household and collector dashboards. Same backend call
 * (POST /api/ai/classify via services/aiService.js) as the booking flow, so
 * there's still exactly one place that knows how to call Gemini — this page
 * just gives it its own front door.
 *
 * A result is informational only, same business rule as booking: nothing
 * here is binding. The one follow-on action is a CTA into the real booking
 * flow, since "what is this and can I get rid of it" is the natural next
 * question once the answer comes back.
 */

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Camera, CalendarPlus, Info, Loader2, ScanLine, Sparkles, X } from "lucide-react";

import { classifyImage } from "@/services/aiService";
import { getCategory } from "@/config/domain";
import { useTheme } from "@/contexts/ThemeContext";
import PageContainer from "@/components/common/PageContainer";
import Aurora from "@/components/effects/Aurora";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 4;

/**
 * Aurora colour stops — bright green, pink and orange (the pink borrows
 * from EcoSetu's own peach/accent hue family, brightened into a true pink
 * so it reads clearly against both light and dark backgrounds rather than
 * the earlier all-green/amber take, which rendered too flat and washed-out
 * in light mode). Dark mode deepens the same three hues rather than
 * swapping to a different palette.
 *
 * Light and dark also get their own amplitude/blend/opacity: dark mode's
 * near-black background can absorb a stronger, higher-amplitude effect
 * without it reading as "too dark," but the same settings against light
 * mode's near-white background produced near-black troughs in the noise
 * pattern — lower amplitude/blend/opacity keeps light mode bright and
 * colourful instead.
 */
const AURORA_LIGHT = {
  colorStops: ["#4ADE80", "#F9A8D4", "#FDBA74"], // bright green / light pink / light orange
  amplitude: 0.7,
  blend: 0.4,
  opacityClass: "opacity-65",
};
const AURORA_DARK = {
  colorStops: ["#22C55E", "#D6449A", "#D68C45"], // deep green / rich pink / amber
  amplitude: 1.0,
  blend: 0.55,
  opacityClass: "opacity-90",
};

const ScanScrapPage = () => {
  const { isDark } = useTheme();
  const auroraSettings = isDark ? AURORA_DARK : AURORA_LIGHT;
  const fileInputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [classifying, setClassifying] = useState(false);
  const [result, setResult] = useState(null);

  const handleFiles = (fileList) => {
    const remaining = MAX_IMAGES - images.length;
    const files = Array.from(fileList).slice(0, remaining);
    const added = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...added]);
    setResult(null);
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
    setResult(null);
  };

  const runScan = async () => {
    if (images.length === 0) {
      toast.error("Add a photo first — AI needs something to look at.");
      return;
    }
    setClassifying(true);
    setResult(null);
    try {
      const data = await classifyImage(images.map((img) => img.file));
      setResult(data);
      if (!data.classification_possible || data.categories.length === 0) {
        toast.info(data.summary || "AI couldn't confidently identify this. Try a clearer, closer photo.");
      }
    } catch (err) {
      toast.error(err.message || "AI classification failed. Please try again.");
    } finally {
      setClassifying(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative background only — sits behind the page content via DOM
          order + z-index, ignores pointer events (Aurora.css), and fills
          this wrapper (which is `min-h-screen` so the effect covers the
          whole viewport even when the form content itself is short — the
          wrapper still grows past 100vh with the content, never clipping
          it, so this can never block scrolling, clicks, or push the page
          into horizontal overflow). The opacity wrapper (rather than a
          className prop, which the upstream Aurora component doesn't
          accept) keeps the effect from overpowering the form. */}
      <div className={cn("absolute inset-0", auroraSettings.opacityClass)}>
        <Aurora
          colorStops={auroraSettings.colorStops}
          amplitude={auroraSettings.amplitude}
          blend={auroraSettings.blend}
          speed={0.3}
        />
      </div>

      <PageContainer className="relative z-10 max-w-2xl space-y-6 py-6 sm:py-8">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-foreground">
            <ScanLine className="h-6 w-6 text-primary" />
            Scan Scrap
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Take or upload a photo and AI will identify what type of waste it is — no pickup required.
          </p>
        </div>

        {/* Photo picker */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap gap-2.5">
            <AnimatePresence initial={false}>
              {images.map((img) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2 }}
                  className="relative h-24 w-24 overflow-hidden rounded-xl border border-border"
                >
                  <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted/40"
              >
                <Camera className="h-5 w-5" />
                <span className="text-xs">Add photo</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <p className="mt-3 text-xs text-muted-foreground">
            Up to {MAX_IMAGES} photos, analysed together. Good lighting and a close-up shot give the best result.
          </p>

          <Button className="mt-4 w-full sm:w-auto" onClick={runScan} disabled={classifying || images.length === 0}>
            {classifying ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Analysing…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Scan with AI
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            {result.classification_possible && result.categories.length > 0 ? (
              <>
                <h2 className="font-heading text-base font-semibold text-foreground">What AI found</h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  {result.categories.map((c) => {
                    const category = getCategory(c.category);
                    const Icon = category.icon;
                    return (
                      <span
                        key={c.category}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
                          category.tint
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {category.label}
                        <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                          {Math.round(c.confidence * 100)}%
                        </span>
                      </span>
                    );
                  })}
                </div>

                {result.summary && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{result.summary}</p>
                )}

                {result.estimated_visible_item_count > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Estimated {result.estimated_visible_item_count} item
                    {result.estimated_visible_item_count === 1 ? "" : "s"} visible.
                  </p>
                )}

                {result.uncertainties?.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{result.uncertainties.join(" ")}</span>
                  </div>
                )}

                <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground/80">
                  <Sparkles className="h-3 w-3" />
                  AI estimate — a collector confirms the final category and weight on pickup.
                </p>

                <Button asChild className="mt-4">
                  <Link to="/pickups/new">
                    <CalendarPlus className="mr-1.5 h-4 w-4" />
                    Schedule a pickup for this
                  </Link>
                </Button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Couldn't confidently identify this</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.summary || "Try a clearer, closer photo with better lighting."}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </PageContainer>
    </div>
  );
};

export default ScanScrapPage;
