import type { Metadata } from "next";
import { Link } from "@/components/Link";
import { VehicleCard } from "@/components/VehicleCard";
import { findAll } from "@/lib/source";
import { dictionaryOf, getDictionary } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import {
  AirCon, ArrowLeft, BadgeCheck, Battery, Belt, BrakePad, BrakeRotor, Car,
  ClipboardCheck, Clock, Diagnostic, EngineBlock, FileText, Gauge, Headlight,
  IdCard, Lock2, MapPin, Moto, Odometer, OilCan, Palette, Scale, Scan,
  Screen, Shield, ShieldCheck, Shock, Sparkle, Steering, Tire, Transmission,
  Turbo, Window, Wrench,
} from "@/components/icons";

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = await dictionaryOf(isLocale(lang) ? lang : DEFAULT_LOCALE);
  return { title: t.inspectionPage.metaTitle, description: t.inspectionPage.metaDesc };
}

const SECTION_META = [
  { Icon: EngineBlock, color: "var(--brand)", itemIcons: [Diagnostic, OilCan, Belt, Turbo, Transmission] },
  { Icon: Palette, color: "var(--data)", itemIcons: [Palette, Scan, Shield, Scale, IdCard] },
  { Icon: BrakeRotor, color: "var(--good)", itemIcons: [BrakePad, Shock, Steering, Tire, Gauge] },
  { Icon: Battery, color: "var(--warn)", itemIcons: [Battery, Headlight, AirCon, Screen, Window] },
  { Icon: FileText, color: "var(--bad)", itemIcons: [FileText, Lock2, Odometer, ShieldCheck, Clock] },
];

const STEP_ICONS = [ClipboardCheck, MapPin, Scan, BadgeCheck];
const PRICING_META = [
  { price: "250", Icon: Moto },
  { price: "450", Icon: Car, featured: true },
  { price: "650", Icon: Gauge },
];

export default async function InspectionPage() {
  const t = await getDictionary();
  const inspected = await findAll({ inspectedOnly: true, sort: "trust-desc" }, 4);

  const SECTIONS = t.inspectionPage.sections.map((sec, i) => ({
    title: sec.title,
    points: sec.points,
    Icon: SECTION_META[i].Icon,
    color: SECTION_META[i].color,
    items: sec.items.map((text, j) => ({ Icon: SECTION_META[i].itemIcons[j], t: text })),
  }));
  const STEPS = t.inspectionPage.steps.map(([title, desc], i) => ({
    n: i + 1, Icon: STEP_ICONS[i], t: title, d: desc,
  }));
  const PRICING = t.inspectionPage.pricing.map((p, i) => ({
    name: p.name, points: p.points, note: p.note, price: PRICING_META[i].price,
    Icon: PRICING_META[i].Icon, featured: PRICING_META[i].featured,
  }));

  const total = SECTIONS.reduce((s, x) => s + x.points, 0);

  const BENEFITS = [
    { Icon: ShieldCheck, label: `${total} ${t.inspectionPage.benefits.points}` },
    { Icon: FileText, label: t.inspectionPage.benefits.report },
    { Icon: Wrench, label: t.inspectionPage.benefits.mechanic },
    { Icon: MapPin, label: t.inspectionPage.benefits.coverage },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12">
      <header className="mb-10 flex max-w-2xl flex-col items-center text-center sm:mx-auto">
        <span
          className="mb-5 grid h-16 w-16 place-items-center rounded-2xl"
          style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
        >
          <Shield size={30} />
        </span>
        <span className="eyebrow"><Wrench size={13} /> {t.inspectionPage.eyebrow}</span>
        <h1 className="h-page mt-4">{t.inspectionPage.title}</h1>
        <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <span className="num">{total}</span> {t.inspectionPage.leadA}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/vehicles" className="btn btn-primary btn-lg">
            {t.inspectionPage.requestInspection} <ArrowLeft size={15} className="dir-flip" />
          </Link>
          <Link href="/vehicles?inspected=1" className="btn btn-ghost btn-lg">
            <BadgeCheck size={16} /> {t.inspectionPage.seeInspected}
          </Link>
        </div>
      </header>

      <div className="mb-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BENEFITS.map((b) => (
          <div key={b.label} className="card flex flex-col items-center gap-2.5 p-5 text-center">
            <span
              className="grid h-11 w-11 place-items-center rounded-xl"
              style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
            >
              <b.Icon size={20} />
            </span>
            <span className="text-[12px] font-bold leading-snug">{b.label}</span>
          </div>
        ))}
      </div>

      <section className="mb-16">
        <h2 className="h-section mb-7">{t.inspectionPage.howTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="card card-hover p-5">
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl"
                  style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                >
                  <s.Icon size={19} />
                </span>
                <span className="num text-xs font-bold" style={{ color: "var(--text-dim)" }}>
                  0{s.n}
                </span>
              </div>
              <h3 className="mt-4 text-[14px] font-bold">{s.t}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {s.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="h-section mb-7">{t.inspectionPage.whatTitle}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2.5 text-[14px] font-bold">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-lg"
                    style={{ background: `color-mix(in oklab, ${sec.color} 14%, transparent)`, color: sec.color }}
                  >
                    <sec.Icon size={17} />
                  </span>
                  {sec.title}
                </h3>
                <span className="chip"><span className="num">{sec.points}</span> {t.inspectionPage.point}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {sec.items.map((it) => (
                  <li key={it.t} className="flex items-start gap-2.5 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    <span
                      className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-md"
                      style={{ background: `color-mix(in oklab, ${sec.color} 11%, transparent)`, color: sec.color }}
                    >
                      <it.Icon size={14} />
                    </span>
                    <span className="min-w-0">{it.t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="h-section mb-7">{t.inspectionPage.pricingTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PRICING.map((p) => (
            <div
              key={p.name}
              className={p.featured ? "card-raised relative p-6 text-center" : "card relative p-6 text-center"}
              style={p.featured ? { borderColor: "var(--brand)" } : undefined}
            >
              {p.featured && (
                <span
                  className="tag absolute -top-2.5 start-1/2 translate-x-1/2"
                  style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
                >
                  <Sparkle size={11} /> {p.note}
                </span>
              )}
              <span
                className="mx-auto grid h-12 w-12 place-items-center rounded-xl"
                style={{ background: "var(--surface-3)", color: "var(--brand)" }}
              >
                <p.Icon size={22} />
              </span>
              <h3 className="mt-4 text-[14px] font-bold">{p.name}</h3>
              <p className="mt-3">
                <span className="num text-3xl font-extrabold" style={{ color: "var(--brand)" }}>{p.price}</span>
                <span className="ms-1.5 text-xs font-bold opacity-60">{t.inspectionPage.dh}</span>
              </p>
              <p className="num mt-2 text-xs" style={{ color: "var(--text-dim)" }}>{p.points}</p>
              {!p.featured && (
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-dim)" }}>{p.note}</p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px]" style={{ color: "var(--text-dim)" }}>
          <MapPin size={13} /> {t.inspectionPage.travelNoteA}{" "}
          <span className="num">3</span> {t.inspectionPage.travelNoteB}
        </p>
      </section>

      {inspected.length > 0 && (
        <section>
          <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <h2 className="h-section">{t.inspectionPage.availableNowTitle}</h2>
            <Link href="/vehicles?inspected=1" className="btn btn-ghost btn-sm">{t.inspectionPage.all} <ArrowLeft size={14} className="dir-flip" /></Link>
          </header>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {inspected.map((v) => <VehicleCard key={v.id} v={v} compact />)}
          </div>
        </section>
      )}
    </div>
  );
}
