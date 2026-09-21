import type { Metadata } from "next";
import { Link } from "@/components/Link";
import { SafetyChecklist } from "@/components/SafetyChecklist";
import { dictionaryOf, getDictionary } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/site";
import { AlertTriangle, ArrowLeft, BadgeCheck, ClipboardCheck, FileText, ShieldCheck, Wrench } from "@/components/icons";

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await dictionaryOf(locale);
  return {
    title: t.safetyPage.metaTitle,
    description: t.safetyPage.metaDescription,
    alternates: localeAlternates("/safety", locale),
  };
}

export default async function SafetyPage() {
  const t = await getDictionary();
  const p = t.safetyPage;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-12 max-w-2xl">
        <span className="eyebrow"><ShieldCheck size={13} /> {p.eyebrow}</span>
        <h1 className="h-page mt-4">{p.title}</h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {p.lead}
        </p>
      </header>

      <section className="mb-14">
        <h2 className="h-section mb-2 flex items-center gap-2.5"><ClipboardCheck size={22} style={{ color: "var(--brand)" }} /> {p.checklistTitle}</h2>
        <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
          {p.checklistLead}
        </p>
        <SafetyChecklist />
      </section>

      <section className="mb-14">
        <h2 className="h-section mb-6 flex items-center gap-2.5"><AlertTriangle size={22} style={{ color: "var(--bad)" }} /> {p.scamsTitle}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {p.scams.map((s) => (
            <div key={s.title} className="card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--bad)" }}>
                <AlertTriangle size={15} /> {s.title}
              </h3>
              <p
                className="mt-3 rounded-lg p-3 text-xs italic leading-relaxed"
                style={{ background: "var(--surface-3)", color: "var(--text-dim)" }}
              >
                {s.sign}
              </p>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {s.truth}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-14">
        <h2 className="h-section mb-6 flex items-center gap-2.5"><FileText size={22} style={{ color: "var(--brand)" }} /> {p.docsTitle}</h2>
        <div className="card overflow-x-auto p-5">
          <table className="w-full min-w-[420px] text-start text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--line)" }}>
                <th className="pb-2 font-extrabold">{p.docCol}</th>
                <th className="pb-2 font-extrabold">{p.checkCol}</th>
              </tr>
            </thead>
            <tbody>
              {(p.docs as [string, string][]).map(([a, b]) => (
                <tr key={a} className="border-b" style={{ borderColor: "var(--line-soft)" }}>
                  <td className="py-3 font-bold">{a}</td>
                  <td className="py-3" style={{ color: "var(--text-muted)" }}>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
          {p.transferNote}
        </p>
      </section>

      <section className="card-raised zellige relative overflow-hidden p-10 text-center sm:p-14">
        <div className="glow pointer-events-none absolute inset-0" />
        <div className="relative">
          <span
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl"
            style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
          >
            <Wrench size={26} />
          </span>
          <h2 className="h-section mt-5">{p.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {p.ctaLead}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/inspection" className="btn btn-primary btn-lg"><Wrench size={16} /> {p.seeInspection}</Link>
            <Link href="/vehicles?verified=1" className="btn btn-ghost btn-lg"><BadgeCheck size={16} /> {p.verifiedVehicles}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
