import type { Metadata } from "next";
import { Link } from "@/components/Link";
import { ContactForm } from "@/components/ContactForm";
import { dictionaryOf, getDictionary } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/site";
import { Clock, MapPin, Message, Phone, ShieldAlert } from "@/components/icons";

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await dictionaryOf(locale);
  return {
    title: t.contactPage.metaTitle,
    description: t.contactPage.metaDescription,
    alternates: localeAlternates("/contact", locale),
  };
}

export default async function ContactPage() {
  const t = await getDictionary();
  const p = t.contactPage;
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-12">
      <header className="mb-9 max-w-2xl">
        <span className="eyebrow"><Message size={13} /> {p.eyebrow}</span>
        <h1 className="h-page mt-3">{p.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {p.lead}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ContactForm />

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="text-[13px] font-bold">{p.infoTitle}</h2>
            <ul className="mt-3 space-y-3 text-[12px]">
              <li className="flex gap-2.5">
                <Phone size={15} className="mt-0.5 shrink-0" style={{ color: "var(--text-dim)" }} />
                <span style={{ color: "var(--text-muted)" }}>
                  <span className="num" dir="ltr">05 22 00 00 00</span>
                </span>
              </li>
              <li className="flex gap-2.5">
                <Clock size={15} className="mt-0.5 shrink-0" style={{ color: "var(--text-dim)" }} />
                <span style={{ color: "var(--text-muted)" }}>{p.hours}</span>
              </li>
              <li className="flex gap-2.5">
                <MapPin size={15} className="mt-0.5 shrink-0" style={{ color: "var(--text-dim)" }} />
                <span style={{ color: "var(--text-muted)" }}>{p.city}</span>
              </li>
            </ul>
          </section>

          <section className="card p-5" style={{ background: "var(--bad-soft)" }}>
            <h2 className="flex items-center gap-2 text-[13px] font-bold" style={{ color: "var(--bad)" }}>
              <ShieldAlert size={15} /> {p.reportTitle}
            </h2>
            <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {p.reportText}
            </p>
            <Link href="/safety" className="btn btn-solid btn-sm mt-3 w-full">{p.safetyGuide}</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
