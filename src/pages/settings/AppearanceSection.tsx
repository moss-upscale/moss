import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {useTranslation} from "react-i18next";

type Props = {
  appTheme: string;
  setAppTheme: (v: string) => void;
  darkMode: string;
  setTheme: (v: string) => void;
  lang: string;
  setLang: (v: string) => void;
};

export default function AppearanceSection({
  appTheme,
  setAppTheme,
  darkMode,
  setTheme,
  lang,
  setLang,
}: Props) {
  const { t } = useTranslation();
  return (
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
                    placeholder={t("settings.appearance.theme.placeholder", {
                      defaultValue: "Select theme",
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="amber-minimal">Amber Minimal</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
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
                    placeholder={t("settings.appearance.mode.placeholder", {
                      defaultValue: "Select mode",
                    })}
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
                    placeholder={t("settings.appearance.language.placeholder", {
                      defaultValue: "Select language",
                    })}
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
  );
}
