import { useCallback, useRef } from "react";
import { useAppStore, type ImageItem } from "@/state/app-store";
import { processImage, cancelProcessing } from "@/lib/image";
import { listen, type Event } from "@tauri-apps/api/event";

export type ProcessingOptions = {
  outputDir?: string;
  overwrite?: boolean;
};
export function useProcessing() {
  const { state, dispatch } = useAppStore();
  const stopRequestedRef = useRef<boolean>(false);

  const startProcessing = useCallback(
    async (model: string, scale: number, options: ProcessingOptions) => {
      if (state.images.length === 0) return;
      console.info("[Moss] startProcessing", {
        count: state.images.length,
        model,
        scale,
        outputDir: options.outputDir,
        overwrite: options.overwrite,
      });
      stopRequestedRef.current = false;
      dispatch({ type: "RESET_IMAGE_STATUSES" });
      dispatch({ type: "SET_PROCESSING", payload: true });
      let unlistenFn: (() => void) | null = null;
      try {
        unlistenFn = await listen("processing_progress", (evt: Event<{ imageId: string; progress: number }>) => {
          const payload = evt.payload as { imageId: string; progress: number };
          if (payload) {
            dispatch({ type: "SET_IMAGE_PROGRESS", payload: { id: payload.imageId, progress: payload.progress } });
          }
        });
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
          dispatch({ type: "SET_IMAGE_STATUS", payload: { id: img.id, status: "processing" } });
          try {
            const res = await processImage(img as ImageItem, model, scale, {
              outputDir: options.outputDir,
              overwrite: options.overwrite,
            });
            if (res.outPath) {
              dispatch({ type: "SET_IMAGE_OUTPUT", payload: { id: img.id, outPath: res.outPath } });
              dispatch({ type: "SET_IMAGE_STATUS", payload: { id: img.id, status: "complete" } });
              console.info("[Moss] completed", { id: img.id, outPath: res.outPath });
            } else {
              dispatch({ type: "SET_IMAGE_STATUS", payload: { id: img.id, status: "error" } });
              console.warn("[Moss] no outPath returned", { id: img.id });
            }
          } catch (e) {
            dispatch({ type: "SET_IMAGE_STATUS", payload: { id: img.id, status: "error" } });
            console.error("[Moss] processing failed", { id: img.id, error: e });
          }
        }
      } finally {
        dispatch({ type: "SET_PROCESSING", payload: false });
        if (typeof unlistenFn === "function") {
          try { unlistenFn(); } catch {}
        }
        console.info("[Moss] processing finished");
      }
    },
    [state.images, dispatch]
  );

  const stopProcessing = useCallback(() => {
    stopRequestedRef.current = true;
    void cancelProcessing();
  }, []);

  const removeImage = useCallback(
    (id: string) => {
      const target = state.images.find((i) => i.id === id);
      if (target && target.src.startsWith("blob:")) URL.revokeObjectURL(target.src);
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
