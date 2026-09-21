"use client";

import { Link } from "@/components/Link";
import { useEffect, useMemo, useState } from "react";
import { paramsFromFilters, type Filters } from "@/lib/search";
import { fairPriceOf, trustOf } from "@/lib/market";
import { computeTco } from "@/lib/tco";
import { CITIES } from "@/lib/cities";
import { formatNumber } from "@/lib/format";
import { VehicleCard } from "@/components/VehicleCard";
import { Mixed } from "@/components/Mixed";
import type { Vehicle } from "@/lib/types";
import { useDict, useHref, useLocale } from "@/lib/i18n/client";
import { cityLabel, dhUnit, fill } from "@/lib/i18n/labels";
import type { Dictionary } from "@/lib/i18n/server";
import {
  ArrowLeft, ArrowRight, Car, Check, Coins, Fuel, MapPin, Moto, Reset,
  Road, Search, Sparkle, Users, Wallet,
} from "@/components/icons";

type Use = "ville" | "route" | "famille" | "travail" | "plaisir";

interface Answers {
  kind: "car" | "moto";
  budget: number;
  city: string;
  seats: number;
  use: Use;
  kmPerYear: number;
}

const USE_ICONS: Record<Use, typeof Car> = {
  ville: MapPin, route: Road, famille: Users, travail: Wallet, plaisir: Sparkle,
};
const USE_KEYS: Use[] = ["ville", "route", "famille", "travail", "plaisir"];

const BUDGETS = [40000, 70000, 100000, 150000, 220000, 350000];
const MOTO_BUDGETS = [12000, 25000, 45000, 70000, 110000, 180000];

/** تحويل الأجوبة لفلاتر حقيقية */
function toFilters(a: Answers): Partial<Filters> {
  const f: Partial<Filters> = {
    kind: a.kind,
    city: a.city || "",
    priceMax: a.budget,
    sort: "deal",
  };
  if (a.kind === "car") {
    if (a.use === "famille") f.body = a.seats >= 6 ? "utilitaire" : "suv";
    else if (a.use === "ville") f.body = "citadine";
    else if (a.use === "route") f.fuel = "diesel";
    else if (a.use === "travail") f.body = "utilitaire";
    if (a.kmPerYear >= 25000) f.fuel = "diesel";
    if (a.kmPerYear <= 8000 && a.use === "ville") f.fuel = "essence";
  } else {
    if (a.use === "ville") f.body = "scooter";
    else if (a.use === "route") f.body = "trail";
    else if (a.use === "plaisir") f.body = "sportive";
  }
  return f;
}

/** لماذا اقترحنا هذه المركبة */
function reasons(v: Vehicle, a: Answers, t: Dictionary): string[] {
  const out: string[] = [];
  const fp = fairPriceOf(v);
  const tr = trustOf(v);
  const tco = computeTco(v, {
    kmPerYear: a.kmPerYear,
    years: 3,
    coverage: "tiers",
    includeDepreciation: false,
  });
  const r = t.assistant.reason;
  if (fp.delta < -0.06) out.push(fill(r.belowPrice, { pct: String(Math.round(Math.abs(fp.delta) * 100)) }));
  if (tr.score >= 75) out.push(fill(r.trustScore, { score: String(tr.score) }));
  if (v.inspected) out.push(r.inspected);
  if (v.firstHand) out.push(r.firstHand);
  out.push(fill(r.yearlyCost, { v: formatNumber(tco.perYear) }));
  if (a.city && v.city === a.city) out.push(r.sameCity);
  return out.slice(0, 4);
}

