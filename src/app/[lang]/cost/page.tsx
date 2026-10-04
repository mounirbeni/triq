import type { Metadata } from "next";
import { CostClient } from "@/components/CostClient";
import { Calculator, Coins, Info } from "@/components/icons";
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
    title: t.costPage.metaTitle,
    description: t.costPage.metaDesc,
    alternates: localeAlternates("/cost", locale),
  };
}

export default async function CostPage() {
  const t = await getDictionary();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 max-w-2xl">
        <span className="eyebrow"><Calculator size={13} /> {t.costPage.eyebrow}</span>
        <h1 className="h-page mt-4">{t.costPage.title}</h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t.costPage.lead}
        </p>
      </header>

      <CostClient />

      <section className="card mt-10 p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <Coins size={17} style={{ color: "var(--brand)" }} /> {t.costPage.vignetteTitle}
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          {t.costPage.vignetteLead}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-start text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--line)" }}>
                <th className="pb-2 font-extrabold">{t.costPage.colPower}</th>
                <th className="pb-2 font-extrabold">{t.costPage.colPetrol}</th>
                <th className="pb-2 font-extrabold">{t.costPage.colDiesel}</th>
              </tr>
            </thead>
            <tbody>
              {t.costPage.rows.map((r) => (
                <tr key={r[0]} className="border-b" style={{ borderColor: "var(--line-soft)" }}>
                  <td className="py-2.5 font-bold">{r[0]}</td>
                  <td className="num py-2.5" style={{ color: "var(--text-muted)" }}>{r[1]}</td>
                  <td className="num py-2.5" style={{ color: "var(--text-muted)" }}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex gap-2 text-[11px]" style={{ color: "var(--text-dim)" }}>
          <Info size={13} className="mt-px shrink-0" />
          {t.costPage.note}
        </p>
      </section>
    </div>
  );
}
