import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Slider} from "@/components/ui/slider";
import {Button} from "@/components/ui/button";
import {ProcessingControls} from "@/components/ProcessingControls";
import {OutputDestination} from "@/components/OutputDestination";
import {useAppStore} from "@/state/app-store";
import {ModelSelectDialog} from "@/components/ModelSelectDialog";
import {MODELS} from "@/lib/models";
import {useTranslation} from "react-i18next";
import {useAppVersion} from "@/hooks/useAppVersion";
import {SiGithub} from "@icons-pack/react-simple-icons";
import {Settings as SettingsIcon} from "lucide-react";
import {invoke} from "@tauri-apps/api/core";

type Mode = "original" | "custom";

export type SidebarProps = {
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  model: string;
  setModel: (m: string) => void;
  scale: number;
  setScale: (s: number) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  dir: string;
  setDir: (d: string) => void;
  overwrite: boolean;
  setOverwrite: (v: boolean) => void;
};

export function Sidebar({
  onStart,
  onStop,
  onClear,
  model,
  setModel,
  scale,
  setScale,
  mode,
  setMode,
  dir,
  setDir,
  overwrite,
  setOverwrite,
}: SidebarProps) {
  const { state } = useAppStore();
  const { t } = useTranslation();
  const appVersion = useAppVersion();
  const openPreferences = async () => {
    try {
      await invoke("open_settings_window");
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <aside className="w-80 h-full shrink-0 border-r border-border bg-sidebar/95 p-4 flex flex-col overflow-y-auto">
      <div style={{ marginTop: "24px" }} className="space-y-4">
        <div className="flex items-center justify-between">
          <h1
            style={{ marginLeft: "4px" }}
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {t("app.title")}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open Settings"
            onClick={openPreferences}
            className="text-muted-foreground"
          >
            <SettingsIcon className="size-4" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("model.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ModelSelectDialog
              models={MODELS}
              selectedId={model}
              onSelect={setModel}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("sidebar.scale.title")}
                </span>
                <span className="text-muted-foreground">
                  {t("sidebar.scale.current", { value: scale })}
                </span>
              </div>
              <Slider
                value={[scale]}
                min={2}
                max={16}
                step={1}
                onValueChange={(v) => setScale(v[0])}
                className="px-1"
                disabled={state.isProcessing}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>2x</span>
                <span>16x</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <OutputDestination
          mode={mode}
          setMode={setMode}
          dir={dir}
          setDir={setDir}
          overwrite={overwrite}
          setOverwrite={setOverwrite}
        />

        <ProcessingControls
          canStart={state.images.length > 0}
          onStart={onStart}
          isProcessing={state.isProcessing}
          onStop={onStop}
          onClear={onClear}
        />
      </div>

      <div className="mt-auto pt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{appVersion ? `v${appVersion}` : ""}</span>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/Lortunate/moss"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("common.source")}
            title={t("common.source")}
          >
            <SiGithub />
          </a>
        </div>
      </div>
    </aside>
  );
}