export function AssistantClient() {
  const t = useDict();
  const locale = useLocale();
  const href = useHref();
  const dh = dhUnit(locale);
  const STEP_TITLES = t.assistant.steps;
  const USES = USE_KEYS.map((k) => ({
    value: k, label: t.assistant.uses[k][0], hint: t.assistant.uses[k][1], Icon: USE_ICONS[k],
  }));
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({
    kind: "car", budget: 100000, city: "", seats: 5, use: "ville", kmPerYear: 15000,
  });
  const set = (patch: Partial<Answers>) => setA((p) => ({ ...p, ...patch }));
  const done = step >= STEP_TITLES.length;

  const [results, setResults] = useState<Vehicle[]>([]);

  /* النتائج كتجي من قاعدة البيانات. إلا كانو قليلين كنوسّعو
     المعايير على مراحل — نوع الهيكل أولاً، ومن بعد المدينة
     والوقود — بدل ما نرجعو للمستخدم بلا والو. */
  useEffect(() => {
    if (!done) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const f = toFilters(a);
    const tries: Partial<Filters>[] = [
      f,
      { ...f, body: "" },
      { ...f, body: "", city: "", fuel: "" },
    ];

    (async () => {
      for (const filters of tries) {
        const qs = paramsFromFilters(filters);
        qs.set("limit", "6");
        try {
          const res = await fetch(`/api/listings?${qs.toString()}`, { signal: ctrl.signal });
          const json = await res.json();
          const items = json?.ok ? (json.data.items as Vehicle[]) : [];
          if (items.length >= 3 || filters === tries[tries.length - 1]) {
            setResults(items);
            return;
          }
        } catch {
          return;
        }
      }
    })();

    return () => ctrl.abort();
  }, [a, done]);

  const budgets = a.kind === "car" ? BUDGETS : MOTO_BUDGETS;

  if (done) {
    const resultsHref = href(`/search?${paramsFromFilters(toFilters(a)).toString()}`);
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10">
        <header className="mb-8 max-w-2xl">
          <span className="eyebrow"><Sparkle size={13} /> {t.assistant.resultEyebrow}</span>
          <h1 className="h-page mt-4">
            {results.length > 0 ? t.assistant.resultTitleFound : t.assistant.resultTitleEmpty}
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {results.length > 0 ? (
              <>
                {t.assistant.resultLeadFoundA}{" "}
                <b className="num">{formatNumber(a.budget)}</b> {dh}. {t.assistant.resultLeadFoundB}
              </>
            ) : (
              <>{t.assistant.resultLeadEmpty}</>
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => setStep(0)} className="btn btn-ghost btn-sm">
              <Reset size={14} /> {t.assistant.changeAnswers}
            </button>
            <Link href={resultsHref} className="btn btn-primary btn-sm">
              <Search size={14} /> {t.assistant.seeAllMatches}
            </Link>
          </div>
        </header>

        {results.length > 0 && (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
            {results.map((v) => (
              <div key={v.id} className="flex min-w-0 flex-col gap-2">
                <VehicleCard v={v} />
                <ul className="flex flex-wrap gap-1.5 px-1">
                  {reasons(v, a, t).map((r) => (
                    <li key={r} className="chip chip-plain text-[10.5px]">
                      <Check size={10} style={{ color: "var(--good)" }} /> <Mixed text={r} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-10">
      <header className="mb-7">
        <span className="eyebrow"><Sparkle size={13} /> {t.assistant.quizEyebrow}</span>
        <h1 className="h-page mt-4">{t.assistant.quizTitle}</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t.assistant.quizLeadA} <span className="num">5</span> {t.assistant.quizLeadB}
        </p>
      </header>

      {/* شريط التقدم */}
      <div className="mb-7 flex gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={5}>
        {STEP_TITLES.map((st, i) => (
          <div key={st} className="min-w-0 flex-1">
            <div
              className="h-1.5 rounded-full transition-colors"
              style={{ background: i <= step ? "var(--brand)" : "var(--surface-3)" }}
            />
            <span
              className="mt-1.5 block truncate text-[10px] font-bold"
              style={{ color: i <= step ? "var(--brand)" : "var(--text-dim)" }}
            >
              {st}
            </span>
          </div>
        ))}
      </div>

      <div className="card p-6">
        {step === 0 && (
          <Q title={t.assistant.q0Title}>
            <div className="grid grid-cols-2 gap-3">
              {([["car", t.assistant.car, Car], ["moto", t.assistant.moto, Moto]] as const).map(([k, label, Icon]) => (
                <Pick key={k} on={a.kind === k} onClick={() => set({ kind: k, budget: k === "car" ? 100000 : 25000 })}>
                  <Icon size={26} />
                  <span className="mt-2 text-sm font-bold">{label}</span>
                </Pick>
              ))}
            </div>
          </Q>
        )}

        {step === 1 && (
          <Q title={t.assistant.q1Title} hint={t.assistant.q1Hint}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {budgets.map((b) => (
                <Pick key={b} on={a.budget === b} onClick={() => set({ budget: b })}>
                  <span className="num text-base font-extrabold">{formatNumber(b)}</span>
                  <span className="text-[10.5px]" style={{ color: "var(--text-dim)" }}>{dh} {t.assistant.dhAndLess}</span>
                </Pick>
              ))}
            </div>
          </Q>
        )}

        {step === 2 && (
          <Q title={t.assistant.q2Title} hint={t.assistant.q2Hint}>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => set({ city: "" })}
                className="chip"
                style={a.city === "" ? { background: "var(--brand)", color: "#fff", borderColor: "transparent" } : undefined}
              >
                {t.assistant.allMorocco}
              </button>
              {CITIES.slice(0, 14).map((c) => (
                <button
                  key={c.slug}
                  onClick={() => set({ city: c.slug })}
                  className="chip"
                  style={a.city === c.slug ? { background: "var(--brand)", color: "#fff", borderColor: "transparent" } : undefined}
                >
                  {cityLabel(c.slug, locale)}
                </button>
              ))}
            </div>
          </Q>
        )}

        {step === 3 && (
          <Q title={t.assistant.q3Title}>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {USES.map((u) => (
                <Pick key={u.value} on={a.use === u.value} onClick={() => set({ use: u.value })} row>
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                    style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                  >
                    <u.Icon size={17} />
                  </span>
                  <span className="min-w-0 text-start">
                    <span className="block text-[13px] font-bold">{u.label}</span>
                    <span className="block text-[11px]" style={{ color: "var(--text-dim)" }}>{u.hint}</span>
                  </span>
                </Pick>
              ))}
            </div>
            {a.kind === "car" && a.use === "famille" && (
              <div className="mt-4">
                <span className="label mb-2 block">{t.assistant.seatsQ}</span>
                <div className="flex gap-2">
                  {[4, 5, 7].map((n) => (
                    <button
                      key={n}
                      onClick={() => set({ seats: n })}
                      className="chip num"
                      style={a.seats === n ? { background: "var(--brand)", color: "#fff", borderColor: "transparent" } : undefined}
                    >
                      {n === 7 ? t.assistant.sixOrMore : n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Q>
        )}

        {step === 4 && (
          <Q title={t.assistant.q4Title} hint={t.assistant.q4Hint}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { v: 6000, l: t.assistant.kmOptions[0][0], h: t.assistant.kmOptions[0][1] },
                { v: 15000, l: t.assistant.kmOptions[1][0], h: t.assistant.kmOptions[1][1] },
                { v: 28000, l: t.assistant.kmOptions[2][0], h: t.assistant.kmOptions[2][1] },
                { v: 45000, l: t.assistant.kmOptions[3][0], h: t.assistant.kmOptions[3][1] },
              ].map((o) => (
                <Pick key={o.v} on={a.kmPerYear === o.v} onClick={() => set({ kmPerYear: o.v })}>
                  <span className="text-[13px] font-bold">{o.l}</span>
                  <span className="mt-0.5 text-[10px]" style={{ color: "var(--text-dim)" }}>{o.h}</span>
                </Pick>
              ))}
            </div>
            <p
              className="mt-4 flex items-start gap-2 rounded-xl p-3 text-[11.5px] leading-relaxed"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              <Fuel size={14} className="mt-px shrink-0" style={{ color: "var(--brand)" }} />
              {t.assistant.dieselTipA} <span className="num">20</span> {t.assistant.dieselTipB}
              {" "}<span className="num">10</span> {t.assistant.dieselTipC}
            </p>
          </Q>
        )}

        <div className="mt-7 flex items-center justify-between gap-3">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn btn-ghost btn-sm"
          >
            <ArrowRight size={14} className="dir-flip" /> {t.assistant.back}
          </button>
          <button onClick={() => setStep((s) => s + 1)} className="btn btn-primary">
            {step === STEP_TITLES.length - 1 ? (
              <><Coins size={16} /> {t.assistant.seeSuggestions}</>
            ) : (
              <>{t.assistant.next} <ArrowLeft size={15} className="dir-flip" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Q({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-extrabold">{title}</h2>
      {hint && <p className="mt-1 text-[12.5px]" style={{ color: "var(--text-dim)" }}>{hint}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Pick({
  on, onClick, children, row = false,
}: { on: boolean; onClick: () => void; children: React.ReactNode; row?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`flex rounded-xl border p-4 transition-all ${
        row ? "items-center gap-3" : "flex-col items-center justify-center text-center"
      }`}
      style={{
        borderColor: on ? "var(--brand)" : "var(--line)",
        background: on ? "var(--brand-soft)" : "transparent",
        color: on ? "var(--brand)" : "var(--text)",
        boxShadow: on ? "0 0 0 1px var(--brand)" : undefined,
      }}
    >
      {children}
    </button>
  );
}
