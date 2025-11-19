import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Trash2, X} from "lucide-react";
import {useTranslation} from "react-i18next";
import type {ImageItem} from "@/state/app-store";
import {AnimatePresence, motion} from "framer-motion";
import {useCallback, useEffect, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {ImgComparisonSlider} from "@img-comparison-slider/react";
import {convertFileSrc} from "@tauri-apps/api/core";


export type GalleryProps = {
  items: ImageItem[];
  onRemove: (id: string) => void;
};

function StatusBadge({status, label}: { status: ImageItem["status"]; label: string }) {
  return (
    <motion.div
      key={`badge-${status}`}
      className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/45 text-white text-xs shadow-sm ring-1 ring-white/10 backdrop-blur-sm"
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
    >
      {label}
    </motion.div>
  );
}

function GalleryItem({item, onClick, onRemove}: {
  item: ImageItem;
  onClick?: () => void;
  onRemove: (id: string) => void
}) {
  const {t} = useTranslation();
  const clickable = item.status === "complete";
  return (
    <motion.div
      key={item.id}
      layout
      initial={{opacity: 0, y: 8, scale: 0.98}}
      animate={{opacity: 1, y: 0, scale: 1}}
      exit={{opacity: 0, y: -6, scale: 0.98}}
      transition={{duration: 0.18}}
      whileHover={{scale: 1.015}}
    >
      <Card className="group bg-card/95 border-border/15 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div
            className="aspect-[2/1] w-full bg-muted/10 relative"
            role={clickable ? "button" : undefined}
            aria-haspopup={clickable ? "dialog" : undefined}
            aria-label={item.name}
            onClick={() => {
              if (clickable) onClick?.();
            }}
          >
            <motion.img
              src={item.src}
              alt={item.name}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              initial={{opacity: 0, scale: 1.01}}
              animate={{opacity: 1, scale: 1}}
              transition={{duration: 0.24}}
              whileHover={{scale: 1.03}}
            />
            <AnimatePresence mode="wait">
              {item.status === "processing" && (
                <StatusBadge status={item.status} label={t("status.processing")}/>
              )}
              {item.status === "complete" && (
                <StatusBadge status={item.status} label={t("status.complete")}/>
              )}
            </AnimatePresence>
          </div>
          <div className="px-4 py-2 bg-card/85 border-t border-border/25">
            <div className="text-base font-medium text-foreground truncate">{item.name}</div>
            <div className="mt-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={
                    `size-2 rounded-full ` +
                    (item.status === "complete"
                      ? "bg-green-400"
                      : item.status === "processing"
                        ? "bg-blue-400 animate-pulse"
                        : item.status === "ready"
                          ? "bg-zinc-400/60"
                          : "bg-red-500")
                  }
                  style={{transition: "background-color 200ms ease"}}
                />
                {item.status === "processing" && (
                  <span className="text-muted-foreground">{Math.round(item.progress ?? 0)}%</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("common.deleteFile")}
                  className="h-6 w-6 rounded-md bg-card/30 hover:bg-card/40 border border-border/20 text-foreground/80 transition-transform active:scale-[0.98]"
                  onClick={() => onRemove(item.id)}
                  disabled={item.status !== "ready"}
                >
                  <Trash2 className="size-3"/>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CompareModal({selected, origSrc, resultSrc, onClose}: {
  selected: ImageItem;
  origSrc: string;
  resultSrc: string;
  onClose: () => void
}) {
  const {t} = useTranslation();
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    if (!origSrc || !resultSrc) return;
    let loaded1 = false;
    let loaded2 = false;
    const img1 = new Image();
    const img2 = new Image();
    const trySet = () => {
      if (loaded1 && loaded2) {
        const r1 = img1.naturalWidth && img1.naturalHeight ? img1.naturalWidth / img1.naturalHeight : null;
        const r2 = img2.naturalWidth && img2.naturalHeight ? img2.naturalWidth / img2.naturalHeight : null;
        if (r1 && r2) setRatio(Math.min(r1, r2));
      }
    };
    img1.onload = () => {
      loaded1 = true;
      trySet();
    };
    img2.onload = () => {
      loaded2 = true;
      trySet();
    };
    img1.src = origSrc;
    img2.src = resultSrc;
    return () => {
      img1.onload = null;
      img2.onload = null;
    };
  }, [origSrc, resultSrc]);
  return createPortal(
    <motion.div className="fixed inset-0 z-50" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
      <motion.div
        className="absolute inset-0 bg-black/45 backdrop-blur-md"
        onClick={onClose}
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("status.complete")}
        className="absolute inset-0 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          className="w-[min(98vw,1200px)] max-h-[92vh] rounded-xl border border-border bg-card/70 backdrop-blur-xl shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          initial={{opacity: 0, y: 10, scale: 0.98}}
          animate={{opacity: 1, y: 0, scale: 1}}
          exit={{opacity: 0, y: 6, scale: 0.98}}
          transition={{type: "spring", stiffness: 260, damping: 22}}
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
            <div className="text-base font-semibold truncate mr-2">{selected.name}</div>
            <Button variant="ghost" size="icon" aria-label={t("common.close")} className="h-9 w-9 rounded-md"
                    onClick={onClose}>
              <X className="size-4"/>
            </Button>
          </div>
          <div className="p-3 flex items-center justify-center" style={{maxHeight: "calc(92vh - 44px)"}}>
            <ImgComparisonSlider
              tabIndex={-1}
              className="outline-none ring-0 focus:outline-none focus:ring-0 border-0"
              style={{
                height: "min(85vh,900px)",
                aspectRatio: ratio ?? undefined,
                maxWidth: "100%",
                outline: "none",
                border: 0,
                ["--divider-width" as any]: "2px",
                ["--divider-color" as any]: "rgba(255,255,255,0.85)",
                ["--divider-shadow" as any]: "0 0 0 1px rgba(0,0,0,0.35)",
                ["--default-handle-width" as any]: "56px",
                ["--default-handle-color" as any]: "#fff",
                ["--default-handle-opacity" as any]: "0.95",
                ["--default-handle-shadow" as any]: "0 0 0 2px rgba(0,0,0,0.35), 0 2px 10px rgba(0,0,0,0.45)",
              } as any}
            >
              <img
                slot="first"
                src={origSrc}
                alt={t("status.ready")}
                style={{width: "100%", height: "100%", objectFit: "contain", display: "block"}}
              />
              <img
                slot="second"
                src={resultSrc}
                alt={t("status.complete")}
                style={{width: "100%", height: "100%", objectFit: "contain", display: "block"}}
              />
            </ImgComparisonSlider>
          </div>
        </motion.div>
      </div>
    </motion.div>,
    document.body,
  );
}

