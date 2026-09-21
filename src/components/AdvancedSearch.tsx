"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/cities";

import { paramsFromFilters, type Filters } from "@/lib/search";
import { emptyFacets, POWER_MAX, type Facets } from "@/lib/facets";
import { formatNumber } from "@/lib/format";
import { EQUIPMENT } from "@/lib/equipment";
import {
  CAR_BODIES, DOOR_OPTIONS, DRIVETRAINS, FUELS, MOTO_BODIES, ORIGINS,
} from "@/lib/vehicle-options";
import { useDict, useHref, useLocale } from "@/lib/i18n/client";
import { cityLabel, colorLabel, equipmentLabel, localizeOptions, specs } from "@/lib/i18n/labels";
import {
  BadgeCheck, Calendar, Car, Check, ChevronDown, Coins, Door, Fuel, Gauge, Gearbox,
  Key, MapPin, Moto, Odometer, Palette, Plus, Reset, Search, ShieldCheck,
  Sliders, Sparkle, Transmission, TrendingDown, Wrench,
} from "@/components/icons";
import { VehicleGlyph } from "@/components/VehicleArt";

function Field({
  label, Icon, children,
}: { label: string; Icon: (p: { size?: number }) => React.JSX.Element; children: React.ReactNode }) {
  return (
    <div>
      <label className="label"><Icon size={13} /> {label}</label>
      {children}
    </div>
  );
}

