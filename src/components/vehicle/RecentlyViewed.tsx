"use client";

import { useEffect, useMemo } from "react";
import { useApp } from "@/store/app";
import { useVehiclesByIds } from "@/lib/useVehicles";
import { VehicleCard } from "@/components/VehicleCard";
import { Clock } from "@/components/icons";
import { useDict } from "@/lib/i18n/client";

interface Props {
  /** المركبة الحالية: كتسجّل فالتاريخ وكتّحيّد من اللائحة */
  currentId?: string;
  /** عنوان القسم */
  heading?: string;
  limit?: number;
}

/**
 * كتسجّل المركبة اللي كيتصفّح فيها المستخدم فـ localStorage
 * وكتعرض آخر المركبات اللي شافها.
 */
export function RecentlyViewed({ currentId, heading, limit = 4 }: Props) {
  const t = useDict();
  const { recent, pushRecent, ready } = useApp();

  useEffect(() => {
    if (ready && currentId) pushRecent(currentId);
  }, [ready, currentId, pushRecent]);

  const ids = useMemo(
    () => recent.filter((id) => id !== currentId).slice(0, limit),
    [recent, currentId, limit],
  );
  /* التفاصيل كتجي من قاعدة البيانات — المتصفح كيخزّن غير المعرّفات */
  const { items } = useVehiclesByIds(ids);

  if (!ready || items.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="h-section mb-6 flex items-center gap-2">
        <Clock size={20} style={{ color: "var(--brand)" }} />
        {heading ?? t.recent.heading}
      </h2>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {items.map((r) => (
          <VehicleCard key={r.id} v={r} compact />
        ))}
      </div>
    </section>
  );
}
