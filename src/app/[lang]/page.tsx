import type { Metadata } from "next";
import { Link } from "@/components/Link";
import { vehicleHref } from "@/lib/slug";
import { HeroSearch } from "@/components/HeroSearch";
import { BrandTile } from "@/components/BrandMark";
import { SuggestedForYou } from "@/components/SuggestedForYou";
import { PageTransition } from "@/components/PageTransition";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/site";
import { VehicleCard } from "@/components/VehicleCard";
import { VehicleArt, VehicleGlyph } from "@/components/VehicleArt";
import { TrustRing } from "@/components/TrustBadge";
import { artShape } from "@/lib/artshape";
import { trustOf, fairPriceOf } from "@/lib/market";
import { computeTco } from "@/lib/tco";
import { formatNumber } from "@/lib/format";
import { CITIES } from "@/lib/cities";
import { guidesFor } from "@/lib/data/guides";
import { brandSlug, brandsOf } from "@/lib/slug";
import { findAll, getBrands, getDealerCounts, getDealers, getStats } from "@/lib/source";
import { CAR_BODIES, MOTO_BODIES } from "@/lib/vehicle-options";
import { cityLabel, localizeOptions } from "@/lib/i18n/labels";
import {
  ArrowLeft, BadgeCheck, Calculator, Car, Clock, Coins, FileText, GUIDE_ICONS, Heart, Lock,
  MapPin, Message, Moto, Phone, Scale, Search, ShieldCheck, Sparkle, Star, TrendingDown,
  Users, Van, Wallet, Wrench,
} from "@/components/icons";

const PILLARS_META = [
  { key: "trust", Icon: ShieldCheck, color: "var(--good)", href: "/cars?trustMin=75" },
  { key: "price", Icon: Scale, color: "var(--brand)", href: "/valuation" },
  { key: "cost", Icon: Calculator, color: "var(--data)", href: "/cost" },
] as const;

const QUICK_META = [
  { href: "/cars", key: "cars", Icon: Car },
  { href: "/motorcycles", key: "motos", Icon: Moto },
  { href: "/cars?deals=1", key: "deals", Icon: TrendingDown },
  { href: "/cars?inspected=1", key: "inspected", Icon: BadgeCheck },
  { href: "/search", key: "advSearch", Icon: Search },
] as const;

const QUICK_CATS_META = [
  { href: "/cars", key: "cars", Icon: Car },
  { href: "/motorcycles", key: "motos", Icon: Moto },
  { href: "/cars?body=utilitaire", key: "commercial", Icon: Van },
  { href: "/favorites", key: "favorites", Icon: Heart },
] as const;

const CATEGORIES = [
  ...CAR_BODIES.map((b) => ({ key: b.value, label: b.label, fr: b.fr, kind: "car" as const })),
  ...MOTO_BODIES.map((b) => ({ key: b.value, label: b.label, fr: b.fr, kind: "moto" as const })),
];

/* شرائح الثمن فقسم «حسب السعر» — الحدود مطابقة لـPRICE_BRACKETS فـlib/db/listings.ts */
const PRICE_BRACKETS: {
  key: string; priceMin?: number; priceMax?: number;
}[] = [
  { key: "u50", priceMax: 49999 },
  { key: "50-100", priceMin: 50000, priceMax: 99999 },
  { key: "100-200", priceMin: 100000, priceMax: 199999 },
  { key: "o200", priceMin: 200000 },
];

const TRUST_POINTS_META = [
  { key: "verified", Icon: ShieldCheck, href: "/cars?verified=1" },
  { key: "directContact", Icon: Phone, href: "/safety" },
  { key: "allCities", Icon: MapPin, href: "/cars" },
  { key: "privacy", Icon: Lock, href: "/privacy" },
] as const;

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  return { alternates: localeAlternates("/", locale) };
}

