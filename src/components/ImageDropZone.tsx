import {useCallback, useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {open} from "@tauri-apps/plugin-dialog";
import {pickDirectory} from "@/lib/utils";
import {FolderOpen, ImagePlus} from "lucide-react";
import {cn} from "@/lib/utils";
import {collectImagePathsRecursive, isImagePath} from "@/lib/fs";
import {useTranslation} from "react-i18next";
import {Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle,} from "@/components/ui/empty";
import {listen} from "@tauri-apps/api/event";

type Props = {
  onAdd: (filesOrPaths: File[] | string[]) => void;
};

export function ImageDropZone({ onAdd }: Props) {
  const [isDragging, setDragging] = useState(false);
  const { t } = useTranslation();

  const BATCH_SIZE = 50;

  const addInBatches = useCallback(
    async (paths: string[]) => {
      for (let i = 0; i < paths.length; i += BATCH_SIZE) {
        onAdd(paths.slice(i, i + BATCH_SIZE));
        await new Promise((r) => setTimeout(r));
      }
    },
    [onAdd]
  );

  const addFromPaths = useCallback(
    async (paths: string[]) => {
      const flags = await Promise.all(paths.map((p) => isImagePath(p)));
      const imagePaths = paths.filter((_, i) => flags[i]);
      if (imagePaths.length > 0) {
        await addInBatches(imagePaths);
      }

      const nonImagePaths = paths.filter((_, i) => !flags[i]);
      for (const dir of nonImagePaths) {
        try {
          const images = await collectImagePathsRecursive(dir);
          if (images.length > 0) {
            await addInBatches(images);
          }
        } catch (e) {}
      }
    },
    [addInBatches]
  );

  const onSelectFiles = useCallback(async () => {
    const res = (await open({ multiple: true })) as string | string[] | null;
    if (!res) return;

    const paths = Array.isArray(res) ? res : [res];
    await addFromPaths(paths);
  }, [addFromPaths]);

  const onSelectFolder = useCallback(async () => {
    const dir = await pickDirectory();
    if (!dir) return;
    try {
      const images = await collectImagePathsRecursive(dir);
      await addInBatches(images);
    } catch {}
  }, [addInBatches]);

  useEffect(() => {
    const unlistenEnter = listen("tauri://drag-enter", () => {
      setDragging(true);
    });
    const unlistenLeave = listen("tauri://drag-leave", () => {
      setDragging(false);
    });
    const unlistenDrop = listen("tauri://drag-drop", async (event) => {
      const { paths } = event.payload as { paths: string[] };
      await addFromPaths(paths);
      setDragging(false);
    });

    return () => {
      unlistenEnter.then((f) => f());
      unlistenLeave.then((f) => f());
      unlistenDrop.then((f) => f());
    };
  }, [addFromPaths]);

  return (
    <div className="flex items-center justify-center h-full">
      <div
        className={cn(
          "rounded-xl transition-colors",
          isDragging &&
            "bg-card/50 supports-[backdrop-filter]:bg-card/60 backdrop-blur-xl"
        )}
      >
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImagePlus className="size-12 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle className="text-xl text-foreground">
              {t("dropzone.prompt")}
            </EmptyTitle>
          </EmptyHeader>

          <EmptyContent>
            <div className="flex items-center gap-4">
              <Button size="lg" onClick={onSelectFiles}>
                <ImagePlus className="size-4 mr-2" />
                {t("dropzone.addImages")}
              </Button>

              <Button
                variant="ghost"
                size="lg"
                onClick={onSelectFolder}
                className="text-muted-foreground"
              >
                <FolderOpen className="size-4 mr-2" />
                {t("dropzone.importFromFolder")}
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  );
}
