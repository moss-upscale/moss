import {useCallback, useEffect, useState} from "react";
import type {Model} from "@/lib/models";
import {invoke} from "@tauri-apps/api/core";
import {listen} from "@tauri-apps/api/event";

export function useModelAvailability(models: Model[], open: boolean) {
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});

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

  const download = useCallback(async (m: Model) => {
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
  }, []);

  return {available, downloading, download};
}
