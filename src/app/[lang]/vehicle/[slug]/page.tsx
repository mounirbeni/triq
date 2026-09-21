import type { Metadata } from "next";
import { Link } from "@/components/Link";
import { notFound } from "next/navigation";
import { brandSlug, vehicleHref } from "@/lib/slug";
import {
  estimateFor, getDealerOfSeller, getDuplicateCount, getSellerStats, getSimilarVehicles, getVehicle,
} from "@/lib/source";
import { fairPriceFrom, trustOf, trustScore } from "@/lib/market";
import { vehicleHighlights } from "@/lib/highlights";
import { computeTco } from "@/lib/tco";
import { formatNumber } from "@/lib/format";
import { jsonLdHtml } from "@/lib/jsonLd";
import { dictionaryOf, getDictionary, getLocale } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/lib/i18n/config";
import { absoluteUrl, localeAlternates } from "@/lib/site";
import {
  cityLabel, colorLabel, dhUnit, equipmentLabel, fill, fmtDate, fmtDh, fmtKm,
  fmtMonthYear, fmtTimeAgo, includedItemLabel, kmUnit, knownIssueLabel, specs as specLabels,
} from "@/lib/i18n/labels";
import { Gallery } from "@/components/vehicle/Gallery";
import { PageTransition } from "@/components/PageTransition";
import { TrustPanel } from "@/components/vehicle/TrustPanel";
import { RiskPanel } from "@/components/vehicle/RiskPanel";
import { TcoCalculator } from "@/components/vehicle/TcoCalculator";
import { HistoryTimeline } from "@/components/vehicle/HistoryTimeline";
import { SellerCard } from "@/components/vehicle/SellerCard";
import { StickyActionBar } from "@/components/vehicle/StickyActionBar";
import { FairPriceMeter } from "@/components/FairPriceMeter";
import { VehicleCard } from "@/components/VehicleCard";
import { RecentlyViewed } from "@/components/vehicle/RecentlyViewed";
import { ViewTracker } from "@/components/vehicle/ViewTracker";
import { Price } from "@/components/Price";
import { Mixed } from "@/components/Mixed";
import { TrustRing } from "@/components/TrustBadge";
import {
  AlertTriangle, AutoGear, BadgeCheck, Calculator, Calendar, Check, ChevronLeft, ClipboardCheck, Clock, Door,
  Driveshaft, Droplet, EQUIPMENT_ICONS, Eye, Flag, FUEL_ICONS, Heart, Horsepower, Key, MapPin,
  Odometer, OilCan, Palette, Piston, Road, Scale, Seat, ShieldCheck, Sparkle,
  Transmission, TrendingDown, Users,
} from "@/components/icons";
import { VehicleGlyph } from "@/components/VehicleArt";
import { artShape } from "@/lib/artshape";
import { DRIVETRAINS, ORIGINS } from "@/lib/vehicle-options";

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
  const found = await getVehicle(slug);
  if (!found) return { title: t.vehicle.notFound };
  const v = found.vehicle;
  const L = specLabels(locale);
  const title = `${v.make} ${v.model} ${v.version} ${v.year} — ${fmtDh(v.price, locale)} ${t.vehicle.metaIn} ${cityLabel(v.city, locale)}`;
  // الصورة الأصلية (ماشي thumbnail) — نتائج مشاركة/بحث أوضح
  const ogImage = v.media?.find((m) => m.kind === "photo")?.url ?? v.cover;
  return {
    title,
    description: fill(t.vehicle.metaDesc, {
      kind: L.kind[v.kind], make: v.make, model: v.model, year: String(v.year),
      km: fmtKm(v.km, locale), fuel: L.fuel[v.fuel], gearbox: L.gearbox[v.gearbox],
      trust: String(trustOf(v).score),
    }),
    openGraph: {
      title,
      type: "article",
      ...(ogImage ? { images: [{ url: ogImage, alt: title }] } : {}),
    },
    alternates: localeAlternates(`/vehicle/${slug}`, locale),
  };
}

