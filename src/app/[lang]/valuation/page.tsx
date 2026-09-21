import type { Metadata } from "next";
import { EstimateTool } from "@/components/EstimateTool";
import { Sparkle } from "@/components/icons";
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
    alternates: localeAlternates("/valuation", locale),
    title: t.valuationPage.metaTitle,
    description: t.valuationPage.metaDesc,
  };
}

export default async function EstimatePage() {
  const t = await getDictionary();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8 max-w-2xl">
        <span className="eyebrow"><Sparkle size={13} /> {t.valuationPage.eyebrow}</span>
        <h1 className="h-page mt-4">{t.valuationPage.title}</h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t.valuationPage.lead}
        </p>
      </header>
      <EstimateTool />
    </div>
  );
}
