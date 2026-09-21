import type { Metadata } from "next";
import { AssistantClient } from "@/components/AssistantClient";
import { dictionaryOf } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/site";

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await dictionaryOf(locale);
  return {
    title: t.assistantPage.metaTitle,
    description: t.assistantPage.metaDesc,
    alternates: localeAlternates("/assistant", locale),
  };
}

export default function AssistantPage() {
  return <AssistantClient />;
}