export default async function VehiclePage({
  params,
}: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const found = await getVehicle(slug);
  if (!found) notFound();
  const { vehicle: v, seller } = found;
  const t = await getDictionary();
  const locale = await getLocale();
  const L = specLabels(locale);

  const dealer = await getDealerOfSeller(v.sellerId);
  const section = v.kind === "car" ? "/cars" : "/motorcycles";

  /* الثمن المرجعي كيتحسب هنا فالخادم من إعلانات حقيقية مشابهة —
     بهاد الطريقة كنقدرو نوريو حتى الإعلانات اللي دخلات فالحساب. */
  const estimate = await estimateFor(
    {
      kind: v.kind, make: v.make, model: v.model, year: v.year, km: v.km,
      fuel: v.fuel, gearbox: v.gearbox, body: v.body, condition: v.condition,
      power: v.kind === "moto" ? v.displacement : v.fiscalPower,
    },
    { excludeId: v.id },
  );
  const fp = fairPriceFrom(v, estimate);
  // إشارة التكرار كتحتاج الإعلانات الأخرى ديال نفس البائع
  const duplicates = await getDuplicateCount(v);
  const trust = trustScore(v, seller);
  const tco = computeTco(v, { kmPerYear: 15000, years: 3, coverage: "tiers", includeDepreciation: false });
  // المشابهة: نفس الماركة/الهيكل/المدينة وقرب الثمن والسنة
  const similar = await getSimilarVehicles(v, 4);
  const sellerStats = await getSellerStats(v.sellerId);
  const highlights = vehicleHighlights(v, fp);
  const FuelIcon = FUEL_ICONS[v.fuel];
  const GearIcon = v.gearbox === "automatique" ? AutoGear : Transmission;

  const sp = t.vehicle.spec;
  const optLabel = (o: { label: string; fr: string } | undefined) =>
    o ? (locale === "fr" ? o.fr : o.label) : "-";

  const specs = [
    { Icon: Calendar, label: sp.year, value: String(v.year) },
    { Icon: Odometer, label: sp.km, value: `${formatNumber(v.km)} ${kmUnit(locale)}` },
    { Icon: FuelIcon, label: sp.fuel, value: L.fuel[v.fuel] },
    { Icon: GearIcon, label: sp.gearbox, value: L.gearbox[v.gearbox] },
    { Icon: Horsepower, label: sp.fiscal, value: `${v.fiscalPower} ${sp.hp}` },
    ...(v.kind === "car"
      ? [
          { Icon: Door, label: sp.doors, value: String(v.doors ?? "-") },
          { Icon: Seat, label: sp.seats, value: (v.doors ?? 5) >= 5 ? "5" : "4" },
          /* v.drivetrain اختياري — البائع هو اللي كيعمّرو، بلا تخمين */
          ...(v.drivetrain
            ? [{ Icon: Driveshaft, label: sp.drivetrain, value: optLabel(DRIVETRAINS.find((d) => d.value === v.drivetrain)) }]
            : []),
        ]
      : [{ Icon: Piston, label: sp.displacement, value: `${v.displacement} ${sp.cc}` }]),
    { Icon: OilCan, label: sp.consumption, value: `${v.consumption} ${sp.consumptionUnit}` },
    { Icon: Palette, label: sp.color, value: colorLabel(v.color, locale) },
    ...(v.origin
      ? [{ Icon: Flag, label: sp.origin, value: optLabel(ORIGINS.find((o) => o.value === v.origin)) }]
      : []),
    { Icon: BadgeCheck, label: sp.condition, value: L.condition[v.condition] },
    { Icon: Users, label: sp.owners, value: String(v.owners) },
    { Icon: ClipboardCheck, label: sp.technicalControl, value: fmtDate(v.technicalControl, locale) },
    { Icon: MapPin, label: sp.city, value: cityLabel(v.city, locale) },
    {
      Icon: Droplet, label: sp.paint,
      value: v.originalPaint
        ? t.vehicle.paintOriginal
        : fill(t.vehicle.paintRepainted, { n: String(v.paintedPanels ?? 0) }),
    },
    ...(v.keysCount != null ? [{ Icon: Key, label: sp.keys, value: String(v.keysCount) }] : []),
  ];

  const pageUrl = absoluteUrl(localePath(`/vehicle/${slug}`, locale));
  const photoUrls = (v.media ?? [])
    .filter((m) => m.kind === "photo")
    .map((m) => m.url)
    .slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": v.kind === "car" ? "Car" : "Motorcycle",
    name: `${v.make} ${v.model} ${v.version}`,
    url: pageUrl,
    ...(photoUrls.length > 0 ? { image: photoUrls } : {}),
    brand: { "@type": "Brand", name: v.make },
    model: v.model,
    vehicleModelDate: String(v.year),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: v.km, unitCode: "KMT" },
    fuelType: L.fuel[v.fuel],
    vehicleTransmission: L.gearbox[v.gearbox],
    color: v.color,
    itemCondition: "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      url: pageUrl,
      price: v.price,
      priceCurrency: "MAD",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/UsedCondition",
      areaServed: cityLabel(v.city, locale),
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t.vehicle.home, item: absoluteUrl(localePath("/", locale)) },
      {
        "@type": "ListItem", position: 2,
        name: v.kind === "car" ? t.vehicle.cars : t.vehicle.motos,
        item: absoluteUrl(localePath(section, locale)),
      },
      {
        "@type": "ListItem", position: 3, name: v.make,
        item: absoluteUrl(localePath(`${section}/${brandSlug(v.make)}`, locale)),
      },
      { "@type": "ListItem", position: 4, name: `${v.model} ${v.year}`, item: pageUrl },
    ],
  };

  return (
    <PageTransition>
    <div className="mx-auto max-w-[1400px] px-4 py-6 pb-24 lg:pb-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbJsonLd) }} />

      <nav className="mb-5 flex flex-wrap items-center gap-1 text-[11px]" style={{ color: "var(--text-dim)" }}>
        <Link href="/" className="transition hover:text-[var(--brand)]" transitionTypes={["nav-back"]}>{t.vehicle.home}</Link>
        <ChevronLeft size={12} className="dir-flip" />
        <Link href={section} className="transition hover:text-[var(--brand)]" transitionTypes={["nav-back"]}>
          {v.kind === "car" ? t.vehicle.cars : t.vehicle.motos}
        </Link>
        <ChevronLeft size={12} className="dir-flip" />
        <Link href={`${section}/${brandSlug(v.make)}`} className="transition hover:text-[var(--brand)]" transitionTypes={["nav-back"]}>
          {v.make}
        </Link>
        <ChevronLeft size={12} className="dir-flip" />
        <span style={{ color: "var(--text-muted)" }}>{v.model} <span className="num">{v.year}</span></span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
        {/* ---------- العمود الرئيسي ---------- */}
        <div className="min-w-0 space-y-6">
          <Gallery v={v} />

          <header className="card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <VehicleGlyph shape={artShape(v)} kind={v.kind} size={26} strokeWidth={11} className="shrink-0" style={{ color: "var(--text-dim)" }} />
                  <h1 className="h-section">{v.make} {v.model}</h1>
                </div>
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{v.version}</p>
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  <span className="chip"><Calendar size={12} /><span className="num">{v.year}</span></span>
                  <span className="chip"><Odometer size={12} /><span className="num">{formatNumber(v.km)}</span> {kmUnit(locale)}</span>
                  <span className="chip"><FuelIcon size={12} />{L.fuel[v.fuel]}</span>
                  <span className="chip"><GearIcon size={12} />{L.gearbox[v.gearbox]}</span>
                  <span className="chip"><MapPin size={12} />{cityLabel(v.city, locale)}</span>
                </div>
              </div>
              <TrustRing score={trust.score} grade={trust.grade} size={62} />
            </div>

            <div
              className="flex flex-wrap items-end justify-between gap-3 border-t p-5"
              style={{ borderColor: "var(--line-soft)", background: "var(--surface-2)" }}
            >
              <div>
                <Price value={v.price} className="text-3xl font-extrabold tracking-tight" />
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  {v.negotiable && <span className="tag tag-mute"><Check size={10} /> {t.vehicle.negotiable}</span>}
                  {v.exchangeAccepted && <span className="tag tag-mute"><Scale size={10} /> {t.vehicle.exchange}</span>}
                  {v.priceDrops.length > 0 && (
                    <span className="tag tag-good">
                      <TrendingDown size={10} /> {t.vehicle.dropped}{" "}
                      <span className="num">{formatNumber(v.priceDrops.reduce((a, b) => a + b, 0))}</span> {dhUnit(locale)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-4 text-[11px]" style={{ color: "var(--text-dim)" }}>
                <span className="flex items-center gap-1"><Eye size={12} /><span className="num">{formatNumber(v.views)}</span></span>
                <span className="flex items-center gap-1"><Heart size={12} /><span className="num">{v.saves}</span></span>
                <span>{t.vehicle.publishedAgo} {fmtTimeAgo(v.publishedAt, locale)}</span>
                {new Date(v.updatedAt).getTime() - new Date(v.publishedAt).getTime() > 3600_000 && (
                  <span>· {t.vehicle.updatedAgo} {fmtTimeAgo(v.updatedAt, locale)}</span>
                )}
              </div>
            </div>
          </header>

          {/* صف بطاقات سريع: مؤشر الثقة، مقابل السوق، التكلفة الشهرية */}
          <div className="grid grid-cols-3 gap-2.5 sm:hidden">
            {[
              { label: t.vehicle.quickStats.trust, value: `${trust.score}/100`, color: "var(--good)", Icon: ShieldCheck },
              {
                label: t.vehicle.quickStats.vsMarket,
                value: `${fp.delta < 0 ? "−" : "+"}${Math.abs(Math.round(fp.delta * 100))}${t.fairPrice.percent}`,
                color: fp.delta < 0 ? "var(--good)" : "var(--bad)",
                Icon: Scale,
              },
              { label: t.vehicle.quickStats.perMonth, value: formatNumber(tco.perMonth), color: "var(--data)", Icon: Calculator },
            ].map((st) => (
              <div key={st.label} className="card p-3 text-center">
                <st.Icon size={16} className="mx-auto" style={{ color: st.color }} />
                <div className="num mt-1.5 text-[14px] font-extrabold" style={{ color: st.color }}>
                  {st.value}
                </div>
                <div className="mt-0.5 truncate text-[9.5px]" style={{ color: "var(--text-dim)" }}>{st.label}</div>
              </div>
            ))}
          </div>

          <FairPriceMeter fp={fp} />

          {highlights.length > 0 && (
            <section className="card p-5" style={{ background: "var(--brand-soft)", borderColor: "transparent" }}>
              <header className="mb-4 flex items-start gap-2.5">
                <Sparkle size={18} style={{ color: "var(--brand)" }} className="mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-[15px] font-bold">{t.highlights.title}</h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    {t.highlights.lead}
                  </p>
                </div>
              </header>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {highlights.map((h) => {
                  const hl = t.highlights[h.key as keyof typeof t.highlights] as { label: string; detail: string };
                  const vars = { ...(h.vars ?? {}), ...(h.dateIso ? { date: fmtMonthYear(h.dateIso, locale) } : {}) };
                  return (
                  <div key={h.key} className="flex items-start gap-2.5 rounded-xl p-3" style={{ background: "var(--surface-1)" }}>
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                      style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                    >
                      <h.Icon size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold">{hl.label}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        <Mixed text={fill(hl.detail, vars)} />
                      </p>
                    </div>
                  </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* المواصفات */}
          <section className="card p-5">
            <header className="mb-5 flex items-start gap-2.5">
              <Road size={18} style={{ color: "var(--brand)" }} className="mt-0.5 shrink-0" />
              <div>
                <h2 className="text-[15px] font-bold">{t.vehicle.specsTitle}</h2>
                <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
                  {t.vehicle.specsLead}
                </p>
              </div>
            </header>

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {specs.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-2.5 rounded-xl p-2.5"
                  style={{ background: "var(--surface-3)" }}
                >
                  <s.Icon size={16} className="shrink-0" style={{ color: "var(--text-dim)" }} />
                  <div className="min-w-0">
                    <dt className="text-[10px]" style={{ color: "var(--text-dim)" }}>{s.label}</dt>
                    <dd className="truncate text-[12.5px] font-bold">
                      <Mixed text={s.value} />
                    </dd>
                  </div>
                </div>
              ))}
            </dl>

            {v.equipment.length > 0 && (
              <>
                <h3 className="mt-6 mb-3 flex items-center gap-1.5 text-[13px] font-bold">
                  <Sparkle size={14} style={{ color: "var(--brand)" }} /> {t.vehicle.equipment}
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {v.equipment.map((e) => {
                    const EqIcon = EQUIPMENT_ICONS[e] ?? Check;
                    return (
                      <span
                        key={e}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11.5px] font-medium"
                        style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}
                      >
                        <EqIcon size={15} className="shrink-0" style={{ color: "var(--brand)" }} />
                        <span className="truncate">{equipmentLabel(e, locale)}</span>
                      </span>
                    );
                  })}
                </div>
              </>
            )}

            {v.includedItems.length > 0 && (
              <>
                <h3 className="mt-6 mb-3 flex items-center gap-1.5 text-[13px] font-bold">
                  <BadgeCheck size={14} style={{ color: "var(--brand)" }} /> {t.vehicle.includedItems}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {v.includedItems.map((item) => (
                    <span key={item} className="chip chip-plain">{includedItemLabel(item, locale)}</span>
                  ))}
                </div>
              </>
            )}

            {v.knownIssues.length > 0 && (
              <>
                <h3 className="mt-6 mb-3 flex items-center gap-1.5 text-[13px] font-bold">
                  <AlertTriangle size={14} style={{ color: "var(--warn)" }} /> {t.vehicle.knownIssues}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {v.knownIssues.map((issue) => (
                    <span key={issue} className="chip"
                      style={{ background: "var(--warn-soft)", color: "var(--warn)", borderColor: "transparent" }}>
                      {knownIssueLabel(issue, locale)}
                    </span>
                  ))}
                </div>
              </>
            )}

            <h3 className="mt-6 mb-2 text-[13px] font-bold">{t.vehicle.descTitle}</h3>
            <p className="text-[13px] leading-loose" style={{ color: "var(--text-muted)" }}>
              {v.description}
            </p>

            {v.saleReason && (
              <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
                <b>{t.vehicle.saleReasonLabel}</b> {v.saleReason}
              </p>
            )}
          </section>

          {/* التاريخ والسعر */}
          <section className="card p-5">
            <header className="mb-4 flex items-start gap-2.5">
              <Clock size={18} style={{ color: "var(--brand)" }} className="mt-0.5 shrink-0" />
              <div>
                <h2 className="text-[15px] font-bold">{t.vehicle.historyTitle}</h2>
                <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
                  {t.vehicle.historyLead}
                </p>
              </div>
            </header>
            <dl className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3" style={{ background: "var(--surface-3)" }}>
                <dt className="text-[10px]" style={{ color: "var(--text-dim)" }}>{t.vehicle.publishedOn}</dt>
                <dd className="mt-0.5 text-[12.5px] font-bold">{fmtDate(v.publishedAt, locale)}</dd>
              </div>
              <div className="rounded-xl p-3" style={{ background: "var(--surface-3)" }}>
                <dt className="text-[10px]" style={{ color: "var(--text-dim)" }}>{t.vehicle.updatedOn}</dt>
                <dd className="mt-0.5 text-[12.5px] font-bold">{fmtDate(v.updatedAt, locale)}</dd>
              </div>
            </dl>

            {v.priceHistory.length > 0 && (
              <>
                <h3 className="mt-5 mb-2.5 text-[12.5px] font-bold">{t.vehicle.priceChanges}</h3>
                <ul className="space-y-1.5">
                  {[...v.priceHistory].reverse().map((p) => (
                    <li
                      key={p.date}
                      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[12px]"
                      style={{ background: "var(--surface-3)" }}
                    >
                      <span style={{ color: "var(--text-dim)" }}>{fmtDate(p.date, locale)}</span>
                      <span className="num font-bold">{formatNumber(p.price)} {dhUnit(locale)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <HistoryTimeline events={v.history} />
          <TcoCalculator v={v} />
        </div>

        {/* ---------- العمود الجانبي ---------- */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-[84px] lg:h-fit">
          <SellerCard
            seller={seller}
            v={v}
            dealerVerified={Boolean(dealer?.verified)}
            dealerSlug={dealer?.slug}
            activeListings={sellerStats.activeListings}
          />
          <RiskPanel v={v} duplicates={duplicates} />
          <TrustPanel trust={trust} />

          {fp.estimate.comparables.length > 0 && (
            <section className="card p-5">
              <h2 className="flex items-center gap-2 text-[13px] font-bold">
                <Scale size={15} style={{ color: "var(--brand)" }} /> {t.vehicle.comparablesTitle}
              </h2>
              <p className="mt-1 text-[11px]" style={{ color: "var(--text-dim)" }}>
                {t.vehicle.comparablesLead}
              </p>
              <ul className="mt-3 space-y-1">
                {fp.estimate.comparables.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={vehicleHref(c)}
                      className="flex items-center justify-between gap-2 rounded-lg p-2 text-[11.5px] transition hover:bg-[var(--surface-3)]"
                    >
                      <span className="truncate">
                        {c.make} {c.model} <span className="num opacity-55">{c.year}</span>
                      </span>
                      <span className="num shrink-0 font-bold">{formatNumber(c.price)} {dhUnit(locale)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <StickyActionBar v={v} />

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="h-section mb-6">{t.vehicle.similarTitle}</h2>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {similar.map((s) => <VehicleCard key={s.id} v={s} compact />)}
          </div>
        </section>
      )}

      <ViewTracker listingRef={v.id} />
      <RecentlyViewed currentId={v.id} />
    </div>
    </PageTransition>
  );
}
