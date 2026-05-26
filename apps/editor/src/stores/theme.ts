import { createSignal, createEffect } from "solid-js";

export type ThemeType = "light" | "dark" | "system";

// Parse initial state from localStorage or default to system
const getInitialTheme = (): ThemeType => {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem("glyphide-theme") as ThemeType;
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    } catch {
      // Ignore
    }
  }
  return "system";
};

const [theme, setThemeState] = createSignal<ThemeType>(getInitialTheme());

export const useTheme = () => {
  return {
    theme,
    setTheme: (newTheme: ThemeType) => {
      setThemeState(newTheme);
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        try {
          localStorage.setItem("glyphide-theme", newTheme);
        } catch {
          // ignore
        }
      }
    },
  };
};

// Listen for system preference changes
if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  
  const applyTheme = (currentTheme: ThemeType, systemPrefersDark: boolean) => {
    const isDark = currentTheme === "dark" || (currentTheme === "system" && systemPrefersDark);
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  // Initial application
  applyTheme(theme(), mediaQuery.matches);

  // Watch for internal theme changes
  createEffect(() => {
    applyTheme(theme(), mediaQuery.matches);
  });

  // Watch for system preference changes
  mediaQuery.addEventListener("change", (e) => {
    if (theme() === "system") {
      applyTheme("system", e.matches);
    }
  });
}
