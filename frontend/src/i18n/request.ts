import { getRequestConfig } from "next-intl/server";

import { getUserLocale } from "./locale";

// Resolves the active locale + messages for every request (server components
// read this via NextIntlClientProvider in the root layout).
export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
