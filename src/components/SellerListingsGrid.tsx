"use client";

import { useMemo, useState } from "react";
import type { Vehicle } from "@/lib/types";
import { useDict } from "@/lib/i18n/client";
import { VehicleCard } from "@/components/VehicleCard";
import { Users } from "@/components/icons";

type Kind = "all" | "car" | "moto";

/**
 * إعلانات البائع مع مبدّل نوع (الكل/سيارات/دراجات) — فلترة فالمتصفح
 * حيت الإعلانات كاملة أصلاً جايّة من الخادم، بلا حاجة لطلب جديد.
 */
export function SellerListingsGrid({ listings }: { listings: Vehicle[] }) {
  const t = useDict();
  const [kind, setKind] = useState<Kind>("all");

  const cars = listings.filter((v) => v.kind === "car").length;
  const motos = listings.length - cars;

  const filtered = useMemo(
    () => (kind === "all" ? listings : listings.filter((v) => v.kind === kind)),
    [listings, kind],
  );

  if (listings.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 p-10 text-center">
        <Users size={22} style={{ color: "var(--text-dim)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {t.sellerPage.noActiveListings}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="mb-5 inline-flex items-center gap-1 rounded-lg border p-0.5"
        style={{ borderColor: "var(--line)", background: "var(--surface-3)" }}
        role="group"
      >
        {([
          ["all", t.filters.all, listings.length],
          ["car", t.filters.cars, cars],
          ["moto", t.filters.motos, motos],
        ] as const).map(([k, label, n]) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-bold transition active:scale-95"
            style={{
              background: kind === k ? "var(--brand)" : "transparent",
              color: kind === k ? "var(--brand-ink)" : "var(--text-muted)",
            }}
          >
            {label} <span className="num opacity-70">{n}</span>
          </button>
        ))}
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-2 gap-5 xl:grid-cols-3">
          {filtered.map((v) => <VehicleCard key={v.id} v={v} compact />)}
        </div>
      ) : (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <Users size={22} style={{ color: "var(--text-dim)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t.search.emptyTitle}
          </p>
        </div>
      )}
    </>
  );
}
