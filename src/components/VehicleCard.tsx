"use client";

import { Link } from "./Link";
import { vehicleHref } from "@/lib/slug";
import { useMemo, ViewTransition } from "react";
import type { Vehicle } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { useDict, useLocale } from "@/lib/i18n/client";
import { cityLabel, fmtTimeAgo, kmUnit, promoLabel, specs } from "@/lib/i18n/labels";
import { fairPriceOf, trustOf } from "@/lib/market";
import { promoOf } from "@/lib/promo";
import { useApp } from "@/store/app";
import { VehicleCover } from "./VehicleCover";
import { FounderBadge } from "./FounderBadge";
import { TrustDot } from "./TrustBadge";
import { FairPriceTag } from "./FairPriceMeter";
import { Price } from "./Price";
import { Mixed } from "./Mixed";
import {
  ArrowLeft, AutoGear, BadgeCheck, Calendar, Camera, Clock, FUEL_ICONS, Heart,
  MapPin, Odometer, Scale, Sparkle, Timer, Transmission, TrendingUp, Video,
} from "./icons";

function SpecRow({ v }: { v: Vehicle }) {
  const t = useDict();
  const locale = useLocale();
  const L = specs(locale);
  const FuelIcon = FUEL_ICONS[v.fuel];
  const GearIcon = v.gearbox === "automatique" ? AutoGear : Transmission;
  const items = [
    { Icon: Calendar, text: String(v.year) },
    { Icon: Odometer, text: `${formatNumber(v.km)} ${kmUnit(locale)}` },
    { Icon: FuelIcon, text: L.fuel[v.fuel] },
    { Icon: GearIcon, text: v.gearbox === "automatique" ? t.card.automatic : t.card.manual },
  ];
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
      {items.map(({ Icon, text }, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--text-muted)" }}>
          <Icon size={14} style={{ color: "var(--text-dim)" }} />
          <Mixed text={text} className="font-medium" />
        </div>
      ))}
    </div>
  );
}

/** أزرار المفضلة والمقارنة داخل تذييل البطاقة */
function CardActions({ v }: { v: Vehicle }) {
  const t = useDict();
  const { isFavorite, toggleFavorite, inCompare, toggleCompare } = useApp();
  const fav = isFavorite(v.id);
  const cmp = inCompare(v.id);
  const base =
    "grid h-9 w-9 place-items-center rounded-lg border transition hover:-translate-y-0.5 active:scale-90";
  return (
    <div className="flex shrink-0 gap-1.5">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(v.id); }}
        aria-label={cmp ? t.card.removeCompare : t.card.addCompare}
        aria-pressed={cmp}
        className={base}
        style={{
          borderColor: cmp ? "var(--data)" : "var(--line)",
          background: cmp ? "var(--data)" : "transparent",
          color: cmp ? "#fff" : "var(--text-dim)",
        }}
      >
        <Scale size={16} />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(v.id); }}
        aria-label={fav ? t.card.removeFavorite : t.card.addFavorite}
        aria-pressed={fav}
        className={base}
        style={{
          borderColor: fav ? "var(--bad)" : "var(--line)",
          background: fav ? "var(--bad)" : "transparent",
          color: fav ? "#fff" : "var(--text-dim)",
        }}
      >
        <Heart size={16} filled={fav} />
      </button>
    </div>
  );
}

function Badges({ v, featured = false }: { v: Vehicle; featured?: boolean }) {
  const t = useDict();
  const locale = useLocale();
  const promo = promoOf(v);
  return (
    <div className="absolute top-3 start-3 z-10 flex flex-wrap justify-end gap-1.5">
      {promo ? (
        <span className="tag" style={{ background: promo.color, color: "#fff" }}>
          {promo.tier === "urgent" ? <Timer size={11} /> : promo.tier === "top" ? <TrendingUp size={11} /> : <Sparkle size={11} />}
          {promoLabel(promo.tier, locale, t)}
        </span>
      ) : featured && (
        <span className="tag" style={{ background: "var(--warn)", color: "#fff" }}>
          <Sparkle size={11} /> {t.card.featured}
        </span>
      )}
      {v.inspected && (
        <span className="tag" style={{ background: "var(--good)", color: "#fff" }}>
          <BadgeCheck size={11} /> {t.card.inspected}
        </span>
      )}
      {v.seller?.founder && <FounderBadge size="sm" />}
    </div>
  );
}

function MediaCount({ v }: { v: Vehicle }) {
  return (
    <div className="absolute bottom-3 start-3 z-10 flex gap-1.5">
      <span className="tag backdrop-blur-md" style={{ background: "rgba(10,30,61,0.65)", color: "#fff" }}>
        <Camera size={11} /> <span className="num">{v.photos}</span>
      </span>
      {v.hasVideo && (
        <span className="tag backdrop-blur-md" style={{ background: "rgba(10,30,61,0.65)", color: "#fff" }}>
          <Video size={11} />
        </span>
      )}
    </div>
  );
}

/* ============================================================
   بطاقة شبكية
   ============================================================ */
