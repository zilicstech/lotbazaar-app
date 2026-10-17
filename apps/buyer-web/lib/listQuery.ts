/** Pure search / filter / sort used by useList (components/list.tsx). Kept free of React so it can be unit tested. */
export type FilterFn<T> = (row: T) => string | string[] | null | undefined;
export type Value = string | number | null | undefined;

export function matchRows<T>(rows: T[], q: string, search: (row: T) => Value[], active: Record<string, string>, filters: Record<string, FilterFn<T>>): T[] {
  const needle = q.trim().toLowerCase();
  return rows.filter((r) =>
    (!needle || search(r).some((v) => v != null && String(v).toLowerCase().includes(needle)))
    && Object.entries(active).every(([k, v]) => {
      if (!v || !filters[k]) return true;
      const got = filters[k](r);
      return Array.isArray(got) ? got.includes(v) : got === v;
    }));
}

/** Stable sort; empty values always last. Strings compare naturally ("A-2" before "A-10"). */
export function sortRows<T>(rows: T[], get: ((row: T) => Value) | undefined, dir: "asc" | "desc"): T[] {
  if (!get) return rows;
  const m = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = get(a), y = get(b);
    if (x == null || x === "") return y == null || y === "" ? 0 : 1;
    if (y == null || y === "") return -1;
    return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "en-IN", { numeric: true })) * m;
  });
}

export function distinct<T>(rows: T[], f: FilterFn<T>): string[] {
  return [...new Set(rows.flatMap((r) => f(r) ?? []).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, "en-IN", { numeric: true }));
}
