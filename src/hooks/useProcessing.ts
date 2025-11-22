import {useCallback, useRef} from "react";
import {type ImageItem, useAppStore} from "@/state/app-store";
import {cancelProcessing, processImage} from "@/lib/image";
import {type Event, listen} from "@tauri-apps/api/event";
import {isPermissionGranted, requestPermission, sendNotification,} from "@tauri-apps/plugin-notification";

export type ProcessingOptions = {
  outputDir?: string;
  overwrite?: boolean;
};

export function useProcessing() {
  const { state, dispatch } = useAppStore();
  const stopRequestedRef = useRef<boolean>(false);
  const notify = useCallback(async (message: string) => {
    let granted = await isPermissionGranted();
    if (!granted) {
      const perm = await requestPermission();
      granted = perm === "granted";
    }
    if (granted) sendNotification(message);
  }, []);

  const setImageStatus = useCallback(
    (id: string, status: "ready" | "processing" | "complete" | "error") => {
      dispatch({ type: "SET_IMAGE_STATUS", payload: { id, status } });
    },
    [dispatch]
  );

  const setImageProgress = useCallback(
    (id: string, progress: number) => {
      dispatch({ type: "SET_IMAGE_PROGRESS", payload: { id, progress } });
    },
    [dispatch]
  );

  const setImageOutput = useCallback(
    (id: string, outPath: string) => {
      dispatch({ type: "SET_IMAGE_OUTPUT", payload: { id, outPath } });
    },
    [dispatch]
  );

  const startProcessing = useCallback(
    async (model: string, scale: number, options: ProcessingOptions) => {
      if (state.images.length === 0) return;
      console.info("[Moss] startProcessing", {
        count: state.images.length,
        model,
        scale,
        outputDir: options.outputDir,
      });
      stopRequestedRef.current = false;
      dispatch({ type: "RESET_IMAGE_STATUSES" });
      dispatch({ type: "SET_PROCESSING", payload: true });
      let unlistenFn: (() => void) | null = null;
      const total = state.images.length;
      void notify(`Upscale started: ${total} image${total > 1 ? "s" : ""}`);
      let completed = 0;
      let failed = 0;
      try {
        unlistenFn = await listen(
          "processing_progress",
          (evt: Event<{ imageId: string; progress: number }>) => {
            const payload = evt.payload as {
              imageId: string;
              progress: number;
            };
            if (payload) {
              setImageProgress(payload.imageId, payload.progress);
            }
          }
        );
        const items = [...state.images];
        for (const img of items) {
          if (stopRequestedRef.current) {
            console.info("[Moss] stop requested — halting queue");
            break;
          }
          console.info("[Moss] processing item", {
            id: img.id,
            name: img.name,
            path: img.path,
          });
          setImageStatus(img.id, "processing");
          try {
            const res = await processImage(img as ImageItem, model, scale, {
              outputDir: options.outputDir,
            });
            if (res.outPath) {
              setImageOutput(img.id, res.outPath);
              setImageStatus(img.id, "complete");
              completed += 1;
              console.info("[Moss] completed", {
                id: img.id,
                outPath: res.outPath,
              });
            } else {
              setImageStatus(img.id, "error");
              failed += 1;
              console.warn("[Moss] no outPath returned", { id: img.id });
            }
          } catch (e) {
            setImageStatus(img.id, "error");
            failed += 1;
            console.error("[Moss] processing failed", { id: img.id, error: e });
          }
        }
      } finally {
        dispatch({ type: "SET_PROCESSING", payload: false });
        if (typeof unlistenFn === "function") {
          try {
            unlistenFn();
          } catch {}
        }
        console.info("[Moss] processing finished");
        if (stopRequestedRef.current) {
          void notify(`Upscale stopped: ${completed} done, ${failed} failed`);
        } else {
          void notify(`Upscale finished: ${completed} done, ${failed} failed`);
        }
      }
    },
    [
      state.images,
      dispatch,
      setImageProgress,
      setImageStatus,
      setImageOutput,
      notify,
    ]
  );

  const stopProcessing = useCallback(async () => {
    stopRequestedRef.current = true;
    void cancelProcessing();
    void notify("Upscale canceled.");
  }, [notify]);

  const removeImage = useCallback(
    (id: string) => {
      const target = state.images.find((i) => i.id === id);
      if (target && target.src.startsWith("blob:"))
        URL.revokeObjectURL(target.src);
      dispatch({ type: "REMOVE_IMAGE", payload: id });
    },
    [state.images, dispatch]
  );

  const clearImages = useCallback(() => {
    for (const img of state.images) {
      if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
    }
    dispatch({ type: "CLEAR_IMAGES" });
  }, [state.images, dispatch]);

  return { startProcessing, stopProcessing, removeImage, clearImages };
}
