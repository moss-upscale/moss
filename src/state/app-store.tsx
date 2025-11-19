import React, { createContext, useContext, useMemo, useReducer } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

function genId(): string {
  const c = typeof crypto !== "undefined" ? (crypto as unknown as { randomUUID?: () => string }) : undefined;
  if (c?.randomUUID) return c.randomUUID();
  const n = (genId as any)._cnt = ((genId as any)._cnt || 0) + 1;
  return `${Date.now()}_${n}`;
}

export type ImageStatus = "ready" | "processing" | "complete" | "error";

export type ImageItem = {
  id: string;
  src: string;
  name: string;
  status: ImageStatus;
  progress?: number;
  path?: string;
  file?: File;
  resultPath?: string;
};

type State = {
  images: ImageItem[];
  isProcessing: boolean;
};

type Action =
  | { type: "ADD_IMAGES_FROM_PATHS"; payload: string[] }
  | { type: "ADD_IMAGES_FROM_FILES"; payload: File[] }
  | { type: "CLEAR_IMAGES" }
  | { type: "SET_PROCESSING"; payload: boolean }
  | { type: "REMOVE_IMAGE"; payload: string }
  | { type: "SET_IMAGE_STATUS"; payload: { id: string; status: ImageStatus } }
  | { type: "SET_IMAGE_OUTPUT"; payload: { id: string; outPath?: string; src?: string } }
  | { type: "SET_IMAGE_PROGRESS"; payload: { id: string; progress: number } }
  | { type: "RESET_IMAGE_STATUSES" };

const initialState: State = {
  images: [],
  isProcessing: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_IMAGES_FROM_PATHS": {
      const items: ImageItem[] = action.payload.map((p) => ({
        id: genId(),
        src: convertFileSrc(p),
        name: p.split(/[/\\]/).pop() || "image",
        status: "ready",
        path: p,
      }));
      return { ...state, images: [...state.images, ...items] };
    }
    case "ADD_IMAGES_FROM_FILES": {
      const items: ImageItem[] = action.payload.map((f) => ({
        id: genId(),
        src: URL.createObjectURL(f),
        name: f.name ?? "image",
        status: "ready",
        file: f,
      }));
      return { ...state, images: [...state.images, ...items] };
    }
    case "CLEAR_IMAGES":
      return { ...state, images: [] };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.payload };
    case "REMOVE_IMAGE":
      return { ...state, images: state.images.filter((i) => i.id !== action.payload) };
    case "SET_IMAGE_STATUS":
      return {
        ...state,
        images: state.images.map((i) => (i.id === action.payload.id ? { ...i, status: action.payload.status } : i)),
      };
    case "SET_IMAGE_OUTPUT": {
      const isTauri = typeof window !== "undefined" && Boolean((window as any).__TAURI__);
      return {
        ...state,
        images: state.images.map((i) => {
          if (i.id !== action.payload.id) return i;
          const next: ImageItem = { ...i };
          if (action.payload.src) {
            next.src = action.payload.src;
          } else if (action.payload.outPath) {
            next.src = isTauri ? convertFileSrc(action.payload.outPath) : i.src;
            next.resultPath = action.payload.outPath;
          }
          return next;
        }),
      };
    }
    case "SET_IMAGE_PROGRESS":
      return {
        ...state,
        images: state.images.map((i) =>
          i.id === action.payload.id ? { ...i, progress: action.payload.progress } : i
        ),
      };
    case "RESET_IMAGE_STATUSES":
      return {
        ...state,
        images: state.images.map((i) => ({ ...i, status: "ready", progress: 0 })),
      };
    default:
      return state;
  }
}

type AppStoreContextValue = {
  state: State;
  dispatch: React.Dispatch<Action>;
};

const AppStoreContext = createContext<AppStoreContextValue | null>(null);
export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}
export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
