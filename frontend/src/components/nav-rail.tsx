"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Disc3, Home, Music4, Settings, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavItem {
  id: string;
  href: string;
  icon: LucideIcon;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", href: "/", icon: Home, labelKey: "home" },
  { id: "discovery", href: "/discovery", icon: Compass, labelKey: "discovery" },
  { id: "library", href: "/library", icon: Disc3, labelKey: "library" },
  { id: "settings", href: "/settings", icon: Settings, labelKey: "settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname === "/player";
  return pathname.startsWith(href);
}

/**
 * Global left nav rail (D45-adjacent shell). Faithful to the design handoff:
 * conic-gradient logo, neon active indicator, language switcher + theme toggle
 * pinned to the bottom. The Player is reached contextually (Home transition /
 * Library), matching the mockups which omit it from the rail.
 */
export function NavRail() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      className="relative z-[5] flex w-[76px] flex-none flex-col items-center gap-2 border-r border-line py-5"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
      }}
    >
      {/* logo mark */}
      <Link
        href="/"
        aria-label="Key Finder"
        className="relative mb-3.5 h-10 w-10"
      >
        <span
          className="absolute inset-0 rounded-xl opacity-90"
          style={{
            background:
              "conic-gradient(from 0deg, hsl(0 85% 60%), hsl(60 85% 60%), hsl(120 75% 55%), hsl(180 80% 58%), hsl(240 80% 65%), hsl(300 85% 62%), hsl(0 85% 60%))",
            filter: "blur(0.5px)",
          }}
        />
        <span className="absolute inset-[3px] flex items-center justify-center rounded-[10px] bg-[var(--kf-panel)]">
          <Music4 size={18} strokeWidth={2.2} className="text-white" />
        </span>
      </Link>

      {NAV_ITEMS.map((item) => {
        const on = isActive(pathname, item.href);
        const ItemIcon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            title={t(item.labelKey)}
            className={cn(
              "relative flex h-[52px] w-[52px] flex-col items-center justify-center gap-[3px] rounded-[15px] border transition-colors",
              on
                ? "border-line-strong text-white"
                : "border-transparent text-ink-subtle hover:text-ink-muted",
            )}
            style={
              on
                ? {
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))",
                    boxShadow:
                      "0 8px 22px -10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.18)",
                  }
                : undefined
            }
          >
            {on && (
              <span
                className="absolute left-[-20px] top-1/2 h-[22px] w-[3px] -translate-y-1/2 rounded-sm"
                style={{
                  background:
                    "linear-gradient(#fff, rgba(255,255,255,0.3))",
                }}
              />
            )}
            <ItemIcon size={20} strokeWidth={on ? 2.1 : 1.8} />
            <span className="text-[9px] font-semibold tracking-[0.01em]">
              {t(item.labelKey)}
            </span>
          </Link>
        );
      })}

      <div className="flex-1" />

      <LanguageSwitcher />
      <div className="mt-1">
        <ThemeToggle />
      </div>
    </nav>
  );
}
