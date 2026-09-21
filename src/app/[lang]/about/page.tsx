import type { Metadata } from "next";
import { Link } from "@/components/Link";
import { getDealers, getStats } from "@/lib/source";
import { CITIES } from "@/lib/cities";
import { formatNumber } from "@/lib/format";
import { dictionaryOf, getDictionary } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/site";
import {
  ArrowLeft, BadgeCheck, Calculator, Car, MapPin, Scale, ShieldCheck, Sparkle,
  Users, Wrench,
} from "@/components/icons";

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await dictionaryOf(locale);
  return {
    title: t.aboutPage.metaTitle,
    description: t.aboutPage.metaDescription,
    alternates: localeAlternates("/about", locale),
  };
}

const VALUE_ICONS = [
  { Icon: ShieldCheck, color: "var(--good)" },
  { Icon: Scale, color: "var(--brand)" },
  { Icon: Calculator, color: "var(--data)" },
  { Icon: Wrench, color: "var(--warn)" },
] as const;

export default async function AboutPage() {
  const t = await getDictionary();
  const p = t.aboutPage;
  /* العدّ كيجي من قاعدة البيانات ملي تكون موصولة */
  const [site, dealers] = await Promise.all([getStats(), getDealers()]);

  const stats = [
    { Icon: Car, v: formatNumber(site.cars + site.motos), l: p.statVehicles },
    { Icon: Users, v: formatNumber(dealers.length), l: p.statDealers },
    { Icon: MapPin, v: formatNumber(CITIES.length), l: p.statCities },
    { Icon: BadgeCheck, v: "120", l: p.statInspection },
  ];

  const values = p.values.map((v, i) => ({ ...v, ...VALUE_ICONS[i] }));

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-12">
      <header className="mb-12 max-w-2xl">
        <span className="eyebrow"><Sparkle size={13} /> {p.eyebrow}</span>
        <h1 className="h-page mt-4">{p.title}</h1>
        <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {p.lead}
        </p>
      </header>

      <section className="mb-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="card p-5 text-center">
            <span
              className="mx-auto grid h-11 w-11 place-items-center rounded-xl"
              style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
            >
              <s.Icon size={20} />
            </span>
            <div className="num mt-3 text-2xl font-extrabold">{s.v}</div>
            <div className="mt-1 text-[11px]" style={{ color: "var(--text-dim)" }}>{s.l}</div>
          </div>
        ))}
      </section>

      <section className="mb-14">
        <h2 className="h-section mb-7">{p.valuesTitle}</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {values.map((v) => (
            <article key={v.title} className="card p-6">
              <span
                className="grid h-11 w-11 place-items-center rounded-xl"
                style={{ background: `color-mix(in oklab, ${v.color} 13%, transparent)`, color: v.color }}
              >
                <v.Icon size={21} />
              </span>
              <h3 className="mt-4 text-[16px] font-bold">{v.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {v.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-14">
        <h2 className="h-section mb-5">{p.businessTitle}</h2>
        <div className="card p-6">
          <p className="text-[13.5px] leading-loose" style={{ color: "var(--text-muted)" }}>
            {p.businessP1}
          </p>
          <p className="mt-3 text-[13.5px] leading-loose" style={{ color: "var(--text-muted)" }}>
            {p.businessP2}
          </p>
        </div>
      </section>

      <section
        className="card-raised zellige relative overflow-hidden p-10 text-center"
        style={{ background: "var(--brand-soft)" }}
      >
        <h2 className="h-section">{p.ctaTitle}</h2>
        <p className="mx-auto mt-3 max-w-lg text-[13.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {p.ctaLead}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/cars" className="btn btn-primary">{p.browseCars}</Link>
          <Link href="/contact" className="btn btn-ghost">{p.contactUs} <ArrowLeft size={15} className="dir-flip" /></Link>
        </div>
      </section>
    </div>
  );
}
