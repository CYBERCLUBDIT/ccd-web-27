"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { themeStorageKey as storageKey } from "@/lib/theme";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}
function subscribe(callback: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) {
      applyTheme(event.newValue !== "light");
      callback();
    }
  };
  window.addEventListener("club-theme-change", callback);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener("club-theme-change", callback);
    window.removeEventListener("storage", storage);
  };
}
export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => true,
  );
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Button
      variant="outline"
      size="icon"
      className="theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => {
        applyTheme(!dark);
        try {
          localStorage.setItem(storageKey, dark ? "light" : "dark");
        } catch {
          /* Theme still works when storage is unavailable. */
        }
        window.dispatchEvent(new Event("club-theme-change"));
      }}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
