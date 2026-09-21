import type { Metadata } from "next";
import { Link } from "@/components/Link";
import { dictionaryOf, getDictionary } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/site";
import {
  ArrowLeft, BadgeCheck, Car, Coins, FileText, Help, Message, ShieldAlert,
  ShieldCheck, Wallet, Wrench,
} from "@/components/icons";

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await dictionaryOf(locale);
  return {
    title: t.helpPage.metaTitle,
    description: t.helpPage.metaDescription,
    alternates: localeAlternates("/help", locale),
  };
}

const TOPIC_META = [
  { Icon: Car, href: "#buying" },
  { Icon: Wallet, href: "#selling" },
  { Icon: ShieldCheck, href: "#trust" },
  { Icon: Coins, href: "#pricing" },
] as const;

const FAQ_IDS = ["buying", "selling", "trust", "pricing"] as const;

export default async function HelpPage() {
  const t = await getDictionary();
  const p = t.helpPage;
  const topics = TOPIC_META.map((m, i) => ({ ...m, title: p.topics[i] }));
  const faq = p.faq.map((sec, i) => ({ ...sec, id: FAQ_IDS[i] }));

  return (
    <div className="mx-auto max-w-[900px] px-4 py-12">
      <header className="mb-9 max-w-2xl">
        <span className="eyebrow"><Help size={13} /> {p.eyebrow}</span>
        <h1 className="h-page mt-3">{p.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {p.lead}
        </p>
      </header>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {topics.map((t) => (
          <a
            key={t.href}
            href={t.href}
            className="card card-hover flex flex-col items-center gap-2 p-5 text-center"
          >
            <span
              className="grid h-11 w-11 place-items-center rounded-xl"
              style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
            >
              <t.Icon size={20} />
            </span>
            <span className="text-[12.5px] font-bold">{t.title}</span>
          </a>
        ))}
      </div>

      <div className="space-y-10">
        {faq.map((sec) => (
          <section key={sec.id} id={sec.id} className="scroll-mt-24">
            <h2 className="h-section mb-5">{sec.heading}</h2>
            <div className="space-y-3">
              {sec.items.map((it) => (
                <details key={it.q} className="card group p-5">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 text-[14px] font-bold">
                    {it.q}
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] transition group-open:rotate-45"
                      style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[13px] leading-loose" style={{ color: "var(--text-muted)" }}>
                    {it.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section id="rules" className="card mt-12 p-6 scroll-mt-24">
        <h2 className="flex items-center gap-2 text-[16px] font-bold">
          <FileText size={17} style={{ color: "var(--brand)" }} /> {p.rulesTitle}
        </h2>
        <ul className="mt-3 space-y-2">
          {p.rules.map((r) => (
            <li key={r} className="flex gap-2.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
              <BadgeCheck size={15} className="mt-0.5 shrink-0" style={{ color: "var(--good)" }} /> {r}
            </li>
          ))}
        </ul>
      </section>

      <section
        className="card-raised mt-8 flex flex-col items-center p-8 text-center"
        style={{ background: "var(--brand-soft)" }}
      >
        <Message size={26} style={{ color: "var(--brand)" }} />
        <h2 className="mt-4 text-lg font-bold">{p.noAnswerTitle}</h2>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {p.noAnswerText}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/contact" className="btn btn-primary btn-sm">{p.contactBtn} <ArrowLeft size={14} className="dir-flip" /></Link>
          <Link href="/safety" className="btn btn-ghost btn-sm"><ShieldAlert size={14} /> {p.safetyBtn}</Link>
          <Link href="/inspection" className="btn btn-ghost btn-sm"><Wrench size={14} /> {p.inspectionBtn}</Link>
        </div>
      </section>
    </div>
  );
}
