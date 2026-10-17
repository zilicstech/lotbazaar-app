"use client";

import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox, Segmented, Stat } from "@/components/ui";
import { EmptyRow, exportCsv, ListTabs, ListToolbar, Pagination, SortTh, useList } from "@/components/list";
import { api, inr, num } from "@/lib/api";
import type { Carton } from "@/lib/types";

const GENDER: Record<string, string> = { M: "Men", W: "Women", K: "Kids", U: "Unisex" };
const band = (b: string) => {
  const [lo, hi] = b.split("_");
  const f = (v: string) => Number(v).toLocaleString("en-IN");
  return hi === "UP" ? `₹${f(lo)}+` : `₹${f(lo)}–${f(hi)}`;
};
const ageDays = (c: Carton) => Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86_400_000);
const ageBucket = (d: number) => (d <= 30 ? "0–30 days" : d <= 60 ? "31–60 days" : d <= 90 ? "61–90 days" : "90+ days");
const STATUS: Record<string, string> = { AVAILABLE: "On shelf", RESERVED: "In a lot", SORTED: "Not shelved", SOLD: "Sold" };
const ctn = (n: number) => `${n} ${n === 1 ? "carton" : "cartons"}`;
const sum = (cs: Carton[], f: (c: Carton) => number) => cs.reduce((s, c) => s + f(c), 0);

type StockRow = {
  sku: string; brand: string; category: string; gender: string; grade: string; mrpBand: string;
  available: Carton[]; inLots: Carton[]; unshelved: Carton[]; pieces: number; mrp: number; oldest: number; warehouses: string[];
};

function CartonStatus({ c }: { c: Carton }) {
  return c.status === "SORTED"
    ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />Not shelved</span>
    : c.status === "RESERVED"
      ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />In a lot</span>
      : <Badge value={c.status} />;
}