export function AdvancedSearch() {
  const router = useRouter();
  const t = useDict();
  const locale = useLocale();
  const href = useHref();
  const L = specs(locale);
  const [f, setF] = useState<Partial<Filters>>({ kind: "car" });
  const set = (patch: Partial<Filters>) => setF((p) => ({ ...p, ...patch }));
  /* الميكانيك/المواصفات/الضمانات وراء زر واحد — أغلب الناس كيبحثو
     بالماركة والموديل والثمن والسنة، وقلّة كيدقّقو أكثر من هادشي. */
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const kind = (f.kind ?? "all") as "all" | "car" | "moto";

  /* العدد والماركات كيجيو من الخادم — كيتحدّثو مع كل اختيار */
  const [f9s, setF9s] = useState<Facets>(emptyFacets);
  const facetKey = useMemo(() => paramsFromFilters(f).toString(), [f]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/facets?${facetKey}`)
      .then((r) => r.json())
      .then((j) => {
        if (alive && j?.ok) setF9s(j.data as Facets);
      })
      .catch(() => {
        /* الشبكة قاطعة — كنخلّيو آخر عدّادات عندنا */
      });
    return () => {
      alive = false;
    };
  }, [facetKey]);

  const makes = useMemo(() => Object.keys(f9s.makes).sort(), [f9s]);
  const models = useMemo(() => Object.keys(f9s.models).sort(), [f9s]);
  const bodies = kind === "moto" ? MOTO_BODIES : kind === "car" ? CAR_BODIES : [...CAR_BODIES, ...MOTO_BODIES];
  const count = f9s.total;

  const equipmentTags = useMemo(() => (f.equipment ?? "").split(",").filter(Boolean), [f.equipment]);
  const toggleEquipment = (tag: string) => {
    const next = equipmentTags.includes(tag)
      ? equipmentTags.filter((t) => t !== tag)
      : [...equipmentTags, tag];
    set({ equipment: next.join(",") });
  };

  const advancedActiveCount =
    (f.fuel ? 1 : 0) + (f.gearbox ? 1 : 0)
    + (f.color ? 1 : 0) + (f.doors ? 1 : 0) + (f.drivetrain ? 1 : 0) + (f.origin ? 1 : 0)
    + (f.powerMin ? 1 : 0) + (f.powerMax ? 1 : 0) + equipmentTags.length
    + (f.goodDealsOnly ? 1 : 0) + (f.inspectedOnly ? 1 : 0) + (f.verifiedOnly ? 1 : 0) + (f.firstHandOnly ? 1 : 0);

  function submit() {
    const params = paramsFromFilters(f);
    const base = kind === "car" ? "/cars" : kind === "moto" ? "/motorcycles" : "/vehicles";
    if (kind !== "all") params.delete("kind");
    const qs = params.toString();
    router.push(href(qs ? `${base}?${qs}` : base));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {/* النوع */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-bold">
            <Car size={16} style={{ color: "var(--brand)" }} /> {t.advSearch.kindTitle}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["car", t.advSearch.cars, Car],
              ["moto", t.advSearch.motos, Moto],
              ["all", t.advSearch.both, Key],
            ] as const).map(([k, label, Icon]) => {
              const on = kind === k;
              return (
                <button
                  key={k}
                  onClick={() => set({ kind: k, make: "", model: "", body: "" })}
                  aria-pressed={on}
                  className="flex flex-col items-center gap-1.5 rounded-xl border py-4 text-[12.5px] font-bold transition"
                  style={{
                    borderColor: on ? "var(--brand)" : "var(--line)",
                    background: on ? "var(--brand-soft)" : "var(--surface-1)",
                    color: on ? "var(--brand)" : "var(--text-muted)",
                  }}
                >
                  <Icon size={22} /> {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* الماركة والموديل */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-bold">
            <BadgeCheck size={16} style={{ color: "var(--brand)" }} /> {t.advSearch.brandModelTitle}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.advSearch.brand} Icon={BadgeCheck}>
              <select className="field" dir="ltr" style={{ textAlign: "left" }} value={f.make ?? ""} onChange={(e) => set({ make: e.target.value, model: "" })}>
                <option value="">{t.advSearch.allBrands}</option>
                {makes.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label={t.advSearch.model} Icon={Car}>
              <select className="field" dir="ltr" style={{ textAlign: "left" }} value={f.model ?? ""} onChange={(e) => set({ model: e.target.value })} disabled={!f.make}>
                <option value="">{f.make ? `${t.advSearch.allModelsOf} ${f.make}` : t.advSearch.chooseBrandFirst}</option>
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>

          <div className="mt-4">
            <span className="label"><Car size={13} /> {t.advSearch.bodyType}</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {localizeOptions(bodies, locale).map((b) => {
                const on = f.body === b.value;
                return (
                  <button
                    key={b.value}
                    onClick={() => set({ body: on ? "" : b.value })}
                    aria-pressed={on}
                    className="flex flex-col items-center gap-1 rounded-lg border py-2.5 text-[10.5px] font-bold transition"
                    style={{
                      borderColor: on ? "var(--brand)" : "var(--line)",
                      background: on ? "var(--brand-soft)" : "var(--surface-1)",
                      color: on ? "var(--brand)" : "var(--text)",
                    }}
                  >
                    <VehicleGlyph
                      shape={b.value as never}
                      kind={MOTO_BODIES.some((x) => x.value === b.value) ? "moto" : "car"}
                      size={24}
                      strokeWidth={10}
                    />
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* الثمن والسنة والكيلومتراج */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-bold">
            <Coins size={16} style={{ color: "var(--brand)" }} /> {t.advSearch.priceUsageTitle}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t.advSearch.priceFrom} Icon={TrendingDown}>
              <input type="number" step="5000" className="field num" placeholder="0"
                value={f.priceMin ?? ""} onChange={(e) => set({ priceMin: e.target.value ? +e.target.value : undefined })} />
            </Field>
            <Field label={t.advSearch.priceTo} Icon={Coins}>
              <input type="number" step="5000" className="field num" placeholder={t.advSearch.noLimit}
                value={f.priceMax ?? ""} onChange={(e) => set({ priceMax: e.target.value ? +e.target.value : undefined })} />
            </Field>
            <Field label={t.advSearch.maxKm} Icon={Odometer}>
              <input type="number" step="10000" className="field num" placeholder={t.advSearch.noLimit}
                value={f.kmMax ?? ""} onChange={(e) => set({ kmMax: e.target.value ? +e.target.value : undefined })} />
            </Field>
            <Field label={t.advSearch.yearFrom} Icon={Calendar}>
              <input type="number" className="field num" placeholder="2004"
                value={f.yearMin ?? ""} onChange={(e) => set({ yearMin: e.target.value ? +e.target.value : undefined })} />
            </Field>
            <Field label={t.advSearch.yearTo} Icon={Calendar}>
              <input type="number" className="field num" placeholder="2026"
                value={f.yearMax ?? ""} onChange={(e) => set({ yearMax: e.target.value ? +e.target.value : undefined })} />
            </Field>
            <Field label={t.advSearch.city} Icon={MapPin}>
              <select className="field" value={f.city ?? ""} onChange={(e) => set({ city: e.target.value })}>
                <option value="">{t.advSearch.allMorocco}</option>
                {CITIES.map((c) => <option key={c.slug} value={c.slug}>{cityLabel(c.slug, locale)}</option>)}
              </select>
            </Field>
          </div>
        </section>

        {/* فلاتر متقدمة — الميكانيك والمواصفات والضمانات وراء زر واحد */}
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          aria-expanded={advancedOpen}
          className="card flex w-full items-center gap-2.5 p-4 text-start transition hover:border-[var(--line-strong)]"
        >
          <Sliders size={16} style={{ color: "var(--brand)" }} />
          <span className="flex-1 text-[14px] font-bold">{t.advSearch.advancedTitle}</span>
          {advancedActiveCount > 0 && (
            <span
              className="num grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10.5px] font-bold"
              style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
            >
              {advancedActiveCount}
            </span>
          )}
          <ChevronDown
            size={16}
            style={{ color: "var(--text-dim)", transform: advancedOpen ? "rotate(180deg)" : "none", transition: "transform .25s var(--ease-out-soft)" }}
          />
        </button>

        {advancedOpen && (
        <>
        {/* الميكانيك */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-bold">
            <Gearbox size={16} style={{ color: "var(--brand)" }} /> {t.advSearch.mechanicsTitle}
          </h2>
          <span className="label"><Fuel size={13} /> {t.advSearch.fuelType}</span>
          <div className="flex flex-wrap gap-1.5">
            {localizeOptions(FUELS, locale).map((x) => {
              const on = f.fuel === x.value;
              return (
                <button key={x.value} onClick={() => set({ fuel: on ? "" : x.value })} aria-pressed={on}
                  className="chip transition"
                  style={{
                    borderColor: on ? "var(--brand)" : "var(--line)",
                    background: on ? "var(--brand-soft)" : "var(--surface-1)",
                    color: on ? "var(--brand)" : "var(--text-muted)",
                  }}>
                  <x.Icon size={13} /> {x.label}
                </button>
              );
            })}
          </div>

          <span className="label mt-4"><Transmission size={13} /> {t.advSearch.gearboxType}</span>
          <div className="flex flex-wrap gap-1.5">
            {(["manuelle", "automatique"] as const).map((g) => {
              const on = f.gearbox === g;
              return (
                <button key={g} onClick={() => set({ gearbox: on ? "" : g })} aria-pressed={on}
                  className="chip transition"
                  style={{
                    borderColor: on ? "var(--brand)" : "var(--line)",
                    background: on ? "var(--brand-soft)" : "var(--surface-1)",
                    color: on ? "var(--brand)" : "var(--text-muted)",
                  }}>
                  <Gearbox size={13} /> {L.gearbox[g]}
                </button>
              );
            })}
          </div>
        </section>

        {/* المواصفات والتفاصيل */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-bold">
            <Palette size={16} style={{ color: "var(--brand)" }} /> {t.advSearch.specsTitle}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t.advSearch.color} Icon={Palette}>
              <select className="field" value={f.color ?? ""} onChange={(e) => set({ color: e.target.value })}>
                <option value="">{t.advSearch.anyColor}</option>
                {Object.keys(f9s.color).sort().map((c) => (
                  <option key={c} value={c}>{colorLabel(c, locale)} ({f9s.color[c]})</option>
                ))}
              </select>
            </Field>
            {kind !== "moto" && (
              <Field label={t.advSearch.doors} Icon={Door}>
                <select className="field" value={f.doors ?? ""} onChange={(e) => set({ doors: e.target.value ? +e.target.value : undefined })}>
                  <option value="">{t.advSearch.anyCount}</option>
                  {DOOR_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d} ({f9s.doors[String(d)] ?? 0})</option>
                  ))}
                </select>
              </Field>
            )}
            {kind !== "moto" && (
              <Field label={t.advSearch.drivetrain} Icon={Car}>
                <select className="field" value={f.drivetrain ?? ""} onChange={(e) => set({ drivetrain: e.target.value })}>
                  <option value="">{t.advSearch.anyDrivetrain}</option>
                  {localizeOptions(DRIVETRAINS, locale).map((d) => (
                    <option key={d.value} value={d.value}>{d.label} ({f9s.drivetrain[d.value] ?? 0})</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={t.advSearch.origin} Icon={MapPin}>
              <select className="field" value={f.origin ?? ""} onChange={(e) => set({ origin: e.target.value })}>
                <option value="">{t.advSearch.anyOrigin}</option>
                {localizeOptions(ORIGINS, locale).map((o) => (
                  <option key={o.value} value={o.value}>{o.label} ({f9s.origin[o.value] ?? 0})</option>
                ))}
              </select>
            </Field>
            <Field label={t.advSearch.powerFrom} Icon={Gauge}>
              <input type="number" min={0} max={POWER_MAX} className="field num" placeholder="0"
                value={f.powerMin ?? ""} onChange={(e) => set({ powerMin: e.target.value ? +e.target.value : undefined })} />
            </Field>
            <Field label={t.advSearch.powerTo} Icon={Gauge}>
              <input type="number" min={0} max={POWER_MAX} className="field num" placeholder={t.advSearch.noLimit}
                value={f.powerMax ?? ""} onChange={(e) => set({ powerMax: e.target.value ? +e.target.value : undefined })} />
            </Field>
          </div>

          <span className="label mt-4"><Sparkle size={13} /> {t.advSearch.equipment}</span>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT.map((eq) => {
              const on = equipmentTags.includes(eq);
              return (
                <button key={eq} type="button" onClick={() => toggleEquipment(eq)} aria-pressed={on}
                  className="chip transition"
                  style={{
                    background: on ? "var(--brand)" : "var(--surface-1)",
                    color: on ? "var(--brand-ink)" : "var(--text-muted)",
                    borderColor: on ? "transparent" : "var(--line)",
                  }}>
                  {on ? <Check size={11} /> : <Plus size={11} />} {equipmentLabel(eq, locale)}
                  <span className="num opacity-55">{f9s.equipment[eq] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* الضمانات */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-bold">
            <ShieldCheck size={16} style={{ color: "var(--brand)" }} /> {t.advSearch.guaranteesTitle}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["goodDealsOnly", t.advSearch.goodDeals, TrendingDown],
              ["inspectedOnly", t.advSearch.inspected, Wrench],
              ["verifiedOnly", t.advSearch.verified, BadgeCheck],
              ["firstHandOnly", t.advSearch.firstHand, Key],
            ] as const).map(([key, label, Icon]) => {
              const on = Boolean(f[key]);
              return (
                <button key={key} onClick={() => set({ [key]: !on } as Partial<Filters>)} aria-pressed={on}
                  className="flex items-center gap-2.5 rounded-lg border p-3 text-start transition"
                  style={{
                    borderColor: on ? "var(--brand)" : "var(--line)",
                    background: on ? "var(--brand-soft)" : "var(--surface-1)",
                  }}>
                  <Icon size={17} style={{ color: on ? "var(--brand)" : "var(--text-dim)" }} />
                  <span className="text-[12.5px] font-bold">{label}</span>
                </button>
              );
            })}
          </div>
        </section>
        </>
        )}
      </div>

      {/* الملخص */}
      <aside className="lg:sticky lg:top-[84px] lg:h-fit">
        <div className="card p-5">
          <h2 className="text-[13px] font-bold">{t.advSearch.summaryTitle}</h2>
          <div className="mt-4 text-center">
            <div className="num text-4xl font-extrabold" style={{ color: count ? "var(--brand)" : "var(--bad)" }}>
              {formatNumber(count)}
            </div>
            <div className="mt-1 text-[11.5px]" style={{ color: "var(--text-dim)" }}>{t.advSearch.matching}</div>
          </div>

          <ul className="mt-5 space-y-1.5 text-[11.5px]" style={{ color: "var(--text-muted)" }}>
            <li className="flex justify-between"><span>{t.advSearch.sKind}</span><b>{kind === "car" ? t.advSearch.cars : kind === "moto" ? t.advSearch.motos : t.advSearch.sAll}</b></li>
            {f.make && <li className="flex justify-between"><span>{t.advSearch.sBrand}</span><b>{f.make}</b></li>}
            {f.model && <li className="flex justify-between"><span>{t.advSearch.sModel}</span><b>{f.model}</b></li>}
            {f.city && <li className="flex justify-between"><span>{t.advSearch.sCity}</span><b>{cityLabel(f.city, locale)}</b></li>}
            {(f.priceMin || f.priceMax) && (
              <li className="flex justify-between">
                <span>{t.advSearch.sPrice}</span>
                <b className="num">{formatNumber(f.priceMin ?? 0)} — {f.priceMax ? formatNumber(f.priceMax) : "∞"}</b>
              </li>
            )}
            {f.kmMax && <li className="flex justify-between"><span>{t.advSearch.sKm}</span><b>{t.advSearch.sUpTo} <span className="num">{formatNumber(f.kmMax)}</span></b></li>}
            {f.color && <li className="flex justify-between"><span>{t.advSearch.sColor}</span><b>{colorLabel(f.color, locale)}</b></li>}
            {f.doors && <li className="flex justify-between"><span>{t.advSearch.sDoors}</span><b className="num">{f.doors}</b></li>}
            {f.drivetrain && (
              <li className="flex justify-between">
                <span>{t.advSearch.sDrivetrain}</span>
                <b>{locale === "fr" ? DRIVETRAINS.find((d) => d.value === f.drivetrain)?.fr : DRIVETRAINS.find((d) => d.value === f.drivetrain)?.label}</b>
              </li>
            )}
            {f.origin && (
              <li className="flex justify-between">
                <span>{t.advSearch.sOrigin}</span>
                <b>{locale === "fr" ? ORIGINS.find((o) => o.value === f.origin)?.fr : ORIGINS.find((o) => o.value === f.origin)?.label}</b>
              </li>
            )}
            {equipmentTags.length > 0 && (
              <li className="flex justify-between"><span>{t.advSearch.sSpecs}</span><b className="num">{equipmentTags.length}</b></li>
            )}
          </ul>

          <button onClick={submit} disabled={!count} className="btn btn-primary mt-6 w-full">
            <Search size={16} /> {t.advSearch.showResults}
          </button>
          <button
            onClick={() => setF({ kind: "car" })}
            className="btn btn-ghost btn-sm mt-2 w-full"
          >
            <Reset size={13} /> {t.advSearch.reset}
          </button>
        </div>
      </aside>
    </div>
  );
}
