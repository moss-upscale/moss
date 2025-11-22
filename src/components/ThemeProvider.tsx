import React, {createContext, useContext, useEffect, useMemo} from "react";
import {setTheme as setAppTheme} from "@tauri-apps/api/app";
import {useTauriStore} from "@/hooks/useTauriStore";
import {AVAILABLE_THEMES} from "@/styles/themes/import-all";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = { children: React.ReactNode; defaultTheme?: Theme };

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: ThemeProviderProps) {
  const [theme, setTheme] = useTauriStore<Theme>(
    "appearanceMode",
    defaultTheme,
    {
      validate: (v: unknown): v is Theme =>
        v === "light" || v === "dark" || v === "system",
    }
  );
  const [uiTheme] = useTauriStore<string>(
    "theme",
    AVAILABLE_THEMES.includes("default")
      ? "default"
      : AVAILABLE_THEMES[0] ?? "default",
    {
      validate: (v: unknown): v is string =>
        typeof v === "string" && AVAILABLE_THEMES.includes(v as string),
    }
  );

  const applyDark = (isDark: boolean) => {
    const el = document.documentElement;
    if (isDark) {
      el.classList.add("dark");
      el.style.colorScheme = "dark";
    } else {
      el.classList.remove("dark");
      el.style.colorScheme = "light";
    }
  };

  useEffect(() => {
    if (theme === "dark") {
      applyDark(true);
    } else if (theme === "light") {
      applyDark(false);
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      applyDark(prefersDark);
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      applyDark(Boolean(e.matches));
    };
    media.addEventListener("change", handler);
    return () => {
      media.removeEventListener("change", handler);
    };
  }, [theme]);

  useEffect(() => {
    (async () => {
      try {
        if (theme === "system") {
          await setAppTheme(null);
        } else {
          await setAppTheme(theme);
        }
      } catch {}
    })();
  }, [theme]);

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-theme", uiTheme);
  }, [uiTheme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "system",
      setTheme: () => {},
    } as ThemeContextValue;
  }
  return ctx;
}
