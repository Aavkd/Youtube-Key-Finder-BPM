"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Disc3,
  Home,
  LogOut,
  Menu,
  Music4,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  href: string;
  icon: LucideIcon;
  labelKey: "home" | "discovery" | "library" | "settings";
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

export function NavRail() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [preferencesOpen, setPreferencesOpen] = React.useState(false);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setPreferencesOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!preferencesOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreferencesOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preferencesOpen]);

  return (
    <>
      <nav
        aria-label={t("primaryNavigation")}
        className="relative z-[5] hidden w-[76px] flex-none flex-col items-center gap-2 border-r border-line py-5 lg:flex"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
        }}
      >
        <Logo />
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.id} item={item} active={isActive(pathname, item.href)} label={t(item.labelKey)} />
        ))}
        <div className="flex-1" />
        <LanguageSwitcher />
        <div className="mt-1">
          <ThemeToggle />
        </div>
      </nav>

      <nav
        aria-label={t("primaryNavigation")}
        className="kf-mobile-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 items-start border-t border-line lg:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.id} item={item} active={isActive(pathname, item.href)} label={t(item.labelKey)} mobile />
        ))}
        <button
          type="button"
          onClick={() => setPreferencesOpen(true)}
          aria-label={t("quickPreferences")}
          className="flex min-h-[68px] min-w-0 flex-col items-center justify-center gap-1 text-ink-subtle"
        >
          <Menu size={20} />
          <span className="max-w-full truncate px-1 text-[10px] font-semibold">{t("more")}</span>
        </button>
      </nav>

      {preferencesOpen && (
        <div className="fixed inset-0 z-[70] flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label={t("quickPreferences")}>
          <button className="absolute inset-0 bg-black/60" aria-label={t("close")} onClick={() => setPreferencesOpen(false)} />
          <div className="kf-bottom-sheet relative w-full rounded-t-[24px] border border-line bg-[var(--kf-panel)] px-5 pb-5 pt-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-ink">{t("quickPreferences")}</h2>
              <button ref={closeButtonRef} type="button" onClick={() => setPreferencesOpen(false)} className="kf-touch-target rounded-xl text-ink-muted" aria-label={t("close")}>
                <X size={20} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-line py-3">
              <span className="text-sm text-ink-muted">{t("language")}</span>
              <LanguageSwitcher />
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-line py-3">
              <span className="text-sm text-ink-muted">{t("theme")}</span>
              <ThemeToggle />
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("kf-logout"))}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 text-sm font-semibold text-red-300"
            >
              <LogOut size={17} />
              {t("logout")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Logo() {
  return (
    <Link href="/" aria-label="Key Finder" className="relative mb-3.5 h-10 w-10">
      <span className="absolute inset-0 rounded-xl opacity-90" style={{ background: "conic-gradient(from 0deg, hsl(0 85% 60%), hsl(60 85% 60%), hsl(120 75% 55%), hsl(180 80% 58%), hsl(240 80% 65%), hsl(300 85% 62%), hsl(0 85% 60%))", filter: "blur(0.5px)" }} />
      <span className="absolute inset-[3px] flex items-center justify-center rounded-[10px] bg-[var(--kf-panel)]">
        <Music4 size={18} strokeWidth={2.2} className="text-white" />
      </span>
    </Link>
  );
}

function NavLink({ item, active, label, mobile = false }: { item: NavItem; active: boolean; label: string; mobile?: boolean }) {
  const ItemIcon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={label}
      className={cn(
        mobile
          ? "relative flex min-h-[68px] min-w-0 flex-col items-center justify-center gap-1 px-1"
          : "relative flex h-[52px] w-[52px] flex-col items-center justify-center gap-[3px] rounded-[15px] border",
        "transition-colors",
        active ? "text-white" : "text-ink-subtle hover:text-ink-muted",
        !mobile && (active ? "border-line-strong" : "border-transparent"),
      )}
      style={!mobile && active ? { background: "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))", boxShadow: "0 8px 22px -10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.18)" } : undefined}
    >
      {active && !mobile && <span className="absolute left-[-20px] top-1/2 h-[22px] w-[3px] -translate-y-1/2 rounded-sm bg-white/80" />}
      {active && mobile && <span className="absolute top-0 h-[2px] w-8 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />}
      <ItemIcon size={20} strokeWidth={active ? 2.1 : 1.8} />
      <span className={cn("max-w-full truncate font-semibold", mobile ? "px-0.5 text-[10px]" : "text-[9px]")}>{label}</span>
    </Link>
  );
}
