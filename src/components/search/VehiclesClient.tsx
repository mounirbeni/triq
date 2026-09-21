"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_FILTERS, filtersFromParams, paramsFromFilters,
  SORT_LABELS, type Filters, type SortKey,
} from "@/lib/search";
import { useDict, useHref, useLocale } from "@/lib/i18n/client";
import { cityLabel, colorLabel, dhUnit, equipmentLabel, kmUnit, specs } from "@/lib/i18n/labels";
import type { Vehicle } from "@/lib/types";
import { VehicleCard, VehicleRow } from "@/components/VehicleCard";
import { Mixed } from "@/components/Mixed";
import { VehicleGridSkeleton } from "@/components/VehicleGridSkeleton";
import { Modal, useModalClose } from "@/components/Modal";
import { FiltersPanel } from "./FiltersPanel";
import { SmartSearch } from "@/components/SmartSearch";
import { BrandMark } from "@/components/BrandMark";
import { useApp } from "@/store/app";
import { DRIVETRAINS, ORIGINS } from "@/lib/vehicle-options";
import { formatNumber } from "@/lib/format";
import {
  ArrowUpDown, Bell, Check, Close, Filter, Grid, Rows, Search as SearchIcon, Sliders,
} from "@/components/icons";

const PAGE_SIZE = 12;

export interface VehiclesClientProps {
  /** قفل النوع على هذه الصفحة (سيارات أو دراجات) */
  lockKind?: "car" | "moto";
  /** قفل الماركة (صفحة ماركة) */
  lockBrand?: string;
  /** المسار الأساسي لكتابة الفلاتر في الرابط */
  basePath?: string;
  /** عنوان مخصّص */
  heading?: string;
  intro?: string;
}

