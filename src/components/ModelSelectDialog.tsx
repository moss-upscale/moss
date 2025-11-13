import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Model } from "@/lib/models";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

type Props = {
  models: Model[];
  selectedId?: string;
  onSelect: (modelId: string) => void;
};
export function ModelSelectDialog({ models, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const currentLabel = useMemo(() => {
    const found = models.find((m) => m.id === selectedId);
    if (found) return t(`models.${found.id}.name`, { defaultValue: found.id });
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

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
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
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {open &&
        createPortal(
          <motion.div
            className="fixed inset-0 z-50"
            aria-hidden={!open}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
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
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="p-3 sm:p-4 overflow-y-auto" style={{ maxHeight: "calc(80vh - 44px)" }}>
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
                                  {t(`models.${m.id}.name`, { defaultValue: m.id })}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3 flex-1 sm:flex sm:items-start sm:justify-between sm:gap-4">
                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                  {t(`models.${m.id}.description`, { defaultValue: "" })}
                                </p>
                                <div className="flex flex-wrap gap-2 sm:self-start">
                                  {scene ? (
                                    <Badge variant="outline" className="border-border/50">
                                      {t(`models.scenes.${scene}`, { defaultValue: scene })}
                                      </Badge>
                                  ) : null}
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
