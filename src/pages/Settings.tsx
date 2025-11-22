import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {useState} from "react";
import {useTheme} from "@/components/ThemeProvider.tsx";
import {useTranslation} from "react-i18next";
import {i18n as i18nInstance} from "@/lib/i18n";
import {useTauriStore} from "@/hooks/useTauriStore";
import {AVAILABLE_THEMES} from "@/styles/themes/import-all";

export default function Settings() {
  const { theme: darkMode, setTheme } = useTheme();
  const { t } = useTranslation();
  const [appTheme, setAppTheme] = useTauriStore<string>(
    "theme",
    AVAILABLE_THEMES.includes("default")
      ? "default"
      : AVAILABLE_THEMES[0] ?? "default",
    {
      validate: (v: unknown): v is string =>
        typeof v === "string" && AVAILABLE_THEMES.includes(v as string),
    }
  );
  const [active, setActive] = useState<string>("appearance");
  const [lang, setLang] = useTauriStore<string>(
    "lang",
    i18nInstance.language?.startsWith("zh") ? "zh" : "en",
    {
      validate: (v: unknown): v is string =>
        v === "en" || v === "zh" || v === "system",
    }
  );

  return (
    <div className="h-svh bg-background text-foreground">
      <div className="grid h-full grid-cols-[168px_1fr]">
        <aside className="h-full border-r border-border/60 bg-sidebar">
          <div style={{ marginTop: "40px" }}></div>
          <nav className="p-2 space-y-1">
            <button
              type="button"
              className={`w-full text-left text-sm px-2.5 py-2 rounded-md transition-colors ${
                active === "appearance"
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => setActive("appearance")}
            >
              {t("settings.nav.appearance", { defaultValue: "Appearance" })}
            </button>
          </nav>
        </aside>
        <main className="p-5 h-full overflow-y-auto">
          {active === "appearance" && (
            <div className="space-y-6">
              <div className="text-base font-semibold">
                {t("settings.appearance.title", { defaultValue: "Appearance" })}
              </div>
              <div className="rounded-md border border-border bg-secondary/30 overflow-hidden">
                <div className="divide-y divide-border">
                  <div className="p-4 grid grid-cols-[1fr_auto] items-center gap-3">
                    <div>
                      <div className="text-sm font-medium">
                        {t("settings.appearance.theme.label", {
                          defaultValue: "Theme",
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("settings.appearance.theme.description", {
                          defaultValue: "Select application theme",
                        })}
                      </div>
                    </div>
                    <div className="ml-auto min-w-[160px] w-[200px] md:w-[220px]">
                      <Select value={appTheme} onValueChange={setAppTheme}>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t(
                              "settings.appearance.theme.placeholder",
                              { defaultValue: "Select theme" }
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_THEMES.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name === "default"
                                ? "Default"
                                : name
                                    .split("-")
                                    .map(
                                      (s) =>
                                        s.charAt(0).toUpperCase() + s.slice(1)
                                    )
                                    .join(" ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-[1fr_auto] items-center gap-3">
                    <div>
                      <div className="text-sm font-medium">
                        {t("settings.appearance.mode.label", {
                          defaultValue: "Appearance Mode",
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("settings.appearance.mode.description", {
                          defaultValue: "Choose light, dark or follow system",
                        })}
                      </div>
                    </div>
                    <div className="ml-auto min-w-[160px] w-[200px] md:w-[220px]">
                      <Select value={darkMode} onValueChange={setTheme}>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t(
                              "settings.appearance.mode.placeholder",
                              { defaultValue: "Select mode" }
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">
                            {t("settings.appearance.mode.options.system", {
                              defaultValue: "System",
                            })}
                          </SelectItem>
                          <SelectItem value="light">
                            {t("settings.appearance.mode.options.light", {
                              defaultValue: "Light",
                            })}
                          </SelectItem>
                          <SelectItem value="dark">
                            {t("settings.appearance.mode.options.dark", {
                              defaultValue: "Dark",
                            })}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-[1fr_auto] items-center gap-3">
                    <div>
                      <div className="text-sm font-medium">
                        {t("settings.appearance.language.label", {
                          defaultValue: "Language",
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("settings.appearance.language.description", {
                          defaultValue: "Select display language",
                        })}
                      </div>
                    </div>
                    <div className="ml-auto min-w-[160px] w-[200px] md:w-[220px]">
                      <Select value={lang} onValueChange={setLang}>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t(
                              "settings.appearance.language.placeholder",
                              { defaultValue: "Select language" }
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">
                            {t("settings.appearance.language.options.system")}
                          </SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="zh">中文</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
