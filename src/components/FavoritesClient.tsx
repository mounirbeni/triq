"use client";

import { Link } from "@/components/Link";
import { useMemo } from "react";
import { useApp } from "@/store/app";
import { useVehiclesByIds } from "@/lib/useVehicles";
import { VehicleCard } from "@/components/VehicleCard";
import { computeTco } from "@/lib/tco";
import { formatNumber } from "@/lib/format";
import { useDict, useLocale } from "@/lib/i18n/client";
import { dhUnit } from "@/lib/i18n/labels";
import { Bell, Calculator, Car, Coins, Heart, Search, Trash, TrendingDown } from "@/components/icons";

export function FavoritesClient() {
  const t = useDict();
  const locale = useLocale();
  const dh = dhUnit(locale);
  const f = t.favorites;
  const { favorites, searches, removeSearch, ready, priceWatch, togglePriceWatch, isWatched } = useApp();

  /* التفاصيل كتجي من قاعدة البيانات — المتصفح كيخزّن غير المعرّفات */
  const { items } = useVehiclesByIds(favorites);

  const stats = useMemo(() => {
    if (!items.length) return null;
    const prices = items.map((v) => v.price);
    const tcos = items.map((v) =>
      computeTco(v, {
        kmPerYear: v.kind === "moto" ? 8000 : 15000,
        years: 3,
        coverage: "tiers",
        includeDepreciation: false,
      }).perYear,
    );
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      cheapestRun: Math.min(...tcos),
    };
  }, [items]);

  if (!ready) return null;

  return (
    <div className="space-y-12">
      <section>
        <h2 className="h-section mb-5">{f.title}</h2>

        {items.length === 0 ? (
          <div className="card p-12 text-center">
            <span
              className="mx-auto grid h-16 w-16 place-items-center rounded-2xl"
              style={{ background: "var(--bad-soft)", color: "var(--bad)" }}
            >
              <Heart size={30} />
            </span>
            <h3 className="mt-5 text-lg font-bold">{f.emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: "var(--text-muted)" }}>
              {f.emptyText}
            </p>
            <Link href="/vehicles" className="btn btn-primary mt-6"><Car size={16} /> {f.browseVehicles}</Link>
          </div>
        ) : (
          <>
            {stats && (
              <div className="card mb-5 grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
                {[
                  { l: f.statCount, v: String(items.length), Icon: Heart },
                  { l: f.statCheapest, v: `${formatNumber(stats.min)} ${dh}`, Icon: TrendingDown },
                  { l: f.statAvg, v: `${formatNumber(stats.avg)} ${dh}`, Icon: Coins },
                  { l: f.statCheapestRun, v: `${formatNumber(stats.cheapestRun)} ${f.perYear}`, Icon: Calculator },
                ].map((s) => (
                  <div key={s.l} className="flex flex-col items-center gap-1 text-center">
                    <s.Icon size={16} style={{ color: "var(--brand)" }} />
                    <div className="num text-sm font-extrabold" style={{ color: "var(--brand)" }}>{s.v}</div>
                    <div className="text-[10px]" style={{ color: "var(--text-dim)" }}>{s.l}</div>
                  </div>
                ))}
              </div>
            )}
            <div
              className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border p-4"
              style={{ borderColor: "var(--line-soft)", background: "var(--brand-soft)" }}
            >
              <Bell size={17} className="shrink-0" style={{ color: "var(--brand)" }} />
              <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                <b style={{ color: "var(--brand)" }}>{f.priceWatchTitle}</b> {f.priceWatchText}{" "}
                {priceWatch.length > 0 && (
                  <span className="num font-bold" style={{ color: "var(--brand)" }}>
                    {priceWatch.length} {f.priceWatchActive}
                  </span>
                )}
              </p>
              <button
                onClick={() => items.forEach((v) => { if (!isWatched(v.id)) togglePriceWatch(v.id); })}
                className="btn btn-solid btn-sm shrink-0"
              >
                {f.activateAll}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
              {items.map((v) => {
                const on = isWatched(v.id);
                return (
                  <div key={v.id} className="flex min-w-0 flex-col gap-2">
                    <VehicleCard v={v} />
                    <button
                      onClick={() => togglePriceWatch(v.id)}
                      aria-pressed={on}
                      className="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11.5px] font-bold transition-colors"
                      style={{
                        borderColor: on ? "transparent" : "var(--line)",
                        background: on ? "var(--brand-soft)" : "transparent",
                        color: on ? "var(--brand)" : "var(--text-dim)",
                      }}
                    >
                      <Bell size={13} />
                      {on ? f.willNotify : f.notifyMe}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className="h-section mb-2">{f.savedSearchesTitle}</h2>
        <p className="mb-5 text-sm" style={{ color: "var(--text-muted)" }}>
          {f.savedSearchesLead}
        </p>

        {searches.length === 0 ? (
          <div className="card flex flex-col items-center p-10 text-center">
            <span
              className="grid h-12 w-12 place-items-center rounded-xl"
              style={{ background: "var(--surface-3)", color: "var(--text-dim)" }}
            >
              <Search size={22} />
            </span>
            <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
              {f.noSearchesText}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {searches.map((s) => (
              <li key={s.id} className="card flex items-center justify-between gap-3 p-3">
                <Link
                  href={`/vehicles?${s.query}`}
                  className="min-w-0 flex-1 text-sm font-bold transition hover:text-[var(--brand)]"
                >
                  <span className="block truncate">{s.label}</span>
                  <span className="block truncate text-[11px] font-normal" style={{ color: "var(--text-dim)" }}>
                    {s.query || f.noFilters}
                  </span>
                </Link>
                {s.alert && (
                  <span className="tag tag-good"><Bell size={11} /> {f.alertActive}</span>
                )}
                <button
                  onClick={() => removeSearch(s.id)}
                  className="btn btn-ghost btn-sm"
                  aria-label={`${f.deleteAria} ${s.label}`}
                >
                  <Trash size={13} /> {f.delete}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
