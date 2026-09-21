import type { Metadata } from "next";
import { Link } from "@/components/Link";
import { guidesFor } from "@/lib/data/guides";
import { fmtDate } from "@/lib/i18n/labels";
import { dictionaryOf, getDictionary, getLocale } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/site";
import { ArrowLeft, Car, Clock, FileText, GUIDE_ICONS, Moto, ShieldCheck } from "@/components/icons";

const KIND_ICON = { car: Car, moto: Moto, general: ShieldCheck } as const;
const KIND_COLOR = { car: "var(--brand)", moto: "var(--data)", general: "var(--good)" } as const;

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await dictionaryOf(locale);
  return {
    title: t.guidesPage.metaTitle,
    description: t.guidesPage.metaDesc,
    alternates: localeAlternates("/guides", locale),
  };
}

export default async function GuidesPage() {
  const t = await getDictionary();
  const locale = await getLocale();
  const [featured, ...rest] = guidesFor(locale);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10">
      <header className="mb-9 max-w-2xl">
        <span className="eyebrow"><FileText size={13} /> {t.guidesPage.eyebrow}</span>
        <h1 className="h-page mt-4">{t.guidesPage.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t.guidesPage.lead}
        </p>
      </header>

      {/* الدليل المميّز */}
      <Link
        href={`/guides/${featured.slug}`}
        className="card card-hover group mb-6 flex flex-col overflow-hidden lg:flex-row"
      >
        <div
          className="zellige relative flex min-h-[180px] items-center justify-center p-8 lg:w-2/5"
          style={{ background: "linear-gradient(120deg, #0a1e3d, #1f5fe0)" }}
        >
          {(() => { const F = GUIDE_ICONS[featured.icon]; return <F size={54} style={{ color: "rgba(255,255,255,0.9)" }} />; })()}
        </div>
        <div className="flex-1 p-6">
          <span className="tag" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
            {t.guidesPage.mostRead}
          </span>
          <h2 className="mt-3 text-xl font-bold transition-colors group-hover:text-[var(--brand)]">
            {featured.title}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {featured.excerpt}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
            <span className="flex items-center gap-1"><Clock size={12} /> <span className="num">{featured.readMinutes}</span> {t.guidesPage.minutes}</span>
            <span>{t.guidesPage.updatedOn} {fmtDate(featured.updated, locale)}</span>
          </div>
        </div>
      </Link>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {rest.map((g) => {
          const kindColor = KIND_COLOR[g.kind];
          const GIcon = GUIDE_ICONS[g.icon];
          return (
            <Link key={g.slug} href={`/guides/${g.slug}`} className="card card-hover group flex flex-col p-5">
              <span
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: `color-mix(in oklab, ${kindColor} 12%, transparent)`, color: kindColor }}
              >
                <GIcon size={19} />
              </span>
              <h2 className="mt-4 text-[15px] font-bold leading-snug transition-colors group-hover:text-[var(--brand)]">
                {g.title}
              </h2>
              <p className="mt-2 flex-1 text-[12.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {g.excerpt}
              </p>
              <div
                className="mt-4 flex items-center justify-between border-t pt-3 text-[11px]"
                style={{ borderColor: "var(--line-soft)", color: "var(--text-dim)" }}
              >
                <span className="flex items-center gap-1"><Clock size={12} /> <span className="num">{g.readMinutes}</span> {t.guidesPage.minutes}</span>
                <span className="flex items-center gap-1 font-bold" style={{ color: "var(--brand)" }}>
                  {t.guidesPage.read} <ArrowLeft size={13} className="dir-flip" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
