"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/store/app";
import type { Vehicle } from "@/lib/types";
import { VehicleCard } from "@/components/VehicleCard";
import { useDict } from "@/lib/i18n/client";
import { Sparkle } from "@/components/icons";

/**
 * «بناءً على اللي شفتي» — كتبان غير ملي يكون عند المستخدم تاريخ تصفح.
 * كترجع null قبل الترطيب باش ماكاينش اختلاف بين الخادم والمتصفح.
 */
export function SuggestedForYou({ limit = 4 }: { limit?: number }) {
  const t = useDict();
  const s = t.suggestedForYou;
  const { recent, ready } = useApp();
  const [items, setItems] = useState<Vehicle[]>([]);
  const key = recent.join(",");

  /* الاقتراح كيتحسب فالخادم — هو اللي عندو الإعلانات الحقيقية.
     المعرّفات كتبقى فالمتصفح، وكنصيفطوهم غير باش نجيبو المشابه. */
  useEffect(() => {
    if (!ready || recent.length < 2) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    fetch("/api/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recent, limit }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((j) => setItems(j?.ok ? (j.data.items as Vehicle[]) : []))
      .catch(() => setItems([]));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, limit]);

  if (!ready || recent.length < 2 || items.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-16">
      <header className="mb-7">
        <span className="eyebrow"><Sparkle size={13} /> {s.eyebrow}</span>
        <h2 className="h-section mt-3">{s.title}</h2>
        <p className="mt-2 max-w-xl text-sm" style={{ color: "var(--text-muted)" }}>
          {s.lead}
        </p>
      </header>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {items.map((v) => (
          <VehicleCard key={v.id} v={v} compact />
        ))}
      </div>
    </section>
  );
}
