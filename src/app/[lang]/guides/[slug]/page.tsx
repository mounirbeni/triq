import type { Metadata } from "next";
import { Link } from "@/components/Link";
import { notFound } from "next/navigation";
import { guidesFor, guideBySlugFor } from "@/lib/data/guides";
import { fmtDate } from "@/lib/i18n/labels";
import { jsonLdHtml } from "@/lib/jsonLd";
import { dictionaryOf, getDictionary, getLocale } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, HTML_LANG, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/site";
import { ArrowLeft, Check, ChevronLeft, Clock, FileText } from "@/components/icons";

/* السطرين التاليين نفس السبب فباقي صفحات [lang]/.../[slug]: التخطيط
   الجذري كيقرا الكوكي، فماكيمكنش الصفحة تتّبنى ساكنة بصح — و
   generateStaticParams القديمة كانت خاصة بـslug وحدو، ماشي
   lang+slug كيفما دابا. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await dictionaryOf(locale);
  const g = guideBySlugFor(slug, locale);
  if (!g) return { title: t.guideDetail.notFound };
  return {
    title: g.title,
    description: g.excerpt,
    alternates: localeAlternates(`/guides/${slug}`, locale),
    openGraph: { title: g.title, description: g.excerpt, type: "article" },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const t = await getDictionary();
  const locale = await getLocale();
  const g = guideBySlugFor(slug, locale);
  if (!g) notFound();

  const others = guidesFor(locale).filter((x) => x.slug !== g.slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.excerpt,
    dateModified: g.updated,
    inLanguage: HTML_LANG[locale],
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />

      <nav className="mb-6 flex items-center gap-1 text-[11px]" style={{ color: "var(--text-dim)" }}>
        <Link href="/" className="transition hover:text-[var(--brand)]">{t.guideDetail.home}</Link>
        <ChevronLeft size={12} className="dir-flip" />
        <Link href="/guides" className="transition hover:text-[var(--brand)]">{t.guideDetail.guidesNav}</Link>
        <ChevronLeft size={12} className="dir-flip" />
        <span style={{ color: "var(--text-muted)" }}>{g.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <article className="min-w-0">
          <header className="mb-8">
            <h1 className="h-page">{g.title}</h1>
            <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {g.excerpt}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[11.5px]" style={{ color: "var(--text-dim)" }}>
              <span className="flex items-center gap-1"><Clock size={13} /> <span className="num">{g.readMinutes}</span> {t.guideDetail.minutesRead}</span>
              <span>·</span>
              <span>{t.guideDetail.updated} {fmtDate(g.updated, locale)}</span>
            </div>
          </header>

          <div className="space-y-8">
            {g.sections.map((sec, i) => (
              <section key={i} className="card p-6">
                <h2 className="text-lg font-bold">{sec.heading}</h2>
                {sec.body.map((para, j) => (
                  <p key={j} className="mt-3 text-[13.5px] leading-loose" style={{ color: "var(--text-muted)" }}>
                    {para}
                  </p>
                ))}
                {sec.list && (
                  <ul className="mt-4 space-y-2.5">
                    {sec.list.map((item, j) => (
                      <li key={j} className="flex gap-2.5 text-[13px] leading-relaxed">
                        <Check size={15} className="mt-0.5 shrink-0" style={{ color: "var(--brand)" }} />
                        <span style={{ color: "var(--text-muted)" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <div
            className="card-raised zellige relative mt-10 overflow-hidden p-8 text-center"
            style={{ background: "var(--brand-soft)" }}
          >
            <h2 className="h-section">{t.guideDetail.ctaTitle}</h2>
            <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {t.guideDetail.ctaLead}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/cars" className="btn btn-primary">{t.guideDetail.browseCars}</Link>
              <Link href="/motorcycles" className="btn btn-ghost">{t.guideDetail.browseMotos}</Link>
            </div>
          </div>
        </article>

        <aside className="lg:sticky lg:top-[84px] lg:h-fit">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-[13px] font-bold">
              <FileText size={15} style={{ color: "var(--brand)" }} /> {t.guideDetail.otherGuides}
            </h2>
            <ul className="mt-4 space-y-3">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={`/guides/${o.slug}`} className="group block">
                    <span className="block text-[12.5px] font-bold leading-snug transition-colors group-hover:text-[var(--brand)]">
                      {o.title}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-[10.5px]" style={{ color: "var(--text-dim)" }}>
                      <Clock size={11} /> <span className="num">{o.readMinutes}</span> {t.guidesPage.minutes}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/guides"
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold"
              style={{ color: "var(--brand)" }}
            >
              {t.guideDetail.allGuides} <ArrowLeft size={13} className="dir-flip" />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