export default function InventoryPage() {
  const [cartons, setCartons] = useState<Carton[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"stock" | "cartons">("stock");
  useEffect(() => { api<Carton[]>("/seller/cartons").then(setCartons).catch((e) => setError(e.message)); }, []);

  const list = useList(cartons, {
    search: (c) => [c.lpn, c.skuCode, c.brand, c.category, c.bin, c.containerRef, c.warehouse],
    filters: {
      warehouse: { label: "Warehouse", value: (c) => c.warehouse },
      brand: { label: "Brand", value: (c) => c.brand },
      category: { label: "Category", value: (c) => c.category },
      gender: { label: "Gender", value: (c) => GENDER[c.gender] ?? c.gender },
      grade: { label: "Grade", value: (c) => `Grade ${c.grade}` },
      band: { label: "MRP band", value: (c) => c.mrpBand, format: band },
      age: { label: "Age", value: (c) => (c.status === "SOLD" ? null : ageBucket(ageDays(c))) },
    },
    tabs: [
      { key: "onhand", label: "On hand", match: (c) => c.status !== "SOLD" },
      { key: "available", label: "On shelf, free to sell", match: (c) => c.status === "AVAILABLE" },
      { key: "lots", label: "In lots", match: (c) => c.status === "RESERVED" },
      { key: "unshelved", label: "Not shelved", match: (c) => c.status === "SORTED" },
      { key: "sold", label: "Sold", match: (c) => c.status === "SOLD" },
    ],
    sorts: { lpn: (c) => c.lpn, sku: (c) => c.skuCode, bin: (c) => c.bin, pieces: (c) => c.pieceCount, kg: (c) => c.weightG, mrp: (c) => c.totalMrp, age: (c) => ageDays(c) },
    defaultSort: { key: "age", dir: "desc" },
    pageSize: 50,
  });

  // Summary cards follow search and filters, so picking a warehouse shows that warehouse's stock.
  const onHand = list.matched.filter((c) => c.status !== "SOLD");
  const by = (s: string) => onHand.filter((c) => c.status === s);
  const old = onHand.filter((c) => ageDays(c) > 90);

  const groups = useMemo(() => {
    const m = new Map<string, StockRow>();
    for (const c of list.all) {
      const g = m.get(c.skuCode) ?? { sku: c.skuCode, brand: c.brand, category: c.category, gender: c.gender, grade: c.grade, mrpBand: c.mrpBand,
        available: [], inLots: [], unshelved: [], pieces: 0, mrp: 0, oldest: 0, warehouses: [] };
      if (c.status === "AVAILABLE") g.available.push(c);
      else if (c.status === "RESERVED") g.inLots.push(c);
      else if (c.status === "SORTED") g.unshelved.push(c);
      g.pieces += c.pieceCount;
      g.mrp += c.totalMrp;
      g.oldest = Math.max(g.oldest, ageDays(c));
      if (!g.warehouses.includes(c.warehouse)) g.warehouses.push(c.warehouse);
      m.set(c.skuCode, g);
    }
    return [...m.values()];
  }, [list.all]);
  const stock = useList(groups, {
    search: () => [],
    sorts: { sku: (g) => g.sku, available: (g) => sum(g.available, (c) => c.pieceCount), pieces: (g) => g.pieces, mrp: (g) => g.mrp, oldest: (g) => g.oldest },
    defaultSort: { key: "pieces", dir: "desc" },
    pageSize: 50,
    syncUrl: false,
  });

  const csv = () => exportCsv("inventory", list.all, [
    ["Carton", (c) => c.lpn], ["Stock type", (c) => c.skuCode], ["Brand", (c) => c.brand], ["Category", (c) => c.category],
    ["Gender", (c) => c.gender], ["Grade", (c) => c.grade], ["MRP band", (c) => c.mrpBand], ["Warehouse", (c) => c.warehouse],
    ["Bin", (c) => c.bin], ["Status", (c) => STATUS[c.status] ?? c.status], ["Pieces", (c) => c.pieceCount], ["Kg", (c) => c.weightG / 1000],
    ["MRP", (c) => c.totalMrp], ["Container", (c) => c.containerRef], ["Received", (c) => c.createdAt], ["Age (days)", (c) => ageDays(c)],
  ]);

  return (
    <Shell title="Inventory" actions={<Button variant="secondary" onClick={csv} disabled={!list.total}>Export CSV</Button>}
      help={<>Every carton you hold, by stock type or one by one. A <b>stock type</b> is brand · gender · category · grade · MRP band, e.g. ZARA-W-DRESS-A-1500_2499. Stock is counted in cartons and pieces.</>}>
      <ErrorBox message={error} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="On hand" value={`${num(sum(onHand, (c) => c.pieceCount))} pcs`} hint={`${ctn(onHand.length)} · ${inr(sum(onHand, (c) => c.totalMrp))} MRP`} />
        <Stat label="On shelf, free to sell" tone="good" value={`${num(sum(by("AVAILABLE"), (c) => c.pieceCount))} pcs`} hint={ctn(by("AVAILABLE").length)} />
        <Stat label="In lots" value={`${num(sum(by("RESERVED"), (c) => c.pieceCount))} pcs`} hint={`${ctn(by("RESERVED").length)}, listed or being sold`} />
        <Stat label="Not shelved yet" tone={by("SORTED").length ? "warn" : undefined} value={ctn(by("SORTED").length)} hint="Sorted, waiting for putaway" />
        <Stat label="Older than 90 days" tone={old.length ? "warn" : undefined} value={`${num(sum(old, (c) => c.pieceCount))} pcs`} hint={`${ctn(old.length)} · consider a markdown`} />
      </div>

      <ListTabs list={list} />
      <ListToolbar list={list} placeholder="Search carton label, stock type, bin, container…">
        <Segmented value={view} onChange={setView} options={[["stock", "By stock type"], ["cartons", "By carton"]]} />
      </ListToolbar>

      {view === "stock" ? (
        <div className="card overflow-x-auto !p-0">
          <table className="data-table">
            <thead>
              <tr><SortTh list={stock} k="sku">Stock type</SortTh><th>Grade · MRP band</th><th>Warehouses</th>
                <SortTh list={stock} k="available" className="num">On shelf</SortTh><th className="num">In lots</th><th className="num">Not shelved</th>
                <SortTh list={stock} k="pieces" className="num">Total pcs</SortTh><SortTh list={stock} k="mrp" className="num">MRP</SortTh><SortTh list={stock} k="oldest" className="num">Oldest</SortTh></tr>
            </thead>
            <tbody>
              {stock.rows.map((g) => (
                <tr key={g.sku} className="cursor-pointer" onClick={() => { list.setQuery(g.sku); setView("cartons"); }} title="Show these cartons">
                  <td><div className="font-medium text-slate-900">{g.brand} · {GENDER[g.gender] ?? g.gender} · {g.category}</div><div className="muted font-mono">{g.sku}</div></td>
                  <td className="text-slate-600">Grade {g.grade} · {band(g.mrpBand)}</td>
                  <td className="text-xs text-slate-600">{g.warehouses.map((w) => w.split(" – ")[0]).join(", ")}</td>
                  <td className="num">{num(sum(g.available, (c) => c.pieceCount))}<div className="muted">{g.available.length} ctn</div></td>
                  <td className="num">{num(sum(g.inLots, (c) => c.pieceCount))}<div className="muted">{g.inLots.length} ctn</div></td>
                  <td className="num">{g.unshelved.length ? <span className="font-medium text-amber-700">{g.unshelved.length} ctn</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="num font-semibold">{num(g.pieces)}</td>
                  <td className="num">{inr(g.mrp)}</td>
                  <td className={`num ${g.oldest > 90 ? "font-medium text-rose-700" : "text-slate-600"}`}>{g.oldest} d</td>
                </tr>
              ))}
              {list.total === 0 && <EmptyRow list={list} cols={9} empty="No stock yet. Receive and sort a container first." />}
            </tbody>
          </table>
          <Pagination list={stock} />
        </div>
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="data-table">
            <thead>
              <tr><SortTh list={list} k="lpn">Carton</SortTh><SortTh list={list} k="sku">Stock type</SortTh><th>Warehouse</th><SortTh list={list} k="bin">Bin</SortTh><th>Status</th>
                <SortTh list={list} k="pieces" className="num">Pcs</SortTh><SortTh list={list} k="kg" className="num">Kg</SortTh><SortTh list={list} k="mrp" className="num">MRP</SortTh>
                <th>Container</th><SortTh list={list} k="age" className="num">Age</SortTh></tr>
            </thead>
            <tbody>
              {list.rows.map((c) => {
                const d = ageDays(c);
                return (
                  <tr key={c.id}>
                    <td className="font-mono text-xs font-medium text-slate-900">{c.lpn}</td>
                    <td><div>{c.brand} · {GENDER[c.gender] ?? c.gender} · {c.category}</div><div className="muted">Grade {c.grade} · {band(c.mrpBand)}</div></td>
                    <td className="text-xs text-slate-600">{c.warehouse.split(" – ")[0]}</td>
                    <td className="font-mono text-xs">{c.bin ?? <span className="text-slate-400">—</span>}</td>
                    <td><CartonStatus c={c} /></td>
                    <td className="num">{c.pieceCount}</td>
                    <td className="num">{(c.weightG / 1000).toFixed(1)}</td>
                    <td className="num">{inr(c.totalMrp)}</td>
                    <td className="font-mono text-xs text-slate-600">{c.containerRef}</td>
                    <td className={`num ${d > 90 && c.status !== "SOLD" ? "font-medium text-rose-700" : "text-slate-600"}`}>{d} d</td>
                  </tr>
                );
              })}
              <EmptyRow list={list} cols={10} empty="No cartons yet. Receive and sort a container first." />
            </tbody>
          </table>
          <Pagination list={list} />
        </div>
      )}
    </Shell>
  );
}
