import type { Metadata } from "next";
import { Link } from "@/components/Link";
import { notFound } from "next/navigation";
import { getDealer, getDealerListings } from "@/lib/source";
import { formatNumber } from "@/lib/format";
import { jsonLdHtml } from "@/lib/jsonLd";
import { dictionaryOf, getDictionary, getLocale } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/site";
import { cityLabel } from "@/lib/i18n/labels";
import { trustOf } from "@/lib/market";
import { brandSlug } from "@/lib/slug";
import { VehicleCard } from "@/components/VehicleCard";
import { DealerContact } from "@/components/DealerContact";
import {
  BadgeCheck, Car, Clock, MapPin, Navigation, ShieldCheck, Star, Timer, Users,
} from "@/components/icons";

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
}: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await dictionaryOf(locale);
  const d = await getDealer(slug);
  if (!d) return { title: t.dealerPage.notFound };
  return {
    title: `${d.name} — ${cityLabel(d.city, locale)}`,
    description: `${d.tagline}. ${d.about.slice(0, 120)}`,
    alternates: localeAlternates(`/dealer/${slug}`, locale),
  };
}

export default async function DealerPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const d = await getDealer(slug);
  if (!d) notFound();
  const t = await getDictionary();
  const locale = await getLocale();

  const listings = await getDealerListings(d.slug);
  const avgTrust = listings.length
    ? Math.round(listings.reduce((s, v) => s + trustOf(v).score, 0) / listings.length)
    : 0;
  const inspected = listings.filter((v) => v.inspected).length;
  const cars = listings.filter((v) => v.kind === "car").length;
  const motos = listings.length - cars;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: d.name,
    description: d.about,
    address: { "@type": "PostalAddress", streetAddress: d.address, addressLocality: cityLabel(d.city, locale), addressCountry: "MA" },
    ...(d.rating != null && d.rating > 0 && d.salesCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: d.rating, bestRating: 5, ratingCount: d.salesCount } }
      : {}),
    openingHours: d.hours,
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />

      {/* الغلاف */}
      <div
        className="relative h-44 sm:h-56"
        style={{ background: `linear-gradient(120deg, ${d.cover[0]}, ${d.cover[1]})` }}
      >
        <div className="zellige absolute inset-0 opacity-40" />
      </div>

      <div className="mx-auto max-w-[1200px] px-4">
        <div className="relative z-10 -mt-14 flex flex-wrap items-end gap-4">
          <span
            className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl border-4 text-4xl font-extrabold"
            style={{ background: "var(--surface-1)", borderColor: "var(--bg)", color: "var(--brand)" }}
          >
            {d.name.trim().slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="h-section">{d.name}</h1>
              {d.verified && (
                <span className="tag" style={{ background: "var(--good)", color: "#fff" }}>
                  <BadgeCheck size={11} /> {t.dealerPage.verifiedDealer}
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px]" style={{ color: "var(--text-muted)" }}>{d.tagline}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-6">
            {/* الأرقام */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { Icon: Car, v: formatNumber(listings.length), l: t.dealerPage.statVehicles },
                { Icon: ShieldCheck, v: `${avgTrust}/100`, l: t.dealerPage.statTrust },
                { Icon: BadgeCheck, v: formatNumber(inspected), l: t.dealerPage.statInspected },
                { Icon: Users, v: formatNumber(d.salesCount), l: t.dealerPage.statSales },
              ].map((s) => (
                <div key={s.l} className="card flex items-center gap-3 p-4">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                    style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                  >
                    <s.Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="num text-lg font-extrabold">{s.v}</div>
                    <div className="truncate text-[10.5px]" style={{ color: "var(--text-dim)" }}>{s.l}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* عن المعرض */}
            <section className="card p-5">
              <h2 className="text-[15px] font-bold">{t.dealerPage.aboutTitle}</h2>
              <p className="mt-2.5 text-[13px] leading-loose" style={{ color: "var(--text-muted)" }}>
                {d.about}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {d.brands.map((b) => (
                  <Link
                    key={b}
                    href={`/cars/${brandSlug(b)}`}
                    className="chip chip-plain transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  >
                    {b}
                  </Link>
                ))}
              </div>
            </section>

            {/* المخزون */}
            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <h2 className="h-section">{t.dealerPage.inventoryTitle}</h2>
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                  <span className="num">{cars}</span> {t.dealerPage.car} · <span className="num">{motos}</span> {t.dealerPage.moto}
                </p>
              </div>
              {listings.length ? (
                <div className="grid grid-cols-2 gap-5 xl:grid-cols-3">
                  {listings.map((v) => <VehicleCard key={v.id} v={v} compact />)}
                </div>
              ) : (
                <div className="card p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  {t.dealerPage.noInventory}
                </div>
              )}
            </section>
          </div>

          {/* الاتصال */}
          <aside className="min-w-0 space-y-5 lg:sticky lg:top-[84px] lg:h-fit">
            <DealerContact dealer={d} />

            <section className="card p-5">
              <h2 className="text-[13px] font-bold">{t.dealerPage.infoTitle}</h2>
              <ul className="mt-3 space-y-3 text-[12px]">
                <li className="flex gap-2.5">
                  <MapPin size={15} className="mt-0.5 shrink-0" style={{ color: "var(--text-dim)" }} />
                  <span style={{ color: "var(--text-muted)" }}>{d.address}</span>
                </li>
                <li className="flex gap-2.5">
                  <Clock size={15} className="mt-0.5 shrink-0" style={{ color: "var(--text-dim)" }} />
                  <span style={{ color: "var(--text-muted)" }}>{d.hours}</span>
                </li>
                {d.rating != null && (
                  <li className="flex gap-2.5">
                    <Star size={15} className="mt-0.5 shrink-0" style={{ color: "var(--warn)" }} filled />
                    <span style={{ color: "var(--text-muted)" }}>
                      <span className="num">{d.rating.toFixed(1)}</span> {t.dealerPage.outOf5} ·{" "}
                      <span className="num">{d.salesCount}</span> {t.dealerPage.ratingsCount}
                    </span>
                  </li>
                )}
                {d.responseMinutes != null && (
                  <li className="flex gap-2.5">
                    <Timer size={15} className="mt-0.5 shrink-0" style={{ color: "var(--text-dim)" }} />
                    <span style={{ color: "var(--text-muted)" }}>
                      {t.dealerPage.respondsIn}<span className="num">{d.responseMinutes}</span> {t.dealerPage.minutes}
                    </span>
                  </li>
                )}
                <li className="flex gap-2.5">
                  <Navigation size={15} className="mt-0.5 shrink-0" style={{ color: "var(--text-dim)" }} />
                  <span style={{ color: "var(--text-muted)" }}>{t.dealerPage.memberSince} <span className="num">{d.since}</span></span>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
