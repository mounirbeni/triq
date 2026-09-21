"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CITIES } from "@/lib/cities";

import { paramsFromFilters, type Filters } from "@/lib/search";
import {
  emptyFacets, POWER_MAX, PRICE_MAX as FACET_PRICE_MAX, type Facets, type FlagKey,
} from "@/lib/facets";
import { formatNumber } from "@/lib/format";
import { useDict, useLocale } from "@/lib/i18n/client";
import { cityLabel, colorLabel, equipmentLabel, kmUnit, localizeOptions } from "@/lib/i18n/labels";
import { EQUIPMENT } from "@/lib/equipment";
import {
  CAR_BODIES, CONDITIONS, DOOR_OPTIONS, DRIVETRAINS, FUELS, GEARBOXES,
  MOTO_BODIES, MOTO_BODY_SET, ORIGINS,
} from "@/lib/vehicle-options";
import {
  BadgeCheck, Calendar, Car, Check, Door, Fuel, Gauge, Grid, MapPin, Moto,
  Palette, Plus, Reset, ShieldCheck, Sliders, Sparkle, Timer, TrendingDown, Key, Wrench,
} from "@/components/icons";
import { VehicleGlyph } from "@/components/VehicleArt";
import {
  ChipToggles, DualRange, FilterSection, IconTiles, Segmented, SwitchRow,
} from "./FilterPrimitives";

interface Props {
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  reset: () => void;
  count: number;
  lockKind?: "car" | "moto";
  lockBrand?: string;
}

const MOTO_SET = MOTO_BODY_SET;

const PRICE_MAX = 600000;
const KM_MAX = 350000;

/** عنوان صغير كيفرّق بين مجموعات الفلاتر المتقدمة — بلا تفاعل، غير للتصنيف البصري */
function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ color: "var(--text-dim)" }}
    >
      {children}
    </p>
  );
}

