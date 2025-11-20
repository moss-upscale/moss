import {useEffect, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {ChevronDown, X, Check, Download, LoaderCircle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {cn} from "@/lib/utils";
import type {Model} from "@/lib/models";
import {useTranslation} from "react-i18next";
import {motion} from "framer-motion";
import {useModelAvailability} from "@/hooks/useModelAvailability";

type Props = {
  models: Model[];
  selectedId?: string;
  onSelect: (modelId: string) => void;
};

export function ModelSelectDialog({models, selectedId, onSelect}: Props) {
  const [open, setOpen] = useState(false);
  const {available, downloading, download} = useModelAvailability(models, open);
  const {t} = useTranslation();
  const close = () => setOpen(false);
  const overlayBg = "absolute inset-0 bg-sidebar/20 supports-[backdrop-filter]:bg-sidebar/35 backdrop-blur-xl backdrop-saturate-150";
  const modalCard = "w-[min(90vw,700px)] md:w-[min(88vw,660px)] max-h-[80vh] rounded-[var(--radius)] border border-sidebar-border/40 bg-card/35 backdrop-blur-xl shadow-lg";
  const currentLabel = useMemo(() => {
    const found = models.find((m) => m.id === selectedId);
    if (found) return t(`models.${found.id}.name`, {defaultValue: found.id});
    return t("common.notSelected");
  }, [models, selectedId, t]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);


  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
  }

  async function handleDownload(m: Model) {
    await download(m);
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
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-[var(--radius)] border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background transition-transform active:translate-y-[1px] focus:outline-none focus:ring-1 focus:ring-ring [&>span]:line-clamp-1",
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
              className={overlayBg}
              onClick={close}
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("model.select.label")}
              className="absolute inset-0 flex items-center justify-center p-4"
              onClick={close}
            >
              <motion.div
                className={modalCard}
                onClick={(e) => e.stopPropagation()}
                initial={{opacity: 0, y: 10, scale: 0.98}}
                animate={{opacity: 1, y: 0, scale: 1}}
                exit={{opacity: 0, y: 6, scale: 0.98}}
                transition={{type: "spring", stiffness: 260, damping: 22}}
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-sidebar-border/30">
                  <div className="text-base font-semibold">{t("model.select.label")}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("common.close")}
                    className="h-9 w-9"
                    onClick={close}
                  >
                    <X className="size-4"/>
                  </Button>
                </div>

                <div className="p-3 sm:p-4 overflow-y-auto max-h-[calc(80vh-44px)]">
                  <div className="grid grid-cols-1 gap-3 items-stretch">
                    {models.map((m) => {
                      const active = m.id === selectedId;
                      const scene = m.scenes[0];
                      return (
                        <Card
                          key={m.id}
                          className={cn(
                            "cursor-pointer select-none border-sidebar-border/40 bg-card/25 supports-[backdrop-filter]:bg-card/35 backdrop-blur-lg transition hover:bg-card/35 hover:border-sidebar-border/60 hover:shadow-md active:translate-y-[1px]",
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
                                <Badge variant="outline" className="border-sidebar-border/40 bg-card/15">
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
                                className="h-8 w-8 border-sidebar-border/40 bg-card/20 hover:bg-card/30 text-muted-foreground"
                                disabled={available[m.id] || downloading[m.id]}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(m);
                                }}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                }}
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
