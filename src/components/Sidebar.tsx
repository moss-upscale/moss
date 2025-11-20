import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

import {Slider} from "@/components/ui/slider";
import {ProcessingControls} from "@/components/ProcessingControls";
import {OutputSettings} from "@/components/OutputSettings";
import {useAppStore} from "@/state/app-store";
import {ModelSelectDialog} from "@/components/ModelSelectDialog";
import {MODELS} from "@/lib/models";
import {useTranslation} from "react-i18next";
import {useAppVersion} from "@/hooks/useAppVersion";


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

export function Sidebar(
  {
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
    setOverwrite
  }: SidebarProps
) {
  const {state} = useAppStore();
  const {t} = useTranslation();
  const appVersion = useAppVersion();
  return (
    <aside className="w-80 h-full shrink-0 border-r border-sidebar-border/40 bg-sidebar/20 supports-[backdrop-filter]:bg-sidebar/35 backdrop-blur-xl backdrop-saturate-150 p-4 flex flex-col overflow-y-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="space-y-4 mt-6">
        <h1 className="text-lg font-semibold tracking-tight ml-1">{t("app.title")}</h1>

        <Card className="bg-card/30 border border-sidebar-border/30 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">{t("model.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ModelSelectDialog models={MODELS} selectedId={model} onSelect={setModel}/>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("sidebar.scale.title")}</span>
                <span className="text-muted-foreground">{t("sidebar.scale.current", {value: scale})}</span>
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

        <OutputSettings mode={mode} setMode={setMode} dir={dir} setDir={setDir} overwrite={overwrite}
                        setOverwrite={setOverwrite}/>

        <ProcessingControls canStart={state.images.length > 0} onStart={onStart} isProcessing={state.isProcessing}
                            onStop={onStop} onClear={onClear}/>
      </div>

      <div
        className="mt-auto border-t border-sidebar-border/30 pt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{appVersion ? `v${appVersion}` : ""}</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="https://github.com/Lortunate/moss" target="_blank"
               rel="noopener noreferrer">{t("common.source")}</a>
          </Button>
        </div>
      </div>
    </aside>
  );
}
