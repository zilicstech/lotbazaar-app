"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox } from "@/components/ui";
import { EmptyRow, ListTabs, ListToolbar, Pagination, SortTh, useList } from "@/components/list";
import { api, getSession, inr, num } from "@/lib/api";
import type { Container, Masters } from "@/lib/types";

export default function ContainersPage() {
  const [rows, setRows] = useState<Container[]>([]);
  const [masters, setMasters] = useState<Masters | null>(null);
  const [form, setForm] = useState({ ref: "", supplier: "", warehouseId: "", landedCost: "", expectedPieces: "", expectedKg: "" });
  const isOwner = getSession()?.user.role === "OWNER";
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => api<Container[]>("/seller/containers").then(setRows).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
    api<Masters>("/seller/masters").then((m) => {
      setMasters(m);
      setForm((f) => ({ ...f, warehouseId: m.warehouses[0]?.id ?? "" }));
    });
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/seller/containers", { method: "POST", body: { ...form, landedCost: Number(form.landedCost), expectedPieces: Number(form.expectedPieces), expectedKg: Number(form.expectedKg) } });
      setForm({ ref: "", supplier: "", warehouseId: masters?.warehouses[0]?.id ?? "", landedCost: "", expectedPieces: "", expectedKg: "" });
      setOpen(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const list = useList(rows, {
    search: (c) => [c.ref, c.supplier, c.warehouse],
    filters: {
      warehouse: { label: "Warehouse", value: (c) => c.warehouse },
      supplier: { label: "Supplier", value: (c) => c.supplier },
    },
    tabs: [
      { key: "all", label: "All", match: () => true },
      { key: "dock", label: "At the dock", match: (c) => c.status === "ARRIVED" },
      { key: "sorting", label: "Sorting", match: (c) => c.status === "SORTING" },
      { key: "shelve", label: "To shelve", match: (c) => c.status === "SORTED" && c.unshelvedCartons > 0 },
      { key: "done", label: "Done", match: (c) => c.status === "SORTED" && c.unshelvedCartons === 0 },
    ],
    sorts: { ref: (c) => c.ref, received: (c) => c.receivedAt, pieces: (c) => c.pieces, mrp: (c) => c.totalMrp, cost: (c) => c.landedCost },
    defaultSort: { key: "received", dir: "desc" },
  });

  return (
    <Shell title="Containers & sorting"
      help={<>A container is one purchase from a supplier. It moves from <b>arrived</b> (at the gate) to <b>sorting</b> (dock check done, cartons being made) to <b>sorted</b>. Open one to work on it.</>}
      actions={isOwner && <Button onClick={() => setOpen(!open)}>{open ? "Cancel" : "Receive container"}</Button>}>
      <ErrorBox message={error} />
      {open && masters && (
        <form onSubmit={create} className="card mb-6 grid gap-3 md:grid-cols-5">
          <div><label className="label" htmlFor="ref">Container ref</label>
            <input id="ref" required className="input" placeholder="CN-2026-0501" value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} /></div>
          <div className="md:col-span-2"><label className="label" htmlFor="supplier">Supplier / source</label>
            <input id="supplier" required className="input" placeholder="H&M EU overstock" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
          <div><label className="label" htmlFor="wh">Warehouse</label>
            <select id="wh" className="input" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
              {masters.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select></div>
          <div><label className="label" htmlFor="cost">Landed cost (₹)</label>
            <input id="cost" required type="number" min="0" className="input" value={form.landedCost} onChange={(e) => setForm({ ...form, landedCost: e.target.value })} /></div>
          <div><label className="label" htmlFor="xp">Packing list: pieces</label>
            <input id="xp" required type="number" min="1" className="input" value={form.expectedPieces} onChange={(e) => setForm({ ...form, expectedPieces: e.target.value })} /></div>
          <div><label className="label" htmlFor="xkg">Packing list: gross kg</label>
            <input id="xkg" required type="number" min="1" step="0.1" className="input" value={form.expectedKg} onChange={(e) => setForm({ ...form, expectedKg: e.target.value })} /></div>
          <p className="text-xs text-slate-500 md:col-span-3 md:self-end">Landed cost = purchase + freight + duty + handling. The packing list numbers are checked at the dock.</p>
          <div className="md:col-span-5"><Button type="submit">Record arrival</Button></div>
        </form>
      )}
      <ListTabs list={list} />
      <ListToolbar list={list} placeholder="Search container ref, supplier, warehouse…" />
      <div className="card overflow-x-auto !p-0">
        <table className="data-table">
          <thead>
            <tr><SortTh list={list} k="ref">Container</SortTh><th>Supplier</th><th>Warehouse</th><th>Status</th>
              <th className="num">Cartons</th><SortTh list={list} k="pieces" className="num">Pieces sorted</SortTh><SortTh list={list} k="mrp" className="num">MRP</SortTh>
              {isOwner && <SortTh list={list} k="cost" className="num">Landed cost</SortTh>}<th>Next action</th></tr>
          </thead>
          <tbody>
            {list.rows.map((c) => (
              <tr key={c.id}>
                <td><Link className="font-mono text-sm font-medium text-slate-900 hover:text-emerald-700 hover:underline" href={`/containers/${c.id}`}>{c.ref}</Link>
                  <div className="muted">{new Date(c.receivedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</div></td>
                <td>{c.supplier}</td><td className="text-slate-600">{c.warehouse}</td><td><Badge value={c.status} /></td>
                <td className="num">{c.cartons}</td>
                <td className="num">{num(c.pieces)}{c.expectedPieces ? <span className="text-slate-400"> / {num(c.expectedPieces)}</span> : null}</td>
                <td className="num">{inr(c.totalMrp)}</td>{isOwner && <td className="num">{inr(c.landedCost)}</td>}
                <td className="text-sm">
                  {c.status === "ARRIVED" && <Link className="font-medium text-violet-700 hover:underline" href={`/containers/${c.id}`}>Do dock check →</Link>}
                  {c.status === "SORTING" && <Link className="font-medium text-sky-700 hover:underline" href={`/containers/${c.id}`}>Continue sorting →</Link>}
                  {c.status === "SORTED" && (c.unshelvedCartons > 0
                    ? <Link className="font-medium text-amber-700 hover:underline" href="/putaway">{c.unshelvedCartons} cartons to shelve →</Link>
                    : <span className="text-slate-400">Done</span>)}
                </td>
              </tr>
            ))}
            <EmptyRow list={list} cols={isOwner ? 9 : 8} empty="No containers yet." />
          </tbody>
        </table>
        <Pagination list={list} />
      </div>
    </Shell>
  );
}