export function VehiclesClient({
  lockKind,
  lockBrand,
  basePath = "/vehicles",
  heading,
  intro,
}: VehiclesClientProps = {}) {
  const sp = useSearchParams();
  const router = useRouter();
  const t = useDict();
  const locale = useLocale();
  const href = useHref();
  const L = specs(locale);
  const { saveSearch } = useApp();
  const [mobileFilters, setMobileFilters] = useState(false);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  const filters = useMemo<Filters>(() => {
    const base = { ...DEFAULT_FILTERS, ...filtersFromParams(new URLSearchParams(sp.toString())) };
    if (lockKind) base.kind = lockKind;
    if (lockBrand) base.make = lockBrand;
    return base;
  }, [sp, lockKind, lockBrand]);

  /* النتائج كتجي من الخادم — قاعدة البيانات ملي تكون موصولة */
  const [results, setResults] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (offset: number) => {
      const qs = paramsFromFilters(filters);
      qs.set("limit", String(PAGE_SIZE * 2));
      qs.set("offset", String(offset));
      const res = await fetch(`/api/listings?${qs.toString()}`);
      const json = await res.json();
      if (!json?.ok) throw new Error("bad response");
      return json.data as { items: Vehicle[]; total: number };
    },
    [filters],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    load(0)
      .then((d) => {
        if (!alive) return;
        setResults(d.items);
        setTotal(d.total);
      })
      .catch(() => {
        // الشبكة قاطعة — كنبيّنو حالة خاوية بدل نتائج ماشي حقيقية
        if (!alive) return;
        setResults([]);
        setTotal(0);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [load, filters]);

  const loadMore = useCallback(() => {
    setLoadingMore(true);
    const offset = results.length;
    load(offset)
      .then((d) => setResults((prev) => [...prev, ...d.items]))
      .catch(() => {
        /* «زيد» طاح — كنخلّيو اللي بان، والمستخدم يقدر يعاود */
      })
      .finally(() => setLoadingMore(false));
  }, [load, results.length, filters]);

  const push = useCallback(
    (next: Filters) => {
      const params = paramsFromFilters(next);
      if (lockKind) params.delete("kind");
      if (lockBrand) params.delete("make");
      const qs = params.toString();
      router.replace(href(qs ? `${basePath}?${qs}` : basePath), { scroll: false });
      setSaved(false);
    },
    [router, href, basePath, lockKind, lockBrand],
  );

  const set = useCallback((patch: Partial<Filters>) => push({ ...filters, ...patch }), [filters, push]);
  const reset = useCallback(
    () => push({ ...DEFAULT_FILTERS, ...(lockKind ? { kind: lockKind } : {}), ...(lockBrand ? { make: lockBrand } : {}) }),
    [push, lockKind, lockBrand],
  );

  const activeChips = useMemo(() => {
    const out: { label: string; clear: Partial<Filters> }[] = [];
    const dh = dhUnit(locale);
    const km = kmUnit(locale);
    if (filters.kind !== "all" && !lockKind)
      out.push({ label: filters.kind === "car" ? t.search.cars : t.search.motos, clear: { kind: "all" } });
    if (filters.make && !lockBrand) out.push({ label: filters.make, clear: { make: "", model: "" } });
    if (filters.model) out.push({ label: filters.model, clear: { model: "" } });
    if (filters.city) out.push({ label: cityLabel(filters.city, locale), clear: { city: "" } });
    if (filters.fuel) out.push({ label: L.fuel[filters.fuel as keyof typeof L.fuel], clear: { fuel: "" } });
    if (filters.gearbox) out.push({ label: L.gearbox[filters.gearbox as keyof typeof L.gearbox], clear: { gearbox: "" } });
    if (filters.body) out.push({ label: L.body[filters.body as keyof typeof L.body], clear: { body: "" } });
    if (filters.priceMax) out.push({ label: `${t.search.chipUpTo} ${formatNumber(filters.priceMax)} ${dh}`, clear: { priceMax: undefined } });
    if (filters.priceMin) out.push({ label: `${t.search.chipFrom} ${formatNumber(filters.priceMin)} ${dh}`, clear: { priceMin: undefined } });
    if (filters.yearMin) out.push({ label: `${t.search.chipFrom} ${filters.yearMin}`, clear: { yearMin: undefined } });
    if (filters.yearMax) out.push({ label: `${t.search.chipTo} ${filters.yearMax}`, clear: { yearMax: undefined } });
    if (filters.kmMax) out.push({ label: `${t.search.chipUnder} ${formatNumber(filters.kmMax)} ${km}`, clear: { kmMax: undefined } });
    if (filters.trustMin) out.push({ label: `${t.search.chipTrust} ${filters.trustMin}+`, clear: { trustMin: undefined } });
    if (filters.color) out.push({ label: colorLabel(filters.color, locale), clear: { color: "" } });
    if (filters.doors) out.push({ label: `${filters.doors} ${t.search.chipDoors}`, clear: { doors: undefined } });
    if (filters.powerMax) out.push({ label: `${t.search.chipUpTo} ${filters.powerMax} ${t.search.chipHp}`, clear: { powerMax: undefined } });
    if (filters.powerMin) out.push({ label: `${t.search.chipFrom} ${filters.powerMin} ${t.search.chipHp}`, clear: { powerMin: undefined } });
    if (filters.displacementMin) out.push({ label: `${t.search.chipFrom} ${filters.displacementMin} سم³`, clear: { displacementMin: undefined } });
    if (filters.displacementMax) out.push({ label: `${t.search.chipUpTo} ${filters.displacementMax} سم³`, clear: { displacementMax: undefined } });
    if (filters.drivetrain) {
      const d = DRIVETRAINS.find((x) => x.value === filters.drivetrain);
      out.push({
        label: d ? (locale === "fr" ? d.fr : d.label) : filters.drivetrain,
        clear: { drivetrain: "" },
      });
    }
    if (filters.origin) {
      const o = ORIGINS.find((x) => x.value === filters.origin);
      out.push({
        label: o ? (locale === "fr" ? o.fr : o.label) : filters.origin,
        clear: { origin: "" },
      });
    }
    filters.equipment.split(",").filter(Boolean).forEach((tag) => {
      out.push({
        label: equipmentLabel(tag, locale),
        clear: { equipment: filters.equipment.split(",").filter((x) => x !== tag).join(",") },
      });
    });
    if (filters.goodDealsOnly) out.push({ label: t.search.chipDeals, clear: { goodDealsOnly: false } });
    if (filters.inspectedOnly) out.push({ label: t.search.chipInspected, clear: { inspectedOnly: false } });
    if (filters.verifiedOnly) out.push({ label: t.search.chipVerified, clear: { verifiedOnly: false } });
    if (filters.firstHandOnly) out.push({ label: t.search.chipFirstHand, clear: { firstHandOnly: false } });
    if (filters.q) out.push({ label: `"${filters.q}"`, clear: { q: "" } });
    return out;
  }, [filters, lockKind, lockBrand, t, L, locale]);

  const title = useMemo(() => {
    if (heading) return heading;
    const parts: string[] = [];
    parts.push(filters.kind === "moto" ? t.search.motos : filters.kind === "car" ? t.search.cars : t.search.vehicles);
    if (filters.make) parts.push(filters.make);
    if (filters.model) parts.push(filters.model);
    parts.push(t.search.used);
    if (filters.city) parts.push(`${t.search.inCity} ${cityLabel(filters.city, locale)}`);
    return parts.join(" ");
  }, [filters, heading, t, locale]);

  const doSave = () => {
    saveSearch({ label: title, query: paramsFromFilters(filters).toString(), alert: true });
    setSaved(true);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-7">
      <div className="mb-6"><SmartSearch /></div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[84px] max-h-[calc(100vh-104px)] overflow-y-auto ps-1">
            <FiltersPanel filters={filters} set={set} reset={reset} count={total} lockKind={lockKind} lockBrand={lockBrand} />
          </div>
        </aside>

        <div className="min-w-0">
          {/* شريط الأدوات */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              {lockBrand && <BrandMark name={lockBrand} size={46} className="mt-0.5" />}
              <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
              {intro && (
                <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {intro}
                </p>
              )}
              <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
                <span className="num font-bold" style={{ color: "var(--brand)" }}>{total}</span> {t.search.results}
                {total > 0 && <> · {t.search.sortedBy} {t.sort[filters.sort]}</>}
              </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setMobileFilters(true)} className="btn btn-solid btn-sm lg:hidden">
                <Filter size={14} /> {t.search.filter}
                {activeChips.length > 0 && (
                  <span
                    className="num rounded-full px-1.5 text-[9.5px]"
                    style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
                  >
                    {activeChips.length}
                  </span>
                )}
              </button>

              <div
                className="hidden items-center rounded-lg border p-0.5 sm:flex"
                style={{ borderColor: "var(--line)", background: "var(--surface-3)" }}
              >
                {([["grid", Grid, t.search.grid], ["list", Rows, t.search.list]] as const).map(([k, Icon, lbl]) => (
                  <button
                    key={k}
                    onClick={() => setView(k)}
                    aria-label={lbl}
                    aria-pressed={view === k}
                    className="grid h-7 w-7 place-items-center rounded-md transition"
                    style={{
                      background: view === k ? "var(--surface-1)" : "transparent",
                      color: view === k ? "var(--brand)" : "var(--text-dim)",
                    }}
                  >
                    <Icon size={15} />
                  </button>
                ))}
              </div>

              <div className="relative">
                <ArrowUpDown
                  size={14}
                  className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-dim)" }}
                />
                <select
                  value={filters.sort}
                  onChange={(e) => set({ sort: e.target.value as SortKey })}
                  className="field !w-auto !py-2 !pe-8 text-[12px] font-semibold"
                  aria-label={t.search.sort}
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <option key={k} value={k}>{t.sort[k]}</option>
                  ))}
                </select>
              </div>

              <button onClick={doSave} className="btn btn-solid btn-sm" disabled={saved}>
                {saved ? <><Check size={14} /> {t.search.saved}</> : <><Bell size={14} /> {t.search.saveSearch}</>}
              </button>
            </div>
          </div>

          {/* الفلاتر النشطة */}
          {activeChips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <Sliders size={14} style={{ color: "var(--text-dim)" }} />
              {activeChips.map((c, i) => (
                <button
                  key={i}
                  onClick={() => set(c.clear)}
                  className="chip transition hover:border-[var(--bad)] hover:text-[var(--bad)]"
                >
                  <Mixed text={c.label} /> <Close size={11} className="opacity-60" />
                </button>
              ))}
              <button onClick={reset} className="text-[11px] font-semibold underline" style={{ color: "var(--text-dim)" }}>
                {t.search.clearAll}
              </button>
            </div>
          )}

          {/* النتائج */}
          {loading && results.length === 0 ? (
            <VehicleGridSkeleton count={PAGE_SIZE} view={view} />
          ) : results.length === 0 ? (
            <div className="card flex flex-col items-center p-12 text-center">
              <span
                className="grid h-14 w-14 place-items-center rounded-2xl"
                style={{ background: "var(--surface-3)", color: "var(--text-dim)" }}
              >
                <SearchIcon size={26} />
              </span>
              <h2 className="mt-4 text-lg font-bold">{t.search.emptyTitle}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {t.search.emptyLead}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button onClick={reset} className="btn btn-solid btn-sm">{t.search.resetFilters}</button>
                <button onClick={doSave} className="btn btn-primary btn-sm">
                  {saved ? <><Check size={14} /> {t.search.alertOn}</> : <><Bell size={14} /> {t.search.notifyMe}</>}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={
                  view === "grid"
                    ? "grid grid-cols-2 gap-5 xl:grid-cols-3"
                    : "flex flex-col gap-4"
                }
              >
                {results.map((v) =>
                  view === "grid" ? <VehicleCard key={v.id} v={v} /> : <VehicleRow key={v.id} v={v} />,
                )}
              </div>
              {results.length < total && (
                <div className="mt-8 text-center">
                  <button onClick={loadMore} disabled={loadingMore} className="btn btn-solid">
                    {loadingMore ? t.search.loadingMore : <>{t.search.seeMore} <span className="num opacity-60">({total - results.length})</span></>}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* فلاتر الموبايل */}
      {mobileFilters && (
        <Modal onClose={() => setMobileFilters(false)} ariaLabel={t.search.filterResults} variant="drawer" maxWidth="max-w-sm">
          <MobileFiltersBody
            filters={filters} set={set} reset={reset} count={total}
            lockKind={lockKind} lockBrand={lockBrand}
          />
        </Modal>
      )}
    </div>
  );
}

function MobileFiltersBody({
  filters, set, reset, count, lockKind, lockBrand,
}: {
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  reset: () => void;
  count: number;
  lockKind?: "car" | "moto";
  lockBrand?: string;
}) {
  const t = useDict();
  const close = useModalClose();
  return (
    <>
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--line-soft)" }}
      >
        <h2 className="text-sm font-bold">{t.search.filterResults}</h2>
        <button onClick={close} aria-label={t.common.close} className="grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: "var(--line)" }}>
          <Close size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <FiltersPanel filters={filters} set={set} reset={reset} count={count} lockKind={lockKind} lockBrand={lockBrand} />
      </div>
      <div className="border-t p-3" style={{ borderColor: "var(--line-soft)" }}>
        <button onClick={close} className="btn btn-primary w-full">
          {t.search.show} <span className="num">{count}</span> {t.search.results}
        </button>
      </div>
    </>
  );
}
