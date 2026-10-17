"use client";

import { useEffect, useMemo, useState } from "react";
import { distinct, matchRows, sortRows } from "@/lib/listQuery";

/**
 * Search, filters, status tabs, sorting and paging for a list page, kept in the URL so a filtered view can be
 * shared or bookmarked. Rows are filtered in the browser.
 * shortcut: client-side filtering of full lists; move to server-side paging when a list passes a few thousand rows.
 */
export type ListConfig<T> = {
  /** Values matched by the search box (case-insensitive substring). */
  search: (row: T) => (string | number | null | undefined)[];
  /** Dropdown filters: key -> value of the row (or several, e.g. every brand in a mixed lot). Options are the distinct values present in the data. */
  filters?: Record<string, { label: string; value: (row: T) => string | string[] | null | undefined; format?: (v: string) => string }>;
  /** Status tabs; the first is the default. Counts reflect search and filters. */
  tabs?: { key: string; label: string; match: (row: T) => boolean }[];
  /** Sortable columns: key -> value to compare. */
  sorts?: Record<string, (row: T) => string | number | null | undefined>;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  pageSize?: number;
  /** Keep state in the URL (default). Turn off for a second list on the same page. */
  syncUrl?: boolean;
};

type State = { q: string; f: Record<string, string>; tab: string; sort: string; dir: "asc" | "desc"; page: number };

function readUrl(defaults: State): State {
  if (typeof window === "undefined") return defaults;
  const p = new URLSearchParams(window.location.search);
  const f: Record<string, string> = {};
  p.forEach((v, k) => { if (k.startsWith("f.")) f[k.slice(2)] = v; });
  return {
    q: p.get("q") ?? defaults.q,
    f,
    tab: p.get("tab") ?? defaults.tab,
    sort: p.get("sort") ?? defaults.sort,
    dir: (p.get("dir") as "asc" | "desc") ?? defaults.dir,
    page: Number(p.get("page")) || 1,
  };
}

