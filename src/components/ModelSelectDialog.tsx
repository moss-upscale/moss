import {useEffect, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {ChevronDown, X, Check, Download, LoaderCircle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {cn} from "@/lib/utils";
import type {Model} from "@/lib/models";
import {invoke} from "@tauri-apps/api/core";
import {listen} from "@tauri-apps/api/event";
import {useTranslation} from "react-i18next";
import {motion} from "framer-motion";

type Props = {
  models: Model[];
  selectedId?: string;
  onSelect: (modelId: string) => void;
};

export function ModelSelectDialog({models, selectedId, onSelect}: Props) {
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const {t} = useTranslation();
  const currentLabel = useMemo(() => {
    const found = models.find((m) => m.id === selectedId);
    if (found) return t(`models.${found.id}.name`, {defaultValue: found.id});
    return t("common.notSelected");
  }, [models, selectedId, t]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const map: Record<string, boolean> = {};
      for (const m of models) {
        try {
          map[m.id] = await invoke<boolean>("check_model_available", {
            modelFilename: m.fileName,
          });
        } catch {
          map[m.id] = false;
        }
      }
      setAvailable(map);
    })();
  }, [open, models]);

  useEffect(() => {
    if (!open) return;
    let unlisten: (() => void) | undefined;
    listen("model_download_progress", (event) => {
      const payload = event.payload as any;
      const filename = payload?.modelFilename as string | undefined;
      const percent = payload?.progress as number | null | undefined;
      if (!filename) return;
      const found = models.find((m) => m.fileName === filename);
      if (!found) return;
      if (typeof percent === "number" && percent >= 100) {
        setAvailable((a) => ({...a, [found.id]: true}));
        setDownloading((d) => ({...d, [found.id]: false}));
      } else {
        setDownloading((d) => ({...d, [found.id]: true}));
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, [open, models]);

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
  }

  async function handleDownload(m: Model) {
    try {
      setDownloading((d) => ({...d, [m.id]: true}));
      await invoke<string>("download_model", {
        modelFilename: m.fileName,
      });
      setAvailable((a) => ({...a, [m.id]: true}));
    } catch {
    } finally {
      setDownloading((d) => ({...d, [m.id]: false}));
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">{t("model.select.label")}</div>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background transition-transform active:translate-y-[1px] focus:outline-none focus:ring-1 focus:ring-ring [&>span]:line-clamp-1",
          !selectedId && "text-muted-foreground",
        )}
      >
        <span>{currentLabel}</span>
        <ChevronDown className="h-4 w-4 opacity-50"/>
      </button>

      {open &&
        createPortal(
          <motion.div
            className="fixed inset-0 z-50"
            aria-hidden={!open}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("model.select.label")}
              className="absolute inset-0 flex items-center justify-center p-4"
              onClick={() => setOpen(false)}
            >
              <motion.div
                className="w-[min(90vw,700px)] md:w-[min(88vw,660px)] max-h-[80vh] rounded-xl border border-border bg-card/95 shadow-lg"
                onClick={(e) => e.stopPropagation()}
                initial={{opacity: 0, y: 10, scale: 0.98}}
                animate={{opacity: 1, y: 0, scale: 1}}
                exit={{opacity: 0, y: 6, scale: 0.98}}
                transition={{type: "spring", stiffness: 260, damping: 22}}
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
                  <div className="text-base font-semibold">{t("model.select.label")}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("common.close")}
                    className="h-9 w-9 rounded-md"
                    onClick={() => setOpen(false)}
                  >
                    <X className="size-4"/>
                  </Button>
                </div>

                <div className="p-3 sm:p-4 overflow-y-auto" style={{maxHeight: "calc(80vh - 44px)"}}>
                  <div className="grid grid-cols-1 gap-3 items-stretch">
                    {models.map((m) => {
                      const active = m.id === selectedId;
                      const scene = m.scenes[0];
                      return (
                        <Card
                          key={m.id}
                          className={cn(
                            "cursor-pointer select-none border-border/40 bg-card/90 transition hover:bg-card/95 hover:border-border/70 hover:shadow-md active:translate-y-[1px]",
                            "flex flex-col h-full",
                            active && "ring-2 ring-primary/60 border-primary/50",
                          )}
                          onClick={() => handleSelect(m.id)}
                          aria-selected={active}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") handleSelect(m.id);
                          }}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-foreground">
                              {t(`models.${m.id}.name`, {defaultValue: m.id})}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 flex-1 sm:flex sm:items-start sm:justify-between sm:gap-4">
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                              {t(`models.${m.id}.description`, {defaultValue: ""})}
                            </p>
                            <div className="flex flex-wrap gap-2 sm:self-start">
                              {scene ? (
                                <Badge variant="outline" className="border-border/50">
                                  {t(`models.scenes.${scene}`, {defaultValue: scene})}
                                </Badge>
                              ) : null}
                              <Button
                                variant="outline"
                                size="icon"
                                aria-label={available[m.id]
                                  ? t("model.available", {defaultValue: "Available"})
                                  : (downloading[m.id]
                                    ? t("model.downloading", {defaultValue: "Downloading…"})
                                    : t("model.download", {defaultValue: "Download"}))}
                                className="h-8 w-8"
                                disabled={available[m.id] || downloading[m.id]}
                                onClick={() => handleDownload(m)}
                              >
                                {available[m.id] ? (
                                  <Check className="h-4 w-4 text-primary"/>
                                ) : downloading[m.id] ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin"/>
                                ) : (
                                  <Download className="h-4 w-4"/>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>,
          document.body,
        )}
    </div>
  );
}
