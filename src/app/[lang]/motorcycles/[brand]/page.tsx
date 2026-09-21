import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VehiclesClient } from "@/components/search/VehiclesClient";
import { VehiclesPageSkeleton } from "@/components/VehicleGridSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { brandFromSlug } from "@/lib/slug";
import { dictionaryOf, getDictionary } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/site";

/* الصفحة كتّرندر عند كل طلب.

   قبل كانت `generateStaticParams` وNext كيصنّفها SSG. المشكل: التخطيط
   الجذري كيقرا الكوكي (الجلسة فالهيدر)، يعني حتى صفحة ماتقدرش تتّبنى
   ساكنة بصح. ملي البناء كيلقى القائمة خاوية (قاعدة الإنتاج كانت خاوية
   ملي تبنا الموقع)، كل رابط جديد كيتحاول يتّبنى ساكن عند أول طلب —
   وتما كتطيح cookies() بـDYNAMIC_SERVER_USAGE و500 بدل الصفحة.

   يعني: كل إعلان جديد كان كيعطي 500. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string; brand: string }> }): Promise<Metadata> {
  const { lang, brand } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await dictionaryOf(locale);
  const make = brandFromSlug(brand, "moto");
  if (!make) return { title: t.pages.brand.unknown };
  return {
    title: t.pages.brand.motosMetaTitle.replace("{make}", make),
    description: t.pages.brand.motosMetaDesc.replace("{make}", make),
    alternates: localeAlternates(`/motorcycles/${brand}`, locale),
  };
}

export default async function MotoBrandPage({ params }: { params: Promise<{ lang: string; brand: string }> }) {
  const { brand } = await params;
  const make = brandFromSlug(brand, "moto");
  if (!make) notFound();
  const t = await getDictionary();

  return (
    <PageTransition>
      <Suspense fallback={<VehiclesPageSkeleton />}>
        <VehiclesClient
          lockKind="moto"
          lockBrand={make}
          basePath={`/motorcycles/${brand}`}
          heading={t.pages.brand.motosHeading.replace("{make}", make)}
          intro={t.pages.brand.intro.replace("{make}", make)}
        />
      </Suspense>
    </PageTransition>
  );
}
