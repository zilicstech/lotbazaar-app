"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox, Stat } from "@/components/ui";
import { api, inr, num } from "@/lib/api";
import type { Carton, Container, Masters } from "@/lib/types";

const APPAREL = ["S", "M", "L", "XL", "XXL"];
const WAIST = ["28", "30", "32", "34", "36", "38"];
const SHOES = ["6", "7", "8", "9", "10", "11"];

type Line = { key: number; size: string; mrp: string; pieces: string };
let lineKey = 0;
const newLine = (): Line => ({ key: ++lineKey, size: "", mrp: "", pieces: "" });

const sizesFor = (category: string) =>
  category === "JEANS" ? WAIST : category === "SNEAKER" ? SHOES : APPAREL;

function ContainerPageContent() {
  const { id } = useParams<{ id: string }>();
  const [container, setContainer] = useState<Container | null>(null);
  const [cartons, setCartons] = useState<Carton[]>([]);
  const [masters, setMasters] = useState<Masters | null>(null);
  const [form, setForm] = useState({ brandId: "", categoryId: "", gender: "M", grade: "A", weightKg: "" });
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<Carton | null>(null);
  const [dock, setDock] = useState({ bales: "", kg: "" });
  const [confirmFinish, setConfirmFinish] = useState(false);

  const load = useCallback(async () => {
    setContainer(await api<Container>(`/seller/containers/${id}`));
    setCartons(await api<Carton[]>(`/seller/containers/${id}/cartons`));
  }, [id]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
    api<Masters>("/seller/masters").then((m) => {
      setMasters(m);
      setForm((f) => ({ ...f, brandId: m.brands[0]?.id ?? "", categoryId: m.categories[0]?.id ?? "" }));
    });
  }, [load]);

  const categoryCode = masters?.categories.find((c) => c.id === form.categoryId)?.code ?? "";
  const sizes = sizesFor(categoryCode);
  const filled = lines.filter((l) => Number(l.mrp) > 0 && Number(l.pieces) > 0);
  const pieces = filled.reduce((sum, l) => sum + Number(l.pieces), 0);
  const totalMrp = filled.reduce((sum, l) => sum + Number(l.mrp) * Number(l.pieces), 0);
  const incomplete = lines.some((l) => (l.mrp !== "" || l.pieces !== "") && !(Number(l.mrp) > 0 && Number(l.pieces) > 0));
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function addCarton(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      // Pieces, size tally and total MRP are worked out by the server from the price lines.
      const carton = await api<Carton>(`/seller/containers/${id}/cartons`, {
        method: "POST",
        body: {
          brandId: form.brandId, categoryId: form.categoryId, gender: form.gender, grade: form.grade,
          weightG: Math.round(Number(form.weightKg) * 1000),
          priceLines: filled.map((l) => ({ size: l.size || sizes[0], mrp: Number(l.mrp), pieces: Number(l.pieces) })),
        },
      });
      setLast(carton);
      setLines([newLine()]);
      setForm((f) => ({ ...f, weightKg: "" }));
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function act(path: string, body?: unknown) {
    setError(null);
    try {
      await api(`/seller/containers/${id}/${path}`, { method: "POST", body });
      setConfirmFinish(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const kgGap = container?.actualKg != null && container.expectedKg ? (100 * (container.actualKg - container.expectedKg)) / container.expectedKg : null;
  const liveGap = dock.kg && container?.expectedKg ? (100 * (Number(dock.kg) - container.expectedKg)) / container.expectedKg : null;
  const status = container?.status;

  return (
    <Shell title={container ? `Container ${container.ref}` : "Container"}
      help={status === "ARRIVED" ? <>Step 2. The container is at the gate. Count the bales/cartons and weigh it, then compare with the supplier&apos;s packing list.</>
        : status === "SORTING" ? <>Step 3. Open bales, sort similar items into one carton, enter each size with its tag MRP and pieces, weigh it, and stick the printed barcode label on it. When everything is sorted, click <b>Finish sorting</b> (step 4).</>
        : <>This container is fully sorted. Cartons without a bin still need putaway (step 5).</>}
      actions={<>
        {cartons.length > 0 && <Link href={`/labels/${id}`} target="_blank"><Button variant="secondary">Print all labels</Button></Link>}
        {status === "SORTING" && <Button onClick={() => setConfirmFinish(true)}>Finish sorting</Button>}
      </>}>
      <ErrorBox message={error} />
      {container && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat compact label="Status" value={<Badge value={container.status} />} hint={`${container.supplier} · ${container.warehouse}`} />
          <Stat compact label="Pieces sorted" value={`${num(container.pieces)} / ${num(container.expectedPieces ?? 0)}`} hint="vs packing list" />
          <Stat compact label="Cartons made" value={container.cartons} hint={`${container.unshelvedCartons} not yet shelved`} />
          <Stat compact label="Weight" value={`${container.sortedKg} kg sorted`} hint={container.actualKg != null ? `dock: ${container.actualKg} kg · list: ${container.expectedKg} kg` : `packing list: ${container.expectedKg} kg`} />
          <Stat compact label="Tag MRP" value={inr(container.totalMrp)} hint={container.landedCost != null ? `landed cost ${inr(container.landedCost)}` : undefined} />
        </div>
      )}
      {confirmFinish && container && (
        <div className="card mb-5 border-amber-300 bg-amber-50">
          <div className="font-medium">Finish sorting {container.ref}?</div>
          <p className="mt-1 text-sm">
            Sorted {num(container.pieces)} of {num(container.expectedPieces ?? 0)} pieces on the packing list
            {container.expectedPieces ? ` (${((100 * container.pieces) / container.expectedPieces).toFixed(0)}%)` : ""}. No more cartons can be added after this.
          </p>
          <div className="mt-3 flex gap-2"><Button onClick={() => act("finish")}>Yes, finish</Button><Button variant="secondary" onClick={() => setConfirmFinish(false)}>Keep sorting</Button></div>
        </div>
      )}
      {status === "ARRIVED" && container && (
        <form onSubmit={(e) => { e.preventDefault(); act("dock-check", { actualBales: Number(dock.bales), actualKg: Number(dock.kg) }); }} className="card mb-6 space-y-4">
          <div>
            <h2 className="font-semibold">Dock check</h2>
            <p className="text-xs text-slate-500">Packing list says <b>{num(container.expectedPieces ?? 0)} pieces, {container.expectedKg} kg</b>. Weigh the container on the dock scale and count the bales.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div><label className="label" htmlFor="bales">Bales / cartons received</label>
              <input id="bales" required type="number" min="1" className="input" value={dock.bales} onChange={(e) => setDock({ ...dock, bales: e.target.value })} /></div>
            <div><label className="label" htmlFor="kg">Gross weight (kg)</label>
              <input id="kg" required type="number" min="1" step="0.1" className="input" value={dock.kg} onChange={(e) => setDock({ ...dock, kg: e.target.value })} /></div>
            <div className="flex items-end text-sm">
              {liveGap != null && (
                <span className={Math.abs(liveGap) > 3 ? "font-medium text-rose-700" : "text-emerald-700"}>
                  {liveGap >= 0 ? "+" : ""}{liveGap.toFixed(1)}% vs packing list {Math.abs(liveGap) > 3 ? "— note it for a supplier claim" : "— OK"}
                </span>
              )}
            </div>
            <div className="flex items-end"><Button type="submit">Save & start sorting</Button></div>
          </div>
        </form>
      )}
      {status !== "ARRIVED" && kgGap != null && (
        <p className={`mb-4 text-sm ${Math.abs(kgGap) > 3 ? "text-rose-700" : "text-slate-600"}`}>
          Dock check: {container?.actualBales} bales, {container?.actualKg} kg ({kgGap >= 0 ? "+" : ""}{kgGap.toFixed(1)}% vs packing list).
        </p>
      )}
      {container?.status === "SORTING" && masters && (
        <form onSubmit={addCarton} className="card mb-6 space-y-4">
          <div>
            <h2 className="font-semibold">Sorting station — add carton</h2>
            <p className="text-xs text-slate-500">One carton = one bucket (brand · gender · category · grade). Enter each size with its tag MRP and number of pieces; add another row for the same size at a different price. Totals, the SKU and the LPN label are generated.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div><label className="label" htmlFor="brand">Brand</label>
              <select id="brand" className="input" value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })}>
                {masters.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div><label className="label" htmlFor="cat">Category</label>
              <select id="cat" className="input" value={form.categoryId} onChange={(e) => { setForm({ ...form, categoryId: e.target.value }); setLines([newLine()]); }}>
                {masters.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="label" htmlFor="gender">Gender</label>
              <select id="gender" className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="M">Men</option><option value="W">Women</option><option value="K">Kids</option><option value="U">Unisex</option></select></div>
            <div><label className="label" htmlFor="grade">Grade</label>
              <select id="grade" className="input" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                <option value="A">A – new with tags</option><option value="B">B – no tags / minor defect</option><option value="C">C – defect</option></select></div>
          </div>
          <div>
            <div className="label">Sizes and tag prices</div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="data-table">
                <thead><tr><th>Size</th><th className="num">MRP per piece (₹)</th><th className="num">Pieces</th><th className="num">Line total</th><th className="w-10" /></tr></thead>
                <tbody>
                  {lines.map((l, i) => {
                    const ok = Number(l.mrp) > 0 && Number(l.pieces) > 0;
                    return (
                      <tr key={l.key}>
                        <td className="!py-2">
                          <select aria-label={`Size, row ${i + 1}`} className="input w-28" value={l.size || sizes[0]} onChange={(e) => setLine(i, { size: e.target.value })}>
                            {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="num !py-2"><input aria-label={`MRP per piece, row ${i + 1}`} type="number" min="1" step="0.01" inputMode="decimal" className="input ml-auto w-36 text-right" placeholder="e.g. 1999" value={l.mrp} onChange={(e) => setLine(i, { mrp: e.target.value })} /></td>
                        <td className="num !py-2"><input aria-label={`Pieces, row ${i + 1}`} type="number" min="1" step="1" inputMode="numeric" className="input ml-auto w-28 text-right" placeholder="0" value={l.pieces} onChange={(e) => setLine(i, { pieces: e.target.value })} /></td>
                        <td className="num !py-2 align-middle font-medium">{ok ? inr(Number(l.mrp) * Number(l.pieces)) : <span className="text-slate-300">—</span>}</td>
                        <td className="!py-2 text-right align-middle">
                          {lines.length > 1 && <button type="button" aria-label={`Remove row ${i + 1}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600">✕</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm">
                <button type="button" className="font-medium text-emerald-700 hover:underline"
                  onClick={() => setLines((ls) => [...ls, { ...newLine(), size: ls[ls.length - 1]?.size || sizes[0] }])}>+ Add row</button>
                <div className="text-slate-700">
                  <b className="tabular-nums">{num(pieces)}</b> pieces · <b className="tabular-nums">{inr(totalMrp)}</b> total MRP
                  {pieces > 0 && <span className="text-slate-500"> · avg {inr(totalMrp / pieces)} / pc</span>}
                </div>
              </div>
            </div>
            {incomplete && <p className="mt-1 text-xs text-amber-700">Rows need both an MRP and a number of pieces; empty rows are skipped.</p>}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div><label className="label" htmlFor="weight">Carton weight (kg)</label>
              <input id="weight" required type="number" step="0.1" min="0.1" className="input" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} /></div>
            <div className="flex items-end"><Button type="submit" disabled={pieces === 0 || incomplete}>Add carton</Button></div>
          </div>
          {last && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <span>Carton <span className="font-mono font-semibold">{last.lpn}</span> created → stock type <span className="font-mono">{last.skuCode}</span> ({last.pieceCount} pcs)</span>
              <Link href={`/labels/${id}?lpn=${last.lpn}`} target="_blank" className="font-medium text-emerald-700 hover:underline">Print its label</Link>
              <Link href="/putaway" className="text-emerald-700 hover:underline">Shelve it (putaway)</Link>
            </div>
          )}
        </form>
      )}
      <div className="card overflow-x-auto p-0">
        <table className="data-table">
          <thead>
            <tr><th className="px-4 py-3">LPN</th><th>SKU (sort bucket)</th><th>Brand</th><th>Category</th><th>Grade</th>
              <th className="text-right">Pieces</th><th className="text-right">Weight</th><th className="text-right">MRP</th><th className="px-4">Bin</th><th className="px-4">Status</th></tr>
          </thead>
          <tbody>
            {cartons.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs">{c.lpn}</td><td className="font-mono text-xs">{c.skuCode}</td>
                <td>{c.brand}</td><td>{c.category}</td><td>{c.grade}</td>
                <td className="text-right tabular-nums">{c.pieceCount}</td><td className="text-right tabular-nums">{(c.weightG / 1000).toFixed(1)} kg</td>
                <td className="text-right tabular-nums">{inr(c.totalMrp)}
                  {c.priceLines && <div className="muted mt-0.5 whitespace-nowrap">{c.priceLines.map((l) => `${l.size} ${inr(l.mrp)}×${l.pieces}`).join(" · ")}</div>}</td>
                <td className="px-4 font-mono text-xs">{c.bin ?? <span className="font-sans text-amber-700">not shelved</span>}</td><td className="px-4"><Badge value={c.status} /></td>
              </tr>
            ))}
            {cartons.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">No cartons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

// useParams needs a Suspense boundary under cacheComponents.
export default function ContainerPage() {
  return (
    <Suspense>
      <ContainerPageContent />
    </Suspense>
  );
}