export default async function HomePage() {
  const dict = await getDictionary();
  const t = dict.home;

  const [featuredCars, featuredMotos, latestVehicles, carBrands, motoBrands, stats, dealerCounts] =
    await Promise.all([
      findAll({ kind: "car", sort: "deal" }, 4),
      findAll({ kind: "moto", sort: "deal" }, 4),
      findAll({ sort: "recent" }, 8),
      getBrands("car"),
      getBrands("moto"),
      getStats(),
      getDealerCounts(),
    ]);
  const dealers = await getDealers();

  /* الكتالوج ديما هو الأساس: حتى الماركة اللي ماعندهاش إعلان خاصها
     تبقى باينة بصفحتها. كنزيدو عدد الإعلانات الحقيقية غير ملي كاين. */
  type Tile = { make: string; slug: string; count?: number };
  function catalogTiles(catalog: Tile[], live: Tile[]): Tile[] {
    const liveBySlug = new Map(live.map((b) => [b.slug, b]));
    const catalogSlugs = new Set(catalog.map((b) => b.slug));
    return [
      ...catalog.map((b) => ({ ...b, count: liveBySlug.get(b.slug)?.count })),
      // إلا دخلات ماركة جديدة من قاعدة البيانات قبل تحديث الكتالوج، مانوضّعوهاش تضيع.
      ...live.filter((b) => !catalogSlugs.has(b.slug)),
    ];
  }
  const carTiles = catalogTiles(brandsOf("car"), carBrands);
  const motoTiles = catalogTiles(brandsOf("moto"), motoBrands);
  const locale = await getLocale();
  const topGuides = guidesFor(locale).slice(0, 4);
  const quick = QUICK_META.map((q) => ({ ...q, label: t.quick[q.key] }));
  const quickCats = QUICK_CATS_META.map((q) => ({ ...q, label: t.quickCats[q.key] }));
  const pillars = PILLARS_META.map((p) => ({ ...p, ...t.pillars[p.key] }));
  const trustPoints = TRUST_POINTS_META.map((p) => ({ ...p, ...t.trustPoints[p.key] }));
  const categories = localizeOptions(CATEGORIES, locale);
  const topDealers = dealers
    .map((d) => ({ d, count: dealerCounts[d.slug] ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const { cars, motos, avgTrust } = stats;

  // البطل: أعلى ثقة من المفحوصة
  const heroPool = await findAll({ inspectedOnly: true, sort: "trust-desc" }, 8);
  /* «مثال حي» كيوري إعلاناً حقيقياً من المنصة. ملي مازال ماكاينش
     حتى إعلان، القسم كامل ماكيبانش — أحسن من مثال مخترع. */
  const hero = heroPool[0] ?? featuredCars[0] ?? null;
  const heroTrust = hero ? trustOf(hero) : null;
  const heroFp = hero ? fairPriceOf(hero) : null;
  const heroTco = hero
    ? computeTco(hero, { kmPerYear: 15000, years: 3, coverage: "tiers", includeDepreciation: false })
    : null;

  const makes = stats.makes;
  const topCities = CITIES
    .map((c) => ({ ...c, n: stats.byCity[c.slug] ?? 0 }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n);

  /* قسم الفئات: نوع المركبة × حالتها. المنصة سوق مركبات مستعملة فقط —
     ماكاينش "جديدة" فالبيانات ولا فهوية الموقع، فبدلها كنعرضو الحالة
     («ممتازة»/«جيدة») اللي هي فعلاً موجودة فقاعدة البيانات. */
  const CATEGORY_TILES = [
    { key: "cars", label: t.categoryTiles.cars, href: "/cars", n: stats.cars, Icon: Car },
    { key: "motos", label: t.categoryTiles.motos, href: "/motorcycles", n: stats.motos, Icon: Moto },
    {
      key: "cars-excellent", label: t.categoryTiles.carsExcellent, href: "/cars?condition=excellent",
      n: stats.byKindCondition["car:excellent"] ?? 0, Icon: Star,
    },
    {
      key: "cars-bon", label: t.categoryTiles.carsBon, href: "/cars?condition=bon",
      n: stats.byKindCondition["car:bon"] ?? 0, Icon: BadgeCheck,
    },
    {
      key: "motos-excellent", label: t.categoryTiles.motosExcellent, href: "/motorcycles?condition=excellent",
      n: stats.byKindCondition["moto:excellent"] ?? 0, Icon: Star,
    },
    {
      key: "motos-bon", label: t.categoryTiles.motosBon, href: "/motorcycles?condition=bon",
      n: stats.byKindCondition["moto:bon"] ?? 0, Icon: BadgeCheck,
    },
  ].filter((tile) => tile.n > 0);

  const priceBrackets = PRICE_BRACKETS
    .map((b) => ({ ...b, label: t.priceBrackets[b.key as keyof typeof t.priceBrackets], n: stats.byPrice[b.key] ?? 0 }))
    .filter((b) => b.n > 0);

  return (
    <PageTransition>
      {/* ================= البطل ================= */}
      <section className="relative">
        <div className="relative min-h-[560px] overflow-hidden sm:min-h-[680px]" style={{ background: "#040c1a" }}>
          <img
            src="/hero-vehicles.webp"
            srcSet="/hero-vehicles-sm.webp 900w, /hero-vehicles.webp 1774w"
            sizes="100vw"
            alt={t.heroImgAlt}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[42%_center] sm:object-[38%_center]"
          />
          {/* حجاب متدرّج من جهة النص */}
          {/* الشاشات الكبيرة: حجاب أفقي من جهة النص */}
          <div
            className="absolute inset-0 hidden sm:block"
            style={{
              background:
                "linear-gradient(to left, rgba(4,12,26,0.985) 0%, rgba(4,12,26,0.96) 30%, rgba(4,12,26,0.82) 44%, rgba(4,12,26,0.42) 62%, rgba(4,12,26,0.12) 82%, rgba(4,12,26,0) 100%)",
            }}
          />
          {/* الموبايل: حجاب عمودي يبقي المركبة ظاهرة في الأعلى */}
          <div
            className="absolute inset-0 sm:hidden"
            style={{
              background:
                "linear-gradient(to top, rgba(4,12,26,0.96) 22%, rgba(4,12,26,0.78) 42%, rgba(4,12,26,0.3) 70%, rgba(4,12,26,0.06) 100%)",
            }}
          />
          {/* اندماج مع خلفية الصفحة */}
          <div
            className="absolute inset-x-0 bottom-0 h-36"
            style={{ background: "linear-gradient(to top, var(--bg) 4%, rgba(4,12,26,0) 100%)" }}
          />
          {/* توهج أزرق خفيف أعلى اليمين */}
          <div
            className="pointer-events-none absolute inset-y-0 start-0 w-1/2"
            style={{
              background:
                "radial-gradient(60% 55% at 78% 30%, rgba(31,95,224,0.22) 0%, transparent 70%)",
            }}
          />

          <div className="relative mx-auto flex min-h-[560px] max-w-[1400px] items-end px-4 pt-24 pb-40 sm:min-h-[680px] sm:items-center sm:pt-24 sm:pb-52">
            <div className="max-w-2xl">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold"
                style={{
                  background: "rgba(31,95,224,0.18)",
                  border: "1px solid rgba(90,142,247,0.35)",
                  color: "#9fc0ff",
                }}
              >
                <Sparkle size={13} /> {t.heroBadge}
              </span>

              <h1 className="h-page mt-5 text-balance text-white">
                {t.heroTitle1}
                <br />
                <span style={{ color: "#5a8ef7" }}>{t.heroTitle2}</span>
              </h1>

              <p
                className="mt-5 max-w-xl text-pretty text-[15px] leading-relaxed sm:text-base"
                style={{ color: "#b9c9e4" }}
              >
                {t.heroLead.split("{trust}")[0]}
                <b className="text-white">{t.heroLeadTrust}</b>
                {t.heroLead.split("{trust}")[1].split("{price}")[0]}
                <b className="text-white">{t.heroLeadPrice}</b>
                {t.heroLead.split("{price}")[1].split("{cost}")[0]}
                <b className="text-white">{t.heroLeadCost}</b>
                {t.heroLead.split("{cost}")[1]}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/cars" className="btn btn-primary btn-lg" transitionTypes={["nav-forward"]}>
                  <Car size={17} /> {t.browseVehicles}
                </Link>
                <Link
                  href="/safety"
                  className="btn btn-lg"
                  style={{ border: "1px solid rgba(255,255,255,0.28)", color: "#fff" }}
                >
                  {t.howWeWork} <ArrowLeft size={16} className="dir-flip" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* بطاقة البحث المتراكبة — العنصر الأساسي فالصفحة */}
        <div className="relative z-10 mx-auto -mt-28 max-w-[1400px] px-4 sm:-mt-32">
          <HeroSearch carBrands={carBrands} motoBrands={motoBrands} cities={topCities} />

          {/* صف أيقونات فئات سريع — تجربة بحال تطبيق الهاتف */}
          <div className="mt-6 grid grid-cols-4 gap-2.5 sm:hidden">
            {quickCats.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                transitionTypes={["nav-forward"]}
                className="card card-hover flex flex-col items-center gap-2 py-4"
              >
                <span
                  className="grid h-11 w-11 place-items-center rounded-full"
                  style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                >
                  <Icon size={19} />
                </span>
                <span className="text-[11px] font-bold">{label}</span>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {quick.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                transitionTypes={["nav-forward"]}
                className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-bold transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:text-[var(--brand)]"
                style={{
                  borderColor: "var(--line)",
                  background: "var(--surface-1)",
                  color: "var(--text-muted)",
                }}
              >
                <Icon size={16} style={{ color: "var(--brand)" }} />
                {label}
              </Link>
            ))}
          </div>

          {/* بانر التقييم — دعوة بارزة لمعرفة القيمة الحقيقية قبل الشراء */}
          <Link
            href="/valuation"
            transitionTypes={["nav-forward"]}
            className="card card-hover mt-6 flex items-center gap-4 overflow-hidden p-5"
            style={{ background: "var(--brand-soft)", borderColor: "var(--line-soft)" }}
          >
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
              style={{ background: "var(--surface-1)", color: "var(--brand)" }}
            >
              <Wallet size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13.5px] font-bold leading-snug">{t.valuationBanner.title}</h3>
              <p
                className="mt-1 overflow-hidden text-[11.5px] leading-relaxed"
                style={{ color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
              >
                {t.valuationBanner.subtitle}
              </p>
            </div>
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[12px] font-bold"
              style={{ background: "var(--brand)", color: "#fff" }}
            >
              {t.valuationBanner.cta} <ArrowLeft size={13} className="dir-flip" />
            </span>
          </Link>
        </div>

        {/* الإحصائيات */}
        <div className="mx-auto max-w-[1400px] px-4 pt-14">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: formatNumber(cars), l: t.statCars, Icon: Car },
              { k: formatNumber(motos), l: t.statMotos, Icon: Moto },
              // متوسط الثقة ماعندو معنى بلا إعلانات
              { k: avgTrust > 0 ? `${avgTrust}/100` : "—", l: t.statTrust, Icon: ShieldCheck },
              { k: formatNumber(topCities.length || CITIES.length), l: t.statCities, Icon: MapPin },
            ].map((s) => (
              <div key={s.l} className="card flex items-center gap-3 p-4">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                  style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                >
                  <s.Icon size={18} />
                </span>
                <div className="min-w-0">
                  <dt className="num text-xl font-extrabold">{s.k}</dt>
                  <dd className="truncate text-[11px]" style={{ color: "var(--text-dim)" }}>{s.l}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* شريط الضمانات */}
        <div className="mx-auto max-w-[1400px] px-4 pt-4 pb-12">
          <div
            className="grid gap-3 rounded-2xl p-5 sm:grid-cols-2 lg:grid-cols-4"
            style={{ background: "var(--brand-soft)", border: "1px solid var(--line-soft)" }}
          >
            {[
              { Icon: ShieldCheck, t: t.gtVerified, d: t.gtVerifiedD },
              { Icon: BadgeCheck, t: t.gtSellers, d: t.gtSellersD },
              { Icon: Scale, t: t.gtPrice, d: t.gtPriceD },
              { Icon: Wrench, t: t.gtInspect, d: t.gtInspectD },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                  style={{ background: "var(--surface-1)", color: "var(--brand)" }}
                >
                  <f.Icon size={20} />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold">{f.t}</div>
                  <div className="truncate text-[11px]" style={{ color: "var(--text-muted)" }}>{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden border-y py-4" style={{ borderColor: "var(--line-soft)" }}>
          <div className="marquee-track gap-9 px-4">
            {[...makes, ...makes].map((m, i) => (
              <span key={`${m}-${i}`} className="num whitespace-nowrap text-[13px] font-bold opacity-25">
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= قسم الفئات ================= */}
      {CATEGORY_TILES.length > 0 && (
      <section className="hidden mx-auto max-w-[1400px] px-4 py-16">
        <h2 className="h-section mb-2">{t.catTitle}</h2>
        <p className="mb-7 text-sm" style={{ color: "var(--text-muted)" }}>
          {t.catLead}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORY_TILES.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              transitionTypes={["nav-forward"]}
              className="card card-hover group flex flex-col items-center gap-2.5 p-5 text-center"
            >
              <span
                className="grid h-12 w-12 place-items-center rounded-xl transition-colors"
                style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
              >
                <c.Icon size={22} />
              </span>
              <span className="text-[12.5px] font-bold">{c.label}</span>
              <span className="num text-[10.5px]" style={{ color: "var(--text-dim)" }}>{c.n} {t.listingSuffix}</span>
            </Link>
          ))}
        </div>
      </section>
      )}

      {/* ================= التصنيفات ================= */}
      <section className="hidden mx-auto max-w-[1400px] px-4 py-16">
        <h2 className="h-section mb-7">{t.byBody}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {categories.map((c) => {
            const n = stats.byBody[c.key] ?? 0;
            if (!n) return null;
            return (
              <Link
                key={c.key}
                href={`${c.kind === "moto" ? "/motorcycles" : "/cars"}?body=${c.key}`}
                transitionTypes={["nav-forward"]}
                className="card card-hover group flex flex-col items-center gap-2 p-5 text-center"
              >
                <span
                  className="grid h-14 w-16 place-items-center rounded-xl transition-colors"
                  style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}
                >
                  <VehicleGlyph
                    shape={c.key as never}
                    kind={c.kind}
                    size={30}
                    strokeWidth={10}
                    className="transition-colors group-hover:text-[var(--brand)]"
                  />
                </span>
                <span className="text-[12.5px] font-bold">{c.label}</span>
                <span className="num text-[10.5px]" style={{ color: "var(--text-dim)" }}>{n} {t.listingSuffix}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= سيارات مميزة ================= */}
      {featuredCars.length > 0 && (
      <section className="border-y" style={{ borderColor: "var(--line-soft)", background: "var(--surface-2)" }}>
        <div className="mx-auto max-w-[1400px] px-4 py-16">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow"><Sparkle size={13} /> {t.featuredEyebrow}</span>
              <h2 className="h-section mt-3">{t.featuredCars}</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                {t.featuredCarsLead}
              </p>
            </div>
            <Link href="/cars?deals=1" className="btn btn-ghost btn-sm" transitionTypes={["nav-forward"]}>{t.allCars} <ArrowLeft size={14} className="dir-flip" /></Link>
          </header>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {featuredCars.map((v) => <VehicleCard key={v.id} v={v} compact featured />)}
          </div>
        </div>
      </section>
      )}

      {/* ================= دراجات مميزة ================= */}
      {featuredMotos.length > 0 && (
      <section>
        <div className="mx-auto max-w-[1400px] px-4 py-16">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow"><Sparkle size={13} /> {t.featuredEyebrow}</span>
              <h2 className="h-section mt-3">{t.featuredMotos}</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                {t.featuredMotosLead}
              </p>
            </div>
            <Link href="/motorcycles" className="btn btn-ghost btn-sm" transitionTypes={["nav-forward"]}>{t.allMotos} <ArrowLeft size={14} className="dir-flip" /></Link>
          </header>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {featuredMotos.map((v) => <VehicleCard key={v.id} v={v} compact featured />)}
          </div>
        </div>
      </section>
      )}

      {/* ================= أحدث الإعلانات ================= */}
      {latestVehicles.length > 0 && (
      <section className="border-y" style={{ borderColor: "var(--line-soft)", background: "var(--surface-2)" }}>
        <div className="mx-auto max-w-[1400px] px-4 py-16">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow"><Clock size={13} /> {t.newEyebrow}</span>
              <h2 className="h-section mt-3">{t.latest}</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                {t.latestLead}
              </p>
            </div>
            <Link href="/vehicles?sort=recent" className="btn btn-ghost btn-sm" transitionTypes={["nav-forward"]}>{t.allListings} <ArrowLeft size={14} className="dir-flip" /></Link>
          </header>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {latestVehicles.map((v) => <VehicleCard key={v.id} v={v} compact />)}
          </div>
        </div>
      </section>
      )}

      <SuggestedForYou />

      {/* ================= الماركات ================= */}
      <section className="border-y" style={{ borderColor: "var(--line-soft)", background: "var(--surface-2)" }}>
        <div className="mx-auto max-w-[1400px] px-4 py-16">
          <h2 className="h-section mb-2">{t.brandsTitle}</h2>
          <p className="mb-7 text-sm" style={{ color: "var(--text-muted)" }}>
            {t.brandsLead}
          </p>

          <h3 className="mb-3 flex items-center gap-2 text-[12px] font-bold" style={{ color: "var(--text-dim)" }}>
            <Car size={14} /> {t.quick.cars}
          </h3>
          <div className="mb-8 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
            {carTiles.map((b) => (
              <BrandTile
                key={b.slug}
                name={b.make}
                count={b.count}
                href={`/cars/${b.slug}`}
              />
            ))}
          </div>

          <h3 className="mb-3 flex items-center gap-2 text-[12px] font-bold" style={{ color: "var(--text-dim)" }}>
            <Moto size={14} /> {t.quick.motos}
          </h3>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
            {motoTiles.map((b) => (
              <BrandTile
                key={b.slug}
                name={b.make}
                count={b.count}
                href={`/motorcycles/${b.slug}`}
                kind="moto"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ================= حسب السعر ================= */}
      {priceBrackets.length > 0 && (
      <section className="mx-auto max-w-[1400px] px-4 py-16">
        <h2 className="h-section mb-2">{t.priceTitle}</h2>
        <p className="mb-7 text-sm" style={{ color: "var(--text-muted)" }}>
          {t.priceLead}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {priceBrackets.map((b) => {
            const sp = new URLSearchParams();
            if (b.priceMin) sp.set("priceMin", String(b.priceMin));
            if (b.priceMax) sp.set("priceMax", String(b.priceMax));
            return (
              <Link
                key={b.key}
                href={`/vehicles?${sp.toString()}`}
                transitionTypes={["nav-forward"]}
                className="card card-hover group flex flex-col items-center gap-2.5 p-5 text-center"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-xl transition-colors"
                  style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                >
                  <Coins size={22} />
                </span>
                <span className="text-[12.5px] font-bold leading-snug">{b.label}</span>
                <span className="num text-[10.5px]" style={{ color: "var(--text-dim)" }}>{b.n} {t.listingSuffix}</span>
              </Link>
            );
          })}
        </div>
      </section>
      )}

      {/* ================= المدن ================= */}
      {topCities.length > 0 && (
      <section className="mx-auto max-w-[1400px] px-4 py-16">
        <h2 className="h-section mb-2">{t.cityTitle}</h2>
        <p className="mb-7 text-sm" style={{ color: "var(--text-muted)" }}>
          {t.citiesLeadA} <span className="num">{topCities.length}</span> {t.citiesLeadB}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {topCities.slice(0, 12).map((c) => (
            <Link
              key={c.slug}
              href={`/cars?city=${c.slug}`}
              transitionTypes={["nav-forward"]}
              className="card card-hover flex items-center gap-2.5 p-4"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
              >
                <MapPin size={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-bold">{cityLabel(c.slug, locale)}</span>
                <span className="num text-[10px]" style={{ color: "var(--text-dim)" }}>{c.n} {t.listingSuffix}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      )}

      {/* ================= قسم الثقة ================= */}
      <section className="border-y" style={{ borderColor: "var(--line-soft)", background: "var(--surface-2)" }}>
        <div className="mx-auto max-w-[1400px] px-4 py-16">
          <span className="eyebrow"><ShieldCheck size={13} /> {t.trustEyebrow}</span>
          <h2 className="h-section mt-3 mb-7">{t.trustTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustPoints.map((tp) => (
              <Link key={tp.key} href={tp.href} className="card card-hover group flex flex-col gap-3 p-5">
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl"
                  style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                >
                  <tp.Icon size={20} />
                </span>
                <div>
                  <h3 className="text-[13.5px] font-bold transition-colors group-hover:text-[var(--brand)]">
                    {tp.title}
                  </h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {tp.text}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= الوكلاء ================= */}
      {topDealers.length > 0 && (
      <section className="mx-auto max-w-[1400px] px-4 py-16">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow"><Users size={13} /> {t.dealersEyebrow}</span>
              <h2 className="h-section mt-3">{t.dealersTitle}</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                {t.dealersLead}
              </p>
            </div>
            <Link href="/dealers" className="btn btn-ghost btn-sm">{t.allDealers} <ArrowLeft size={14} className="dir-flip" /></Link>
          </header>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topDealers.map(({ d, count }) => (
              <Link key={d.slug} href={`/dealer/${d.slug}`} className="card card-hover overflow-hidden">
                <div
                  className="relative h-16"
                  style={{ background: `linear-gradient(120deg, ${d.cover[0]}, ${d.cover[1]})` }}
                >
                  <span
                    className="absolute -bottom-5 start-4 grid h-11 w-11 place-items-center rounded-xl border-2 text-base font-extrabold"
                    style={{ background: "var(--surface-1)", borderColor: "var(--surface-1)", color: "var(--brand)" }}
                  >
                    {d.name.trim().slice(0, 1)}
                  </span>
                </div>
                <div className="p-4 pt-7">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-[13px] font-bold">{d.name}</h3>
                    <BadgeCheck size={13} className="shrink-0" style={{ color: "var(--good)" }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="chip chip-plain"><MapPin size={10} /> {cityLabel(d.city, locale)}</span>
                    {d.rating != null && (
                      <span className="chip chip-plain">
                        <Star size={10} filled style={{ color: "var(--warn)" }} />
                        <span className="num">{d.rating.toFixed(1)}</span>
                      </span>
                    )}
                    <span className="chip chip-plain"><Car size={10} /> <span className="num">{count}</span></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
      </section>
      )}

      {/* ================= علاش طريق ================= */}
      <section className="mx-auto max-w-[1400px] px-4 py-16">
        <header className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow"><Sparkle size={13} /> {t.differenceEyebrow}</span>
            <h2 className="h-section mt-3">{t.differenceTitle}</h2>
            <p className="mt-2 max-w-xl text-sm" style={{ color: "var(--text-muted)" }}>
              {t.differenceLead}
            </p>
          </div>
          <Link href="/about" className="btn btn-ghost btn-sm">{t.aboutUs} <ArrowLeft size={14} className="dir-flip" /></Link>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          {pillars.map((p) => (
            <article key={p.key} className="card card-hover group relative overflow-hidden p-6">
              <div
                className="absolute -end-8 -top-8 h-28 w-28 rounded-full blur-2xl transition-opacity group-hover:opacity-100"
                style={{ background: `color-mix(in oklab, ${p.color} 22%, transparent)`, opacity: 0.4 }}
              />
              <div className="relative">
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl"
                  style={{ background: `color-mix(in oklab, ${p.color} 14%, transparent)`, color: p.color }}
                >
                  <p.Icon size={22} />
                </span>
                <h3 className="mt-4 text-lg font-bold" style={{ color: p.color }}>{p.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {p.text}
                </p>
                <Link
                  href={p.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold transition-all hover:gap-2.5"
                  style={{ color: p.color }}
                >
                  {p.cta} <ArrowLeft size={13} className="dir-flip" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ================= مثال حي ================= */}
      {hero && heroTrust && heroFp && heroTco && (
      <section className="border-y" style={{ borderColor: "var(--line-soft)", background: "var(--surface-2)" }}>
        <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 py-20 lg:grid-cols-2">
          <div>
            <span className="eyebrow"><Sparkle size={13} /> {t.liveExampleEyebrow}</span>
            <h2 className="h-section mt-3">{t.liveExampleTitle}</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {t.liveExampleLeadA} {hero.make} {hero.model} <span className="num">{hero.year}</span>{t.liveExampleLeadB}
            </p>

            <div className="mt-7 space-y-3.5">
              {heroTrust.parts.slice(0, 4).map((part) => (
                <div key={part.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold">
                      {dict.trustPanel.part[part.key as keyof typeof dict.trustPanel.part]}
                    </span>
                    <span className="num" style={{ color: "var(--text-dim)" }}>
                      {part.score}/{part.max}
                    </span>
                  </div>
                  <div className="meter mt-1.5" style={{ height: 5 }}>
                    <i style={{ width: `${(part.score / part.max) * 100}%`, background: "var(--brand)" }} />
                  </div>
                </div>
              ))}
            </div>

            <Link href={vehicleHref(hero)} className="btn btn-primary mt-8" transitionTypes={["nav-forward"]}>
              {t.seeFullListing} <ArrowLeft size={15} className="dir-flip" />
            </Link>
          </div>

          <div className="card-raised overflow-hidden">
            <div className="relative aspect-[16/10]">
              <VehicleArt
                id={hero.id}
                kind={hero.kind}
                body={artShape(hero)}
                color={hero.color}
                className="h-full w-full"
                label={`${hero.make} ${hero.model}`}
              />
              <span className="tag absolute top-3 start-3" style={{ background: "var(--good)", color: "#fff" }}>
                <BadgeCheck size={12} /> {t.inspectedByTriq}
              </span>
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold">{hero.make} {hero.model}</h3>
                  <p className="mt-0.5 truncate text-[11.5px]" style={{ color: "var(--text-dim)" }}>
                    {hero.version} · <span className="num">{hero.year}</span>
                  </p>
                </div>
                <TrustRing score={heroTrust.score} grade={heroTrust.grade} size={54} stroke={5} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: t.statTrust, value: `${heroTrust.score}/100`, color: "var(--good)", Icon: ShieldCheck },
                  {
                    label: t.statVsMarket,
                    value: `${heroFp.delta < 0 ? "−" : "+"}${Math.abs(Math.round(heroFp.delta * 100))}${dict.fairPrice.percent}`,
                    color: heroFp.delta < 0 ? "var(--good)" : "var(--bad)",
                    Icon: Scale,
                  },
                  { label: t.statPerMonth, value: formatNumber(heroTco.perMonth), color: "var(--data)", Icon: Calculator },
                ].map((st) => (
                  <div key={st.label} className="rounded-xl p-3 text-center" style={{ background: "var(--surface-3)" }}>
                    <st.Icon size={15} className="mx-auto" style={{ color: st.color }} />
                    <div className="num mt-1.5 text-[15px] font-extrabold" style={{ color: st.color }}>
                      {st.value}
                    </div>
                    <div className="mt-0.5 text-[9.5px]" style={{ color: "var(--text-dim)" }}>{st.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ================= الأدلة ================= */}
      <section>
        <div className="mx-auto max-w-[1400px] px-4 py-16">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow"><FileText size={13} /> {t.guidesEyebrow}</span>
              <h2 className="h-section mt-3">{t.guidesTitle}</h2>
            </div>
            <Link href="/guides" className="btn btn-ghost btn-sm">{t.allGuides} <ArrowLeft size={14} className="dir-flip" /></Link>
          </header>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {topGuides.map((g) => {
              const GIcon = GUIDE_ICONS[g.icon];
              return (
              <Link key={g.slug} href={`/guides/${g.slug}`} className="card card-hover group flex flex-col p-5">
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl"
                  style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                >
                  <GIcon size={19} />
                </span>
                <h3 className="mt-4 text-[14px] font-bold leading-snug transition-colors group-hover:text-[var(--brand)]">
                  {g.title}
                </h3>
                <p className="mt-2 flex-1 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {g.excerpt}
                </p>
                <span
                  className="mt-3 flex items-center gap-1 text-[10.5px]"
                  style={{ color: "var(--text-dim)" }}
                >
                  <Clock size={11} /> <span className="num">{g.readMinutes}</span> {t.minutes}
                </span>
              </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= نداء البيع ================= */}
      <section className="mx-auto max-w-[1400px] px-4 pb-24">
        <div className="zellige card-raised relative overflow-hidden p-10 text-center sm:p-16">
          <div className="glow pointer-events-none absolute inset-0" />
          <div className="relative">
            <span
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl"
              style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
            >
              <Wallet size={26} />
            </span>
            <h2 className="h-section mt-6">{t.sellCta}</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {t.sellCtaLead}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/sell" className="btn btn-primary btn-lg">{t.sellFree}</Link>
              <Link href="/valuation" className="btn btn-ghost btn-lg">{t.valuateFirst}</Link>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
