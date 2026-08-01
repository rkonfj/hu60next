"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ThemeMode = "auto" | "dark" | "light";

type ThemeSwitcherProps = {
  variant?: "header" | "mobile";
};

const THEME_STORAGE_KEY = "hulvlin-theme";
const themeOptions = [
  { value: "auto", label: "自动模式", icon: Monitor },
  { value: "dark", label: "暗黑模式", icon: Moon },
  { value: "light", label: "白天模式", icon: Sun }
] satisfies Array<{
  value: ThemeMode;
  label: string;
  icon: typeof Monitor;
}>;

function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "auto" || value === "dark" || value === "light";
}

function readThemeMode(): ThemeMode {
  const documentMode = document.documentElement.dataset.themeMode;
  if (isThemeMode(documentMode)) return documentMode;

  try {
    const storedMode = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(storedMode) ? storedMode : "auto";
  } catch {
    return "auto";
  }
}

function applyResolvedTheme(mode: ThemeMode) {
  const resolvedTheme =
    mode === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  const root = document.documentElement;

  root.dataset.theme = resolvedTheme;
  root.dataset.themeMode = mode;
  root.style.colorScheme = resolvedTheme;
}

function ThemeOptionButtons({
  mode,
  onSelect
}: {
  mode: ThemeMode;
  onSelect: (mode: ThemeMode) => void;
}) {
  return themeOptions.map(({ value, label, icon: Icon }) => (
    <button
      key={value}
      type="button"
      aria-pressed={mode === value}
      onClick={() => onSelect(value)}
    >
      <Icon size={16} />
      <span>{label}</span>
      {mode === value ? <Check className="theme-option-check" size={15} /> : null}
    </button>
  ));
}

export function ThemeSwitcher({
  variant = "header"
}: ThemeSwitcherProps) {
  const [mode, setMode] = useState<ThemeMode>("auto");
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const syncMode = () => {
      const nextMode = readThemeMode();
      applyResolvedTheme(nextMode);
      setMode(nextMode);
    };
    const handleSystemThemeChange = () => {
      if (readThemeMode() === "auto") {
        applyResolvedTheme("auto");
      }
    };

    syncMode();
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    systemTheme.addEventListener("change", handleSystemThemeChange);
    window.addEventListener("storage", syncMode);
    window.addEventListener("hulvlin:theme-changed", syncMode);

    return () => {
      systemTheme.removeEventListener("change", handleSystemThemeChange);
      window.removeEventListener("storage", syncMode);
      window.removeEventListener("hulvlin:theme-changed", syncMode);
    };
  }, []);

  useEffect(() => {
    if (variant !== "header") return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        menuRef.current?.open &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        menuRef.current.removeAttribute("open");
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuRef.current?.open) {
        menuRef.current.removeAttribute("open");
        menuRef.current.querySelector<HTMLElement>("summary")?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [variant]);

  const selectTheme = (nextMode: ThemeMode) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch {
      // The theme still applies for the current page when storage is unavailable.
    }
    applyResolvedTheme(nextMode);
    setMode(nextMode);
    window.dispatchEvent(new Event("hulvlin:theme-changed"));
    menuRef.current?.removeAttribute("open");
  };

  if (variant === "mobile") {
    return (
      <section className="mobile-theme-selector" aria-label="主题选择">
        <strong>主题</strong>
        <div>
          <ThemeOptionButtons mode={mode} onSelect={selectTheme} />
        </div>
      </section>
    );
  }

  const activeOption =
    themeOptions.find((option) => option.value === mode) ?? themeOptions[0];
  const ActiveIcon = activeOption.icon;

  return (
    <details className="header-theme-menu" ref={menuRef}>
      <summary
        className="icon-button"
        aria-label={`切换主题，当前为${activeOption.label}`}
        title={`主题：${activeOption.label}`}
      >
        <ActiveIcon size={17} />
      </summary>
      <div
        className="header-theme-popover"
        role="group"
        aria-label="主题选择"
      >
        <ThemeOptionButtons mode={mode} onSelect={selectTheme} />
      </div>
    </details>
  );
}
