import {useEffect, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ImageDropZone} from "@/components/ImageDropZone";
import {AppStoreProvider, useAppStore} from "@/state/app-store";
import {Sidebar} from "@/components/Sidebar";
import {Gallery} from "@/components/Gallery";
import {useProcessing} from "@/hooks/useProcessing";
import {useTranslation} from "react-i18next";
import {desktopDir, join} from "@tauri-apps/api/path";
import {ScrollArea} from "@/components/ui/scroll-area";


function AppInner() {
  const {state, dispatch} = useAppStore();
  useTranslation();
  const [model, setModel] = useState("real-esrgan-x4");
  const [scale, setScale] = useState(4);
  const [mode, setMode] = useState<"original" | "custom">("original");
  const [dir, setDir] = useState<string>("");
  const [overwrite, setOverwrite] = useState<boolean>(false);
  const {startProcessing, stopProcessing, removeImage, clearImages} = useProcessing();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const desk = await desktopDir();
        const out = await join(desk, "moss");
        if (mounted) setDir(out);
      } catch (err) {
        console.warn("[Moss] failed to resolve Desktop/moss", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <motion.div
      className="flex h-svh overflow-hidden"
      initial={false}
    >
      <motion.div
        initial={{x: -24}}
        animate={{x: 0}}
        transition={{type: "spring", stiffness: 220, damping: 24}}
      >
        <Sidebar
          onStart={() =>
            startProcessing(model, scale, {
              outputDir: mode === "custom" ? dir : undefined,
              overwrite: mode === "original" ? overwrite : false,
            })
          }
          onStop={stopProcessing}
          onClear={clearImages}
          model={model}
          setModel={setModel}
          scale={scale}
          setScale={setScale}
          mode={mode}
          setMode={setMode}
          dir={dir}
          setDir={setDir}
          overwrite={overwrite}
          setOverwrite={setOverwrite}
        />
      </motion.div>

      <motion.div
        className="flex-1 flex flex-col overflow-hidden"
        initial={{y: 10}}
        animate={{y: 0}}
        transition={{duration: 0.25}}
      >
        <AnimatePresence mode="wait">
          {state.images.length === 0 ? (
            <motion.div
              key="dropzone"
              className="flex-1 min-h-0 flex items-center justify-center"
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -8}}
              transition={{duration: 0.18}}
            >
              <ImageDropZone
                onAdd={(input) => {
                  if (Array.isArray(input) && typeof input[0] === "string") {
                    dispatch({type: "ADD_IMAGES_FROM_PATHS", payload: input as string[]});
                  } else {
                    dispatch({type: "ADD_IMAGES_FROM_FILES", payload: input as File[]});
                  }
                }}
              />
            </motion.div>
          ) : (
            <ScrollArea className="h-full w-full rounded-[var(--radius)]">
              <motion.div
                key="gallery"
                className="min-h-full p-4"
                initial={{opacity: 0, y: 8}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -8}}
                transition={{duration: 0.22}}
              >
                <Gallery items={state.images} onRemove={removeImage}/>
              </motion.div>
            </ScrollArea>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <AppInner/>
    </AppStoreProvider>
  );
}
