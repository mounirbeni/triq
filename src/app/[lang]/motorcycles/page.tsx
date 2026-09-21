import { Suspense } from "react";
import type { Metadata } from "next";
import { VehiclesClient } from "@/components/search/VehiclesClient";
import { VehiclesPageSkeleton } from "@/components/VehicleGridSkeleton";
import { PageTransition } from "@/components/PageTransition";
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
    title: t.pages.motos.metaTitle,
    description: t.pages.motos.metaDesc,
    alternates: localeAlternates("/motorcycles", locale),
  };
}

export default async function MotorcyclesPage() {
  const t = await getDictionary();
  return (
    <PageTransition>
      <Suspense fallback={<VehiclesPageSkeleton />}>
        <VehiclesClient
          lockKind="moto"
          basePath="/motorcycles"
          heading={t.pages.motos.heading}
          intro={t.pages.motos.intro}
        />
      </Suspense>
    </PageTransition>
  );
}