export function VehicleCard({
  v,
  compact = false,
  featured = false,
}: {
  v: Vehicle;
  compact?: boolean;
  /** كتبيّن شارة «إعلان مميّز» — للاستعمال فأقسام مختارة يدوياً كالصفحة الرئيسية */
  featured?: boolean;
}) {
  const t = useDict();
  const locale = useLocale();
  const trust = useMemo(() => trustOf(v), [v]);
  const fp = useMemo(() => fairPriceOf(v), [v]);

  return (
    <article className="card card-hover group relative overflow-hidden">
      <Link href={vehicleHref(v)} className="block" transitionTypes={["nav-forward"]}>
        <div className="relative aspect-[16/10] overflow-hidden">
          <ViewTransition name={`vehicle-${v.id}`} share="morph" default="none">
            <VehicleCover
              v={v}
              className="h-full w-full transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
            />
          </ViewTransition>
          <Badges v={v} featured={featured} />
          <MediaCount v={v} />
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold leading-snug transition-colors group-hover:text-[var(--brand)]">
                {v.make} {v.model}
              </h3>
              <p className="mt-0.5 truncate text-[11.5px]" style={{ color: "var(--text-dim)" }}>
                {v.version}
              </p>
            </div>
            <TrustDot trust={trust} />
          </div>

          <SpecRow v={v} />

          <div
            className="mt-3.5 flex items-end justify-between gap-2 border-t pt-3"
            style={{ borderColor: "var(--line-soft)" }}
          >
            <div className="min-w-0">
              <Price value={v.price} className="text-[19px] font-extrabold tracking-tight" />
              <div className="mt-1.5"><FairPriceTag fp={fp} /></div>
            </div>
            <div
              className="flex shrink-0 flex-col items-end gap-1 text-[11px]"
              style={{ color: "var(--text-dim)" }}
            >
              <span className="flex items-center gap-1"><MapPin size={12} /> {cityLabel(v.city, locale)}</span>
              {!compact && (
                <span className="flex items-center gap-1"><Clock size={12} /> {fmtTimeAgo(v.publishedAt, locale)}</span>
              )}
            </div>
          </div>
        </div>
      </Link>

      <div
        className="flex items-center justify-between gap-2 border-t px-4 py-2.5"
        style={{ borderColor: "var(--line-soft)", background: "var(--surface-2)" }}
      >
        <Link
          href={vehicleHref(v)}
          className="flex items-center gap-1.5 text-[12px] font-bold transition-all hover:gap-2.5"
          style={{ color: "var(--brand)" }}
          transitionTypes={["nav-forward"]}
        >
          {t.card.seeDetails} <ArrowLeft size={14} className="dir-flip" />
        </Link>
        <CardActions v={v} />
      </div>
    </article>
  );
}

/* ============================================================
   بطاقة أفقية (عرض القائمة)
   ============================================================ */
export function VehicleRow({ v }: { v: Vehicle }) {
  const t = useDict();
  const locale = useLocale();
  const L = specs(locale);
  const rowPromo = promoOf(v);
  const trust = useMemo(() => trustOf(v), [v]);
  const fp = useMemo(() => fairPriceOf(v), [v]);
  const FuelIcon = FUEL_ICONS[v.fuel];
  const GearIcon = v.gearbox === "automatique" ? AutoGear : Transmission;

  return (
    <article className="card card-hover group relative overflow-hidden">
      <Link href={vehicleHref(v)} className="flex flex-col sm:flex-row" transitionTypes={["nav-forward"]}>
        <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-auto sm:w-[280px] sm:shrink-0">
          <ViewTransition name={`vehicle-${v.id}`} share="morph" default="none">
            <VehicleCover
              v={v}
              className="h-full w-full transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
            />
          </ViewTransition>
          <MediaCount v={v} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-bold transition-colors group-hover:text-[var(--brand)]">
                    {v.make} {v.model}
                  </h3>
                  {rowPromo && (
                    <span className="tag" style={{ background: `color-mix(in oklab, ${rowPromo.color} 14%, transparent)`, color: rowPromo.color }}>
                      <Sparkle size={11} /> {promoLabel(rowPromo.tier, locale, t)}
                    </span>
                  )}
                  {v.inspected && <span className="tag tag-good"><BadgeCheck size={11} /> {t.card.inspected}</span>}
                </div>
                <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-dim)" }}>
                  {v.version}
                </p>
              </div>
              <TrustDot trust={trust} />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="chip chip-plain"><Calendar size={12} /><span className="num">{v.year}</span></span>
              <span className="chip chip-plain"><Odometer size={12} /><span className="num">{formatNumber(v.km)}</span> {kmUnit(locale)}</span>
              <span className="chip chip-plain"><FuelIcon size={12} />{L.fuel[v.fuel]}</span>
              <span className="chip chip-plain"><GearIcon size={12} />{L.gearbox[v.gearbox]}</span>
              <span className="chip chip-plain"><MapPin size={12} />{cityLabel(v.city, locale)}</span>
            </div>

            <p className="mt-3 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {v.description}
            </p>
          </div>

          <div
            className="flex flex-wrap items-end justify-between gap-2 border-t pt-3"
            style={{ borderColor: "var(--line-soft)" }}
          >
            <div className="flex items-center gap-3">
              <Price value={v.price} className="text-xl font-extrabold tracking-tight" />
              <FairPriceTag fp={fp} />
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-dim)" }}>
                <Clock size={12} /> {fmtTimeAgo(v.publishedAt, locale)}
              </span>
              <CardActions v={v} />
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
