/* ============================================================
   نطاق الموقع — مصدر واحد

   كان مكتوب بيدو ف4 بلايص (layout, sitemap, robots, mail)، وملي
   تبدّل النطاق من .com لـ.ma كان خاص تبديل كل وحدة على حدة —
   ونسيان وحدة معناها روابط كتوجّه لنطاق ماشي ديالنا: sitemap
   كيصرّح بروابط ماكايناش، وأزرار الإيميل كتحيّد المستعمل برّا.

   NEXT_PUBLIC_SITE_URL كتغلب — مفيدة للتجريب على نطاق مؤقت ديال
   Vercel بلا ما نبدّلو الكود.
   ============================================================ */

import { DEFAULT_LOCALE, LOCALES, localePath, type Locale } from "@/lib/i18n/config";

const DEFAULT_SITE_URL = "https://tarique.ma";

/** جذر الموقع بلا شرطة مائلة فالآخر: "https://tarique.ma" */
export const siteUrl = (): string =>
  (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");

/** رابط مطلق من مسار داخلي: "/messages" → "https://tarique.ma/messages" */
export const absoluteUrl = (path: string): string =>
  `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * canonical + hreflang لنفس الصفحة عبر كل اللغات المدعومة — بلا هادشي
 * Google كيشوف "/ar/cars" و"/fr/cars" بحال جوج صفحات منفصلين وماشي
 * نسخ ديال نفس المحتوى، وهاد الشي كيفرّق مؤشر SEO بين اللغتين
 * بدل ما يتجمّع فصفحة وحدة.
 */
export function localeAlternates(
  pathname: string,
  locale: Locale,
): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localePath(pathname, l);
  languages["x-default"] = localePath(pathname, DEFAULT_LOCALE);
  return { canonical: localePath(pathname, locale), languages };
}
