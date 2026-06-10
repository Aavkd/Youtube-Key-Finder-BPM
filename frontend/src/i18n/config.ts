// Supported UI locales (D10). FR + EN from the start; never hard-code strings.
export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "EN",
  fr: "FR",
};

export const LOCALE_COOKIE = "NEXT_LOCALE";
