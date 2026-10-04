"use client";

import { Link } from "@/components/Link";
import { vehicleHref } from "@/lib/slug";
import { useEffect, useMemo, useState } from "react";
import { useEstimate } from "@/hooks/useEstimate";
import { useCatalog } from "@/lib/useCatalog";
import { formatNumber } from "@/lib/format";
import { CITIES } from "@/lib/cities";
import type { Condition } from "@/lib/types";
import { Price } from "@/components/Price";
import { useDict, useLocale } from "@/lib/i18n/client";
import { cityLabel, dhUnit, fill, kmUnit, specs } from "@/lib/i18n/labels";
import {
  ArrowLeft, BadgeCheck, Calendar, Car, Chart, Coins, Fuel, Gauge, Gearbox,
  Info, MapPin, Moto, Sparkle, TrendingDown, Wallet,
} from "@/components/icons";

export function EstimateTool() {
  const t = useDict();
  const locale = useLocale();
  const L = specs(locale);
  const CONDITIONS: [Condition, string, string][] = (
    ["excellent", "tres-bon", "bon", "moyen"] as const
  ).map((k) => [k, t.estimate.conditions[k][0], t.estimate.conditions[k][1]]);
  const [kind, setKind] = useState<"car" | "moto">("car");
  const [make, setMake] = useState("Dacia");
  const [model, setModel] = useState("Logan");
  const [year, setYear] = useState(2018);
  const [km, setKm] = useState(120000);
  const [fuel, setFuel] = useState("diesel");
  const [gearbox, setGearbox] = useState("manuelle");
  const [condition, setCondition] = useState<Condition>("tres-bon");
  const [city, setCity] = useState("casablanca");

  /* الماركات والموديلات كيجيو من قاعدة البيانات */
  const { makesFor, modelsFor } = useCatalog();

  /* عدد المركبات المعروضة — كيبان فالملاحظة تحت التقدير */
  const [fleet, setFleet] = useState(0);
  useEffect(() => {
    let alive = true;
    fetch("/api/listings?limit=1")
      .then((r) => r.json())
      .then((j) => alive && j?.ok && setFleet(j.data.total as number))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const makes = useMemo(() => makesFor(kind), [makesFor, kind]);
  const models = useMemo(() => modelsFor(make, kind), [modelsFor, make, kind]);

  function changeKind(k: "car" | "moto") {
    setKind(k);
    const m = makesFor(k)[0];
    setMake(m);
    setModel(modelsFor(m, k)[0] ?? "");
    setKm(k === "moto" ? 20000 : 120000);
    setFuel(k === "moto" ? "essence" : "diesel");
  }

  function changeMake(m: string) {
    setMake(m);
    setModel(modelsFor(m, kind)[0] ?? "");
  }

  const { estimate: est } = useEstimate({
    kind, make, model, year, km, fuel, gearbox, condition,
  });
  /* بلا مشابهات كافية فقاعدة البيانات، est كيرجع صفر — كنبيّنو
     «مراجع محدودة» بدل ما نوريو 0 د.م كأنّو ثمن حقيقي. */
  const noMarketRef = est.sampleSize === 0;

  // توقّع القيمة على 5 سنوات
  const projection = useMemo(() => {
    const rate = kind === "car" ? 0.1 : 0.075;
    const age = 2026 - year;
    const eff = rate * Math.max(0.35, 1 - age * 0.045);
    return Array.from({ length: 6 }, (_, i) => ({
      year: 2026 + i,
      value: Math.round(est.mid * Math.pow(1 - eff, i)),
    }));
  }, [est.mid, year, kind]);

  const maxProj = projection[0]?.value || 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      {/* النموذج */}
      <div className="card h-fit p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-bold"><Sparkle size={15} style={{ color: "var(--brand)" }} /> {t.estimate.formTitle}</h2>

        <div className="mt-4 grid grid-cols-2 gap-1.5">
          {([["car", t.estimate.car, Car], ["moto", t.estimate.moto, Moto]] as const).map(([k, l, I]) => (
            <button
              key={k}
              onClick={() => changeKind(k)}
              aria-pressed={kind === k}
              className="flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition"
              style={{
                background: kind === k ? "var(--brand)" : "var(--surface-3)",
                color: kind === k ? "var(--brand-ink)" : "var(--text-muted)",
              }}
            >
              <I size={17} /> {l}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="label" htmlFor="es-make"><BadgeCheck size={13} /> {t.estimate.brand}</label>
            <select id="es-make" className="field" value={make} onChange={(e) => changeMake(e.target.value)}>
              {makes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="es-model"><Car size={13} /> {t.estimate.model}</label>
            <select id="es-model" className="field" value={model} onChange={(e) => setModel(e.target.value)}>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="es-year">
              <Calendar size={13} /> {t.estimate.year}
              <span className="num me-auto" style={{ color: "var(--brand)" }}>{year}</span>
            </label>
            <input
              id="es-year"
              type="range"
              min={2005}
              max={2026}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full "
            />
          </div>

          <div>
            <label className="label" htmlFor="es-km"><Gauge size={13} /> {t.estimate.km}</label>
            <input
              id="es-km" type="number" inputMode="numeric" className="field num" dir="ltr"
              value={km}
              onChange={(e) => setKm(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))}
            />
            <p className="num mt-1 text-[10.5px]" style={{ color: "var(--text-dim)" }}>
              {formatNumber(km)} {kmUnit(locale)}
            </p>
            <input
              type="range"
              min={0}
              max={kind === "moto" ? 120000 : 350000}
              step={kind === "moto" ? 1000 : 5000}
              value={km}
              onChange={(e) => setKm(Number(e.target.value))}
              className="mt-2 w-full "
              aria-label={t.estimate.km}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="es-fuel"><Fuel size={13} /> {t.estimate.fuel}</label>
              <select id="es-fuel" className="field" value={fuel} onChange={(e) => setFuel(e.target.value)}>
                <option value="diesel">{L.fuel.diesel}</option>
                <option value="essence">{L.fuel.essence}</option>
                <option value="hybride">{L.fuel.hybride}</option>
                <option value="electrique">{L.fuel.electrique}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="es-gb"><Gearbox size={13} /> {t.estimate.gearbox}</label>
              <select id="es-gb" className="field" value={gearbox} onChange={(e) => setGearbox(e.target.value)}>
                <option value="manuelle">{L.gearbox.manuelle}</option>
                <option value="automatique">{L.gearbox.automatique}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="es-city"><MapPin size={13} /> {t.estimate.city}</label>
            <select id="es-city" className="field" value={city} onChange={(e) => setCity(e.target.value)}>
              {CITIES.map((c) => <option key={c.slug} value={c.slug}>{cityLabel(c.slug, locale)}</option>)}
            </select>
          </div>

          <div>
            <span className="label"><BadgeCheck size={13} /> {t.estimate.condition}</span>
            <div className="grid gap-1.5">
              {CONDITIONS.map(([k, l, hint]) => (
                <button
                  key={k}
                  onClick={() => setCondition(k)}
                  aria-pressed={condition === k}
                  className="rounded-lg border p-2.5 text-start transition"
                  style={{
                    borderColor: condition === k ? "var(--brand)" : "var(--line-soft)",
                    background: condition === k ? "color-mix(in oklab, var(--brand) 10%, transparent)" : "transparent",
                  }}
                >
                  <span className="block text-xs font-bold">{l}</span>
                  <span className="block text-[10px]" style={{ color: "var(--text-dim)" }}>{hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* النتيجة */}
      <div className="space-y-6">
        <div className="card-raised zellige relative overflow-hidden p-7 text-center">
          <div className="glow pointer-events-none absolute inset-0" />
          <div className="relative">
            <span className="eyebrow mx-auto"><Wallet size={13} /> {t.estimate.suggestedPrice}</span>
            <p className="mt-2 text-[13px] font-bold">
              {make} {model} <span className="num opacity-60">{year}</span>
            </p>
            {noMarketRef ? (
              <div className="mx-auto mt-4 max-w-sm">
                <p className="flex items-center justify-center gap-1.5 text-sm font-bold" style={{ color: "var(--text-dim)" }}>
                  <Info size={14} /> {t.fairPrice.weakTag}
                </p>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
                  {t.fairPrice.weakNote}
                </p>
              </div>
            ) : (
              <>
                <div className="mt-3">
                  <Price value={est.mid} className="text-4xl font-extrabold tracking-tight sm:text-5xl" />
                </div>
                <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
                  {t.estimate.reasonableRange}{" "}
                  <b><Price value={est.low} /></b> — <b><Price value={est.high} /></b>
                </p>

                <div className="mx-auto mt-5 max-w-md">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full" style={{ background: "var(--line)" }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.round(est.confidence * 100)}%`,
                          background: "var(--data)",
                        }}
                      />
                    </div>
                    <span className="num text-[11px]" style={{ color: "var(--text-dim)" }}>
                      {t.estimate.accuracy} {Math.round(est.confidence * 100)}{t.fairPrice.percent}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px]" style={{ color: "var(--text-dim)" }}>
                    {t.estimate.basedOn} <span className="num">{est.sampleSize}</span> {t.estimate.basedOnEnd}
                  </p>
                </div>
              </>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href="/sell" className="btn btn-primary btn-sm"><Coins size={14} /> {t.estimate.sellAtPrice}</Link>
              <Link
                href={`/vehicles?kind=${kind}&make=${make}&model=${encodeURIComponent(model)}`}
                className="btn btn-ghost btn-sm"
              >
                {t.estimate.seeSimilar} <ArrowLeft size={14} className="dir-flip" />
              </Link>
            </div>
          </div>
        </div>

        {/* توقع القيمة */}
        {!noMarketRef && (
          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-[13px] font-bold"><Chart size={15} style={{ color: "var(--data)" }} /> {t.estimate.valueChangeTitle}</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {fill(t.estimate.valueChangeLead, { year: "2031" }).split(/(\d+)/).map((part, i) =>
                /\d+/.test(part) ? <span key={i} className="num">{part}</span> : part,
              )}
            </p>
            <div className="mt-5 flex items-end justify-between gap-2" style={{ height: 150 }}>
              {projection.map((p, i) => (
                <div key={p.year} className="flex flex-1 flex-col items-center gap-2">
                  <span className="num text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                    {Math.round(p.value / 1000)}k
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${(p.value / maxProj) * 110}px`,
                      background:
                        i === 0
                          ? "var(--brand)"
                          : `color-mix(in oklab, var(--brand) ${Math.max(18, 85 - i * 14)}%, var(--surface-3))`,
                    }}
                  />
                  <span className="num text-[10px]" style={{ color: "var(--text-dim)" }}>{p.year}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* المقارنات */}
        {est.comparables.length > 0 && (
          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-[13px] font-bold"><TrendingDown size={15} style={{ color: "var(--brand)" }} /> {t.estimate.similarNowTitle}</h2>
            <div className="mt-3 divide-y" style={{ borderColor: "var(--line-soft)" }}>
              {est.comparables.map((c) => (
                <Link
                  key={c.id}
                  href={vehicleHref(c)}
                  className="flex items-center justify-between gap-3 py-2.5 text-xs transition hover:text-[var(--brand)]"
                >
                  <span className="truncate">
                    {c.make} {c.model} <span className="num opacity-60">{c.year}</span>
                    <span className="num me-2 opacity-60">{formatNumber(c.km)} {kmUnit(locale)}</span>
                  </span>
                  <span className="num shrink-0 font-bold">{formatNumber(c.price)} {dhUnit(locale)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className="flex gap-2 text-[11px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
          <Info size={13} className="mt-px shrink-0" />
          {t.estimate.disclaimerA}<span className="num">{formatNumber(fleet)}</span>{t.estimate.disclaimerB}
        </p>
      </div>
    </div>
  );
}