export function FiltersPanel({ filters, set, reset, count, lockKind, lockBrand }: Props) {
  const t = useDict();
  const locale = useLocale();
  const [showAllCities, setShowAllCities] = useState(false);

  /* العدّادات كلها كتّحسب فالخادم فضربة وحدة — من قاعدة البيانات ملي تكون موصولة */
  const [f9s, setF9s] = useState<Facets>(emptyFacets);

  const facetKey = useMemo(() => paramsFromFilters(filters).toString(), [filters]);
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

  /** عدد النتائج لو طُبّق هذا الخيار */
  const flagCount = (k: FlagKey) => f9s.flags[k] ?? 0;
  const kindCounts = f9s.kind;
  const makes = useMemo(() => Object.keys(f9s.makes).sort(), [f9s]);
  const models = useMemo(() => Object.keys(f9s.models).sort(), [f9s]);

  const bodies = filters.kind === "moto" ? MOTO_BODIES : filters.kind === "car" ? CAR_BODIES : [...CAR_BODIES, ...MOTO_BODIES];

  const priceHist = f9s.priceHist;
  const yearHist = f9s.yearHist;

  const cityList = useMemo(() => {
    const withCounts = CITIES.map((c) => ({
      slug: c.slug,
      name: cityLabel(c.slug, locale),
      n: f9s.city[c.slug] ?? 0,
    }))
      .filter((c) => c.n > 0)
      .sort((a, b) => b.n - a.n);
    return showAllCities ? withCounts : withCounts.slice(0, 8);
  }, [f9s, showAllCities, locale]);

  const equipmentTags = useMemo(
    () => filters.equipment.split(",").filter(Boolean),
    [filters.equipment],
  );
  const toggleEquipment = (tag: string) => {
    const next = equipmentTags.includes(tag)
      ? equipmentTags.filter((t) => t !== tag)
      : [...equipmentTags, tag];
    set({ equipment: next.join(",") });
  };

  const activeTotal = [
    filters.make, filters.model, filters.city, filters.fuel, filters.gearbox, filters.body,
    filters.condition, filters.urgentOnly, filters.color, filters.drivetrain, filters.origin,
  ].filter(Boolean).length
    + [
      filters.priceMin, filters.priceMax, filters.yearMin, filters.yearMax, filters.kmMax,
      filters.trustMin, filters.doors, filters.powerMin, filters.powerMax,
      filters.displacementMin, filters.displacementMax,
    ].filter((x) => x !== undefined).length
    + (filters.condition ? 1 : 0)
    + equipmentTags.length
    + [filters.goodDealsOnly, filters.inspectedOnly, filters.verifiedOnly, filters.firstHandOnly, filters.urgentOnly].filter(Boolean).length;

  /* الفلاتر "المتقدمة" — كل شي ماعدا النوع/الهيكل/الماركة/الثمن/السنة/الكيلومتراج/المدينة،
     اللي هوما الفلاتر الأساسية اللي غالبية الناس كيقلّبو عليها مباشرة. */
  const advancedActiveCount =
    (filters.displacementMin ? 1 : 0) + (filters.displacementMax ? 1 : 0)
    + (filters.fuel ? 1 : 0) + (filters.gearbox ? 1 : 0)
    + (filters.powerMin ? 1 : 0) + (filters.powerMax ? 1 : 0)
    + (filters.drivetrain ? 1 : 0)
    + (filters.condition ? 1 : 0)
    + (filters.color ? 1 : 0)
    + (filters.doors ? 1 : 0)
    + (filters.origin ? 1 : 0)
    + equipmentTags.length
    + (filters.trustMin ? 1 : 0)
    + [filters.goodDealsOnly, filters.inspectedOnly, filters.verifiedOnly, filters.firstHandOnly, filters.urgentOnly].filter(Boolean).length;

  return (
    <div className="card overflow-hidden">
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--line-soft)", background: "var(--surface-2)" }}
      >
        <h2 className="flex items-center gap-2 text-[13px] font-bold">
          {t.filters.title}
          {activeTotal > 0 && (
            <span
              className="num grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9.5px]"
              style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
            >
              {activeTotal}
            </span>
          )}
        </h2>
        <button
          onClick={reset}
          className="flex items-center gap-1 text-[11px] font-semibold transition hover:text-[var(--brand)]"
          style={{ color: "var(--text-dim)" }}
        >
          <Reset size={13} /> {t.filters.reset}
        </button>
      </div>

      <div className="px-4">
        {/* النوع */}
        {!lockKind && (
        <div className="py-4">
          <Segmented
            value={filters.kind}
            onChange={(k) => set({ kind: k, make: "", model: "", body: "" })}
            options={[
              { value: "all", label: t.filters.all, Icon: Grid, count: kindCounts.all },
              { value: "car", label: t.filters.cars, Icon: Car, count: kindCounts.car },
              { value: "moto", label: t.filters.motos, Icon: Moto, count: kindCounts.moto },
            ]}
          />
        </div>
        )}

        {/* ===== الأساسية — اللي غالبية الناس كيقلّبو عليها مباشرة ===== */}

        {/* الهيكل */}
        <FilterSection title={t.filters.body} Icon={Car} activeCount={filters.body ? 1 : 0} defaultOpen={true}>
          <IconTiles
            value={filters.body}
            onChange={(b) => set({ body: b })}
            columns={3}
            options={localizeOptions(bodies, locale).map((b) => ({
              ...b,
              count: f9s.body[b.value] ?? 0,
              render: () => (
                <VehicleGlyph
                  shape={b.value as never}
                  kind={MOTO_SET.has(b.value) ? "moto" : "car"}
                  size={26}
                  strokeWidth={10}
                />
              ),
            }))}
          />
        </FilterSection>

        {/* الماركة */}
        <FilterSection
          title={lockBrand ? t.filters.modelOnly : t.filters.brandModel}
          Icon={BadgeCheck}
          activeCount={(filters.make && !lockBrand ? 1 : 0) + (filters.model ? 1 : 0)}
          defaultOpen={true}
        >
          {!lockBrand && (
          <select
            className="field"
            value={filters.make}
            onChange={(e) => set({ make: e.target.value, model: "" })}
            aria-label={t.filters.brand}
          >
            <option value="">{t.filters.allBrands}</option>
            {makes.map((m) => {
              const n = f9s.makes[m] ?? 0;
              return (
                <option key={m} value={m} disabled={n === 0}>
                  {m} ({n})
                </option>
              );
            })}
          </select>
          )}
          {filters.make && (
            <select
              className="field mt-2"
              value={filters.model}
              onChange={(e) => set({ model: e.target.value })}
              aria-label={t.filters.model}
            >
              <option value="">{t.filters.allModelsOf} {filters.make}</option>
              {models.map((m) => (
                <option key={m} value={m}>{m} ({f9s.models[m] ?? 0})</option>
              ))}
            </select>
          )}
        </FilterSection>

        {/* الثمن */}
        <FilterSection
          title={t.filters.price}
          Icon={TrendingDown}
          activeCount={(filters.priceMin ? 1 : 0) + (filters.priceMax ? 1 : 0)}
          defaultOpen={Boolean(filters.priceMin || filters.priceMax)}
        >
          <DualRange
            min={0}
            max={PRICE_MAX}
            step={5000}
            low={filters.priceMin}
            high={filters.priceMax}
            histogram={priceHist}
            onChange={(lo, hi) => set({ priceMin: lo, priceMax: hi })}
            format={(n) => `${formatNumber(n / 10000)} ${t.filters.million}`}
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[60000, 100000, 150000, 250000].map((p) => (
              <button
                key={p}
                onClick={() => set({ priceMax: p, priceMin: undefined })}
                className="chip transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                {t.filters.under} <span className="num">{p / 10000}</span> {t.filters.million}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* السنة */}
        <FilterSection
          title={t.filters.year}
          Icon={Calendar}
          activeCount={(filters.yearMin ? 1 : 0) + (filters.yearMax ? 1 : 0)}
          defaultOpen={Boolean(filters.yearMin || filters.yearMax)}
        >
          <DualRange
            min={2004}
            max={2026}
            step={1}
            low={filters.yearMin}
            high={filters.yearMax}
            histogram={yearHist}
            onChange={(lo, hi) => set({ yearMin: lo, yearMax: hi })}
            format={(n) => String(n)}
          />
        </FilterSection>

        {/* الكيلومتراج */}
        <FilterSection title={t.filters.km} Icon={Gauge} activeCount={filters.kmMax ? 1 : 0} defaultOpen={Boolean(filters.kmMax)}>
          <input
            type="range"
            min={0}
            max={KM_MAX}
            step={10000}
            value={filters.kmMax ?? KM_MAX}
            onChange={(e) => {
              const v = Number(e.target.value);
              set({ kmMax: v >= KM_MAX ? undefined : v });
            }}
            aria-label={t.filters.maxKm}
          />
          <div className="flex justify-between text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>
            <span>0</span>
            <span style={{ color: filters.kmMax ? "var(--brand)" : undefined }}>
              {filters.kmMax ? (
                <>{t.filters.lessThan} <span className="num">{formatNumber(filters.kmMax)}</span> {kmUnit(locale)}</>
              ) : (
                t.filters.noLimit
              )}
            </span>
          </div>
        </FilterSection>

        {/* المدينة */}
        <FilterSection title={t.filters.city} Icon={MapPin} activeCount={filters.city ? 1 : 0} defaultOpen={true}>
          <ChipToggles
            value={filters.city}
            onChange={(c) => set({ city: c })}
            options={cityList.map((c) => ({ value: c.slug, label: c.name, count: c.n }))}
          />
          {CITIES.length > 8 && (
            <button
              onClick={() => setShowAllCities((s) => !s)}
              className="mt-2 text-[11px] font-semibold underline"
              style={{ color: "var(--text-dim)" }}
            >
              {showAllCities ? t.filters.showLess : t.filters.allCities}
            </button>
          )}
        </FilterSection>

        {/* ===== فلاتر متقدمة — للي بغا يدقّق أكثر ===== */}
        <FilterSection
          title={t.filters.advanced}
          Icon={Sliders}
          activeCount={advancedActiveCount}
          defaultOpen={advancedActiveCount > 0}
        >
          <GroupLabel>{t.filters.mechanical}</GroupLabel>

          {filters.kind === "moto" && (
          <FilterSection title="سعة المحرك" Icon={Gauge} activeCount={(filters.displacementMin ? 1 : 0) + (filters.displacementMax ? 1 : 0)} defaultOpen={Boolean(filters.displacementMin || filters.displacementMax)}>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number" min={49} max={3000} inputMode="numeric" className="field num" dir="ltr"
                placeholder="من (سم³)" value={filters.displacementMin ?? ""}
                onChange={(e) => set({ displacementMin: e.target.value ? Number(e.target.value) : undefined })}
              />
              <input
                type="number" min={49} max={3000} inputMode="numeric" className="field num" dir="ltr"
                placeholder="إلى (سم³)" value={filters.displacementMax ?? ""}
                onChange={(e) => set({ displacementMax: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </FilterSection>
          )}

          {/* الوقود والناقل */}
          <FilterSection
            title={t.filters.engine}
            Icon={Fuel}
            activeCount={(filters.fuel ? 1 : 0) + (filters.gearbox ? 1 : 0)}
            defaultOpen={Boolean(filters.fuel || filters.gearbox)}
          >
            <ChipToggles
              value={filters.fuel}
              onChange={(f) => set({ fuel: f })}
              options={localizeOptions(FUELS, locale).map((x) => ({ ...x, count: f9s.fuel[x.value] ?? 0 }))}
            />
            <div className="mt-2">
              <ChipToggles
                value={filters.gearbox}
                onChange={(g) => set({ gearbox: g })}
                options={localizeOptions(GEARBOXES, locale).map((g) => ({ ...g, count: f9s.gearbox[g.value] ?? 0 }))}
              />
            </div>
          </FilterSection>

          {/* قوة المحرك */}
          <FilterSection
            title={t.filters.power}
            Icon={Gauge}
            activeCount={(filters.powerMin ? 1 : 0) + (filters.powerMax ? 1 : 0)}
            defaultOpen={Boolean(filters.powerMin || filters.powerMax)}
          >
            <DualRange
              min={0}
              max={POWER_MAX}
              step={1}
              low={filters.powerMin}
              high={filters.powerMax}
              histogram={f9s.powerHist}
              onChange={(lo, hi) => set({ powerMin: lo, powerMax: hi })}
              format={(n) => `${n} ${t.filters.hp}`}
            />
          </FilterSection>

          {/* الدفع — سيارات فقط */}
          {filters.kind !== "moto" && (
          <FilterSection title={t.filters.drivetrain} Icon={Car} activeCount={filters.drivetrain ? 1 : 0} defaultOpen={Boolean(filters.drivetrain)}>
            <ChipToggles
              value={filters.drivetrain}
              onChange={(d) => set({ drivetrain: d })}
              options={localizeOptions(DRIVETRAINS, locale).map((d) => ({ ...d, count: f9s.drivetrain[d.value] ?? 0 }))}
            />
          </FilterSection>
          )}

          <GroupLabel>{t.filters.specs}</GroupLabel>

          {/* حالة المركبة */}
          <FilterSection title={t.filters.condition} Icon={BadgeCheck} activeCount={filters.condition ? 1 : 0} defaultOpen={Boolean(filters.condition)}>
            <ChipToggles
              value={filters.condition}
              onChange={(c) => set({ condition: c })}
              options={localizeOptions(CONDITIONS, locale).map((c) => ({ ...c, count: f9s.condition[c.value] ?? 0 }))}
            />
          </FilterSection>

          {/* اللون */}
          {Object.keys(f9s.color).length > 0 && (
          <FilterSection title={t.filters.color} Icon={Palette} activeCount={filters.color ? 1 : 0} defaultOpen={Boolean(filters.color)}>
            <ChipToggles
              value={filters.color}
              onChange={(c) => set({ color: c })}
              options={Object.entries(f9s.color)
                .sort((a, b) => b[1] - a[1])
                .map(([value, n]) => ({ value, label: colorLabel(value, locale), count: n }))}
            />
          </FilterSection>
          )}

          {/* عدد الأبواب — سيارات فقط */}
          {filters.kind !== "moto" && Object.keys(f9s.doors).length > 0 && (
          <FilterSection title={t.filters.doors} Icon={Door} activeCount={filters.doors ? 1 : 0} defaultOpen={Boolean(filters.doors)}>
            <ChipToggles
              value={filters.doors ? String(filters.doors) : ""}
              onChange={(v) => set({ doors: v ? Number(v) : undefined })}
              options={DOOR_OPTIONS.map((d) => ({
                value: String(d), label: String(d), count: f9s.doors[String(d)] ?? 0,
              }))}
            />
          </FilterSection>
          )}

          {/* مصدر السيارة */}
          <FilterSection title={t.filters.origin} Icon={MapPin} activeCount={filters.origin ? 1 : 0} defaultOpen={Boolean(filters.origin)}>
            <ChipToggles
              value={filters.origin}
              onChange={(o) => set({ origin: o })}
              options={localizeOptions(ORIGINS, locale).map((o) => ({ ...o, count: f9s.origin[o.value] ?? 0 }))}
            />
          </FilterSection>

          {/* المواصفات والخيارات */}
          <FilterSection title={t.filters.equipment} Icon={Sparkle} activeCount={equipmentTags.length} defaultOpen={equipmentTags.length > 0}>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT.map((eq) => {
                const on = equipmentTags.includes(eq);
                const n = f9s.equipment[eq] ?? 0;
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleEquipment(eq)}
                    aria-pressed={on}
                    disabled={n === 0 && !on}
                    className="chip transition disabled:opacity-30"
                    style={{
                      background: on ? "var(--brand)" : "var(--surface-3)",
                      color: on ? "var(--brand-ink)" : "var(--text-muted)",
                      borderColor: "transparent",
                    }}
                  >
                    {on ? <Check size={11} /> : <Plus size={11} />}{equipmentLabel(eq, locale)}
                    <span className="num opacity-55">{n}</span>
                  </button>
                );
              })}
            </div>
          </FilterSection>

          {/* الثقة */}
          <FilterSection title={t.filters.trust} Icon={ShieldCheck} activeCount={filters.trustMin ? 1 : 0} defaultOpen={Boolean(filters.trustMin)}>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={filters.trustMin ?? 0}
              onChange={(e) => set({ trustMin: Number(e.target.value) || undefined })}
              aria-label={t.filters.minTrust}
            />
            <div className="flex justify-between text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>
              <span>{t.filters.all}</span>
              <span style={{ color: filters.trustMin ? "var(--brand)" : undefined }}>
                {filters.trustMin ? (
                  <><span className="num">{filters.trustMin}</span>+ {t.filters.outOf100}</>
                ) : (
                  t.filters.noLimit
                )}
              </span>
            </div>
          </FilterSection>

          {/* الضمانات */}
          <FilterSection
            title={t.filters.guarantees}
            Icon={ShieldCheck}
            activeCount={[filters.goodDealsOnly, filters.inspectedOnly, filters.verifiedOnly, filters.firstHandOnly, filters.urgentOnly].filter(Boolean).length}
            defaultOpen={[filters.goodDealsOnly, filters.inspectedOnly, filters.verifiedOnly, filters.firstHandOnly, filters.urgentOnly].some(Boolean)}
          >
            <div className="grid gap-1.5">
              <SwitchRow
                Icon={TrendingDown}
                label={t.filters.goodDeals}
                hint={t.filters.goodDealsHint}
                checked={filters.goodDealsOnly}
                onChange={(b) => set({ goodDealsOnly: b })}
                count={flagCount("goodDealsOnly")}
              />
              <SwitchRow
                Icon={Wrench}
                label={t.filters.inspected}
                hint={t.filters.inspectedHint}
                checked={filters.inspectedOnly}
                onChange={(b) => set({ inspectedOnly: b })}
                count={flagCount("inspectedOnly")}
              />
              <SwitchRow
                Icon={BadgeCheck}
                label={t.filters.verified}
                checked={filters.verifiedOnly}
                onChange={(b) => set({ verifiedOnly: b })}
                count={flagCount("verifiedOnly")}
              />
              <SwitchRow
                Icon={Key}
                label={t.filters.firstHand}
                hint={t.filters.firstHandHint}
                checked={filters.firstHandOnly}
                onChange={(b) => set({ firstHandOnly: b })}
                count={flagCount("firstHandOnly")}
              />
              <SwitchRow
                Icon={Timer}
                label={t.filters.urgent}
                hint={t.filters.urgentHint}
                checked={filters.urgentOnly}
                onChange={(b) => set({ urgentOnly: b })}
                count={flagCount("urgentOnly")}
              />
            </div>
          </FilterSection>
        </FilterSection>
      </div>

      <div
        className="border-t px-4 py-3 text-center text-[11.5px]"
        style={{ borderColor: "var(--line-soft)", background: "var(--surface-2)", color: "var(--text-dim)" }}
      >
        <span className="num font-extrabold" style={{ color: "var(--brand)" }}>{count}</span> {t.filters.matching}
      </div>
    </div>
  );
}