export function Gallery({items, onRemove}: GalleryProps) {
  const [selected, setSelected] = useState<ImageItem | null>(null);
  const [origBlobUrl, setOrigBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    if (selected) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selected]);

  useEffect(() => {
    if (!selected?.file) {
      if (origBlobUrl) {
        URL.revokeObjectURL(origBlobUrl);
        setOrigBlobUrl(null);
      }
      return;
    }
    const url = URL.createObjectURL(selected.file);
    setOrigBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setOrigBlobUrl(null);
    };
  }, [selected]);

  const origSrc = useMemo(() => {
    if (!selected) return null;
    if (selected.path) return convertFileSrc(selected.path);
    if (origBlobUrl) return origBlobUrl;
    return selected.src;
  }, [selected, origBlobUrl]);

  const resultSrc = useMemo(() => {
    if (!selected) return null;
    if (selected.resultPath) return convertFileSrc(selected.resultPath);
    return selected.src;
  }, [selected]);

  const openItem = useCallback((item: ImageItem) => setSelected(item), []);
  const closeModal = useCallback(() => setSelected(null), []);

  return (
    <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <GalleryItem key={item.id} item={item} onClick={() => openItem(item)} onRemove={onRemove}/>
        ))}
      </AnimatePresence>
      {selected && origSrc && resultSrc && (
        <CompareModal selected={selected} origSrc={origSrc} resultSrc={resultSrc} onClose={closeModal}/>
      )}
    </div>
  );
}
