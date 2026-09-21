"use client";

import { useDict } from "@/lib/i18n/client";

/* ============================================================
   هيكل تحميل شبكة المركبات

   نفس الشكل فحالتين: fallback ديال Suspense (قبل ما تحمّل الصفحة
   حتى)، وحالة التحميل الداخلية لـ VehiclesClient (بعد ما تحمّل
   الصفحة وهي كتجيب النتائج من API). بلا هادشي كان الانتقال بينهم
   كيبان كقفزة — هيكل بشكل، من بعد هيكل بشكل آخر.
   ============================================================ */
export function VehicleCardSkeleton({ view = "grid" }: { view?: "grid" | "list" }) {
  if (view === "list") {
    return (
      <div className="card flex gap-4 overflow-hidden p-3">
        <div className="skeleton h-28 w-40 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2.5 py-1">
          <div className="skeleton h-4 w-2/3 rounded" />
          <div className="skeleton h-3 w-1/3 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-5 w-24 rounded" />
        </div>
      </div>
    );
  }
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-[16/10]" />
      {/* عمودين فالهاتف — هيكل مضغوط بنفس نسب البطاقة الحقيقية */}
      <div className="space-y-1.5 p-2.5 sm:hidden">
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-3 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-4 w-1/3 rounded" />
      </div>
      <div className="hidden space-y-2.5 p-4 sm:block">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="mt-3 flex gap-2">
          <div className="skeleton h-3 w-1/4 rounded" />
          <div className="skeleton h-3 w-1/4 rounded" />
        </div>
        <div className="skeleton mt-2 h-6 w-1/3 rounded" />
      </div>
    </div>
  );
}

export function VehicleGridSkeleton({
  count = 9,
  view = "grid",
}: {
  count?: number;
  view?: "grid" | "list";
}) {
  const t = useDict();
  return (
    <div
      className={view === "grid" ? "grid grid-cols-2 gap-5 xl:grid-cols-3" : "flex flex-col gap-4"}
      aria-busy="true"
      aria-label={t.loadingResults}
    >
      {Array.from({ length: count }).map((_, i) => (
        <VehicleCardSkeleton key={i} view={view} />
      ))}
    </div>
  );
}

/** صفحة كاملة — للاستعمال فـSuspense fallback قبل ما تبان VehiclesClient */
export function VehiclesPageSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-7">
      <div className="skeleton mb-6 h-14 rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="hidden lg:block">
          <div className="skeleton h-[640px] rounded-2xl" />
        </div>
        <div className="min-w-0">
          <div className="skeleton mb-4 h-8 w-48 rounded-lg" />
          <VehicleGridSkeleton />
        </div>
      </div>
    </div>
  );
}
