import type { Metadata } from "next";
import { Suspense } from "react";
import { AdvancedSearch } from "@/components/AdvancedSearch";
import { SmartSearch } from "@/components/SmartSearch";
import { Search } from "@/components/icons";
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
    title: t.searchPage.metaTitle,
    description: t.searchPage.metaDesc,
    alternates: localeAlternates("/search", locale),
  };
}

export default async function SearchPage() {
  const t = await getDictionary();
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10">
      <header className="mb-8 max-w-2xl">
        <span className="eyebrow"><Search size={13} /> {t.searchPage.eyebrow}</span>
        <h1 className="h-page mt-4">{t.searchPage.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t.searchPage.lead}
        </p>
      </header>

      <div className="mb-8">
        <Suspense fallback={null}>
          <SmartSearch big />
        </Suspense>
      </div>

      <AdvancedSearch />
    </div>
  );
}