function writeUrl(s: State, defaults: State) {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  Object.entries(s.f).forEach(([k, v]) => v && p.set(`f.${k}`, v));
  if (s.tab !== defaults.tab) p.set("tab", s.tab);
  if (s.sort !== defaults.sort || s.dir !== defaults.dir) { p.set("sort", s.sort); p.set("dir", s.dir); }
  if (s.page > 1) p.set("page", String(s.page));
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

export function useList<T>(rows: T[], cfg: ListConfig<T>) {
  const defaults: State = {
    q: "", f: {}, tab: cfg.tabs?.[0]?.key ?? "", sort: cfg.defaultSort?.key ?? "", dir: cfg.defaultSort?.dir ?? "asc", page: 1,
  };
  const [s, setS] = useState<State>(defaults);
  const [ready, setReady] = useState(false);
  // URL is read after mount so server and first client render match.
  const sync = cfg.syncUrl !== false;
  useEffect(() => { if (sync) setS(readUrl(defaults)); setReady(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready && sync) writeUrl(s, defaults); }, [s, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageSize = cfg.pageSize ?? 25;
  const update = (patch: Partial<State>) => setS((prev) => ({ ...prev, page: 1, ...patch }));

  const filtered = useMemo(() => {
    const fns = Object.fromEntries(Object.entries(cfg.filters ?? {}).map(([k, f]) => [k, f.value]));
    return matchRows(rows, s.q, cfg.search, s.f, fns);
  }, [rows, s.q, s.f]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabCounts = Object.fromEntries((cfg.tabs ?? []).map((t) => [t.key, filtered.filter(t.match).length]));
  const tab = cfg.tabs?.find((t) => t.key === s.tab) ?? cfg.tabs?.[0];
  const inTab = tab ? filtered.filter(tab.match) : filtered;

  const sorted = useMemo(() => sortRows(inTab, cfg.sorts?.[s.sort], s.dir), [inTab, s.sort, s.dir]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(s.page, pages);
  const options = Object.fromEntries(Object.entries(cfg.filters ?? {}).map(([k, f]) => [k, distinct(rows, f.value)]));

  return {
    cfg, state: s, options, tabCounts, matched: filtered,
    rows: sorted.slice((page - 1) * pageSize, page * pageSize),
    all: sorted, total: sorted.length, unfiltered: rows.length, page, pages, pageSize,
    setQuery: (q: string) => update({ q }),
    setFilter: (k: string, v: string) => update({ f: { ...s.f, [k]: v } }),
    clear: () => update({ q: "", f: {} }),
    setTab: (tab: string) => update({ tab }),
    toggleSort: (key: string) => update({ sort: key, dir: s.sort === key && s.dir === "asc" ? "desc" : "asc", page: s.page }),
    setSort: (key: string, dir: "asc" | "desc") => update({ sort: key, dir }),
    setPage: (p: number) => setS((prev) => ({ ...prev, page: p })),
  };
}

export type List<T> = ReturnType<typeof useList<T>>;

export function ListToolbar<T>({ list, placeholder, children }: { list: List<T>; placeholder: string; children?: React.ReactNode }) {
  const active = Object.entries(list.state.f).filter(([, v]) => v);
  const filters = Object.entries(list.cfg.filters ?? {});
  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <svg aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.47 9.77l3.63 3.63a.75.75 0 1 0 1.06-1.06l-3.63-3.63A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" /></svg>
          <input type="search" aria-label="Search" className="input pl-9" placeholder={placeholder} value={list.state.q} onChange={(e) => list.setQuery(e.target.value)} />
        </div>
        {filters.map(([k, f]) => (
          <select key={k} aria-label={f.label} value={list.state.f[k] ?? ""} onChange={(e) => list.setFilter(k, e.target.value)}
            className={`input w-auto pr-8 ${list.state.f[k] ? "border-emerald-500 text-emerald-800" : "text-slate-700"}`}>
            <option value="">{f.label}: all</option>
            {list.options[k].map((o) => <option key={o} value={o}>{f.format ? f.format(o) : o}</option>)}
          </select>
        ))}
        {children}
      </div>
      {(active.length > 0 || list.state.q) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {list.state.q && <Chip onRemove={() => list.setQuery("")}>Search: &ldquo;{list.state.q}&rdquo;</Chip>}
          {active.map(([k, v]) => {
            const f = list.cfg.filters?.[k];
            return f ? <Chip key={k} onRemove={() => list.setFilter(k, "")}>{f.label}: {f.format ? f.format(v) : v}</Chip> : null;
          })}
          <button type="button" className="text-slate-500 hover:text-slate-800 hover:underline" onClick={list.clear}>Clear all</button>
          <span className="ml-auto text-slate-500">{list.total} of {list.unfiltered} shown</span>
        </div>
      )}
    </div>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 py-0.5 pl-2.5 pr-1 font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
      {children}
      <button type="button" aria-label="Remove filter" onClick={onRemove} className="rounded-full px-1 hover:bg-emerald-100">✕</button>
    </span>
  );
}

export function ListTabs<T>({ list }: { list: List<T> }) {
  if (!list.cfg.tabs) return null;
  return (
    <div role="tablist" className="mb-3 flex gap-5 overflow-x-auto border-b border-slate-200 text-sm">
      {list.cfg.tabs.map((t) => {
        const on = (list.state.tab || list.cfg.tabs![0].key) === t.key;
        return (
          <button key={t.key} role="tab" aria-selected={on} type="button" onClick={() => list.setTab(t.key)}
            className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-0.5 pb-2.5 ${on ? "border-emerald-600 font-semibold text-emerald-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t.label}
            <span className={`rounded-full px-1.5 text-[11px] font-medium tabular-nums ${on ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{list.tabCounts[t.key]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SortTh<T>({ list, k, children, className = "" }: { list: List<T>; k: string; children: React.ReactNode; className?: string }) {
  const on = list.state.sort === k;
  return (
    <th className={className} aria-sort={on ? (list.state.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => list.toggleSort(k)} className={`inline-flex items-center gap-1 uppercase hover:text-slate-900 ${on ? "text-slate-900" : ""}`}>
        {children}<span aria-hidden className="text-[9px]">{on ? (list.state.dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

export function Pagination<T>({ list }: { list: List<T> }) {
  if (list.total === 0) return null;
  const from = (list.page - 1) * list.pageSize + 1;
  const to = Math.min(list.page * list.pageSize, list.total);
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
      <span>{from}–{to} of {list.total}</span>
      {list.pages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40" disabled={list.page === 1} onClick={() => list.setPage(list.page - 1)}>‹ Prev</button>
          <span className="px-2">Page {list.page} of {list.pages}</span>
          <button type="button" className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40" disabled={list.page === list.pages} onClick={() => list.setPage(list.page + 1)}>Next ›</button>
        </div>
      )}
    </div>
  );
}

/** Empty table body row: different message when filters hide everything. */
export function EmptyRow<T>({ list, cols, empty }: { list: List<T>; cols: number; empty: string }) {
  if (list.total > 0) return null;
  const filtered = list.unfiltered > 0;
  return (
    <tr><td colSpan={cols} className="px-4 py-12 text-center">
      <div className="text-sm font-medium text-slate-700">{filtered ? "Nothing matches these filters" : empty}</div>
      {filtered && <button type="button" onClick={list.clear} className="mt-1 text-sm text-emerald-700 hover:underline">Clear filters</button>}
    </td></tr>
  );
}

/** Downloads the currently filtered rows as CSV. */
export function exportCsv<T>(name: string, rows: T[], cols: [string, (r: T) => string | number | null | undefined][]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.map(([h]) => esc(h)).join(","), ...rows.map((r) => cols.map(([, f]) => esc(f(r))).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
