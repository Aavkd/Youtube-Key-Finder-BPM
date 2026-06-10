"use server";

// Cookie-based locale (no i18n routing): the language switcher persists the
// choice in a cookie and the server reads it per request. Official next-intl
// "without i18n routing" pattern (D10).
import { cookies } from "next/headers";

import { LOCALE_COOKIE, defaultLocale, locales, type Locale } from "./config";

export async function getUserLocale(): Promise<Locale> {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}

export async function setUserLocale(locale: Locale): Promise<void> {
  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
