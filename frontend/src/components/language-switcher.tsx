"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import { setUserLocale } from "@/i18n/locale";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** FR / EN switcher (D10): persists a cookie, then refreshes server messages. */
export function LanguageSwitcher() {
  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function select(locale: Locale) {
    if (locale === active || pending) return;
    startTransition(async () => {
      await setUserLocale(locale);
      router.refresh();
    });
  }

  return (
    <div className="kf-mono flex overflow-hidden rounded-[11px] border border-line text-[11px] font-semibold lg:flex-col">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => select(l)}
          className={cn(
            "min-h-[38px] min-w-[42px] px-[9px] py-[6px] text-center transition-colors",
            l === active
              ? "bg-white/90 text-[#0a0912]"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {localeLabels[l]}
        </button>
      ))}
    </div>
  );
}
