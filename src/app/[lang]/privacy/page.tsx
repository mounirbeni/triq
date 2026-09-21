import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { dictionaryOf, getDictionary } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/site";

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await dictionaryOf(locale);
  return {
    title: t.privacyPage.metaTitle,
    description: t.privacyPage.metaDescription,
    alternates: localeAlternates("/privacy", locale),
  };
}

export default async function PrivacyPage() {
  const t = await getDictionary();
  const p = t.privacyPage;
  return (
    <LegalPage title={p.title} updated={p.updated} intro={p.intro} sections={p.sections} />
  );
}
