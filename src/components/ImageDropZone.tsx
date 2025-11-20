import React, { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, ImagePlus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { isImageFile, isImagePath, collectImagePathsRecursive } from "@/lib/fs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

type Props = {
  onAdd: (filesOrPaths: File[] | string[]) => void;
};
export function ImageDropZone({ onAdd }: Props) {
  const [isDragging, setDragging] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();


  const onSelectFiles = useCallback(async () => {
    setError(null);
    setInfo(null);
    const res = (await open({ multiple: true })) as string | string[] | null;
    if (!res) return;
    const paths = Array.isArray(res) ? res : [res];
    const valid = paths.filter(isImagePath);
    const ignored = paths.length - valid.length;
    if (ignored > 0) setInfo(t("dropzone.ignoredNonImages", { count: ignored }));
    if (valid.length === 0) return;
    onAdd(valid);
  }, [onAdd, t]);

  const onSelectFolder = useCallback(async () => {
    setError(null);
    setInfo(null);
    const selected = (await open({ directory: true })) as string | string[] | null;
    const dir = Array.isArray(selected) ? selected[0] : selected;
    if (!dir) return;
    try {
      setScanning(true);
      const images = await collectImagePathsRecursive(dir);
      setScanning(false);
      if (images.length === 0) {
        setError(t("dropzone.emptyOrUnsupported"));
        return;
      }
      const batchSize = 50;
      for (let i = 0; i < images.length; i += batchSize) {
        onAdd(images.slice(i, i + batchSize));
        await new Promise((r) => setTimeout(r));
      }
      setInfo(t("dropzone.addedNFiles", { count: images.length }));
    } catch (e) {
      setScanning(false);
      setError(t("dropzone.readDirFailed"));
    }
  }, [onAdd, t]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      setError(null);
      setInfo(null);
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length > 0) {
        const validFiles = files.filter(isImageFile);
        const ignored = files.length - validFiles.length;
        if (ignored > 0) setInfo(t("dropzone.ignoredNonImages", { count: ignored }));
        if (validFiles.length > 0) onAdd(validFiles);
      }
    },
    [onAdd],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (e.target === dropRef.current) setDragging(false);
  }, []);

  return (
    <div className="flex items-center justify-center h-full">
      <motion.div
        ref={dropRef}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "flex flex-col items-center justify-center text-center rounded-[var(--radius)] border border-dashed border-sidebar-border/40 p-16 space-y-7 max-w-xl w-full bg-card/25 supports-[backdrop-filter]:bg-card/35 backdrop-blur-xl shadow-sm",
          isDragging && "bg-card/35 backdrop-blur-2xl",
        )}
        initial={{ y: 6 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <motion.span
          animate={{ scale: isDragging ? 1.06 : 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
        >
          <ImagePlus className="size-12 text-muted-foreground" />
        </motion.span>
        <div className="text-xl font-medium">{t("dropzone.prompt")}</div>
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            onClick={onSelectFiles}
            className="ring-1 ring-white/10 border border-white/15 !bg-white/10 supports-[backdrop-filter]:!bg-white/15 backdrop-blur-md text-foreground/90 shadow-sm transition-transform active:scale-[0.98] hover:!bg-white/20"
          >
            <ImagePlus className="size-4 mr-2" />
            {t("dropzone.addImages")}
          </Button>
          <Button variant="ghost" size="lg" onClick={onSelectFolder} className="text-muted-foreground">
            <FolderOpen className="size-4 mr-2" />
            {t("dropzone.importFromFolder")}
          </Button>
        </div>
        {(info || error || scanning) && (
          <div className="w-full max-w-xl space-y-2">
            {scanning && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Info className="size-4" />
                {t("dropzone.scanningDir")}
              </div>
            )}
            {info && !scanning && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Info className="size-4" />
                {info}
              </div>
            )}
            {error && (
              <Alert className="border-destructive/40 bg-destructive/10">
                <Info className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
