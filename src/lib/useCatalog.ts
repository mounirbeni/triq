"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogEntry } from "./source-types";

/**
 * كتالوج الماركات والموديلات من الخادم.
 *
 * كيتجاب مرة وحدة وكيتخزّن فالوحدة، حيت نفس اللائحة كتُستعمل
 * فصفحة البيع، فالتقييم، وفالبحث المتقدّم.
 */
let cache: CatalogEntry[] | null = null;
let inflight: Promise<CatalogEntry[]> | null = null;

function fetchCatalog(): Promise<CatalogEntry[]> {
  if (cache) return Promise.resolve(cache);
  inflight ??= fetch("/api/catalog")
    .then((r) => r.json())
    .then((j) => {
      cache = (j?.ok ? j.data.items : []) as CatalogEntry[];
      return cache;
    })
    .catch(() => [] as CatalogEntry[])
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useCatalog() {
  const [rows, setRows] = useState<CatalogEntry[]>(cache ?? []);

  useEffect(() => {
    let alive = true;
    fetchCatalog().then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, []);

  const makesFor = useCallback(
    (kind: "car" | "moto" | "all") => {
      const list = kind === "all" ? rows : rows.filter((r) => r.kind === kind);
      return [...new Set(list.map((r) => r.make))].sort();
    },
    [rows],
  );

  const modelsFor = useCallback(
    (make: string, kind?: "car" | "moto") => [...new Set(
      rows.filter((r) => r.make === make && (!kind || r.kind === kind)).map((r) => r.model),
    )].sort(),
    [rows],
  );

  return useMemo(
    () => ({ rows, makesFor, modelsFor, ready: rows.length > 0 }),
    [rows, makesFor, modelsFor],
  );
}
