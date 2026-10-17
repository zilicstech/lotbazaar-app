"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox } from "@/components/ui";
import { EmptyRow, ListTabs, ListToolbar, Pagination, SortTh, useList } from "@/components/list";
import { api, getSession, inr, num, photoUrl } from "@/lib/api";
import type { Carton, Lot } from "@/lib/types";

export default function LotsPage() {
  const router = useRouter();
  const [lots, setLots] = useState<Lot[]>([]);
  const [cartons, setCartons] = useState<Carton[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLots(await api<Lot[]>("/seller/lots"));
    setCartons(await api<Carton[]>("/seller/cartons?status=AVAILABLE"));
  }, []);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  const selection = useMemo(() => cartons.filter((c) => picked.has(c.id)), [cartons, picked]);
  const selPieces = selection.reduce((s, c) => s + c.pieceCount, 0);
  const selMrp = selection.reduce((s, c) => s + c.totalMrp, 0);

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createLot() {
    setError(null);
    try {
      const lot = await api<Lot>("/seller/lots", { method: "POST", body: { title, description, cartonIds: [...picked] } });
      setPicked(new Set());
      setTitle("");
      setDescription("");
      setBuilding(false);
      router.push(`/lots/${lot.id}`);
    } catch (err) {
      setError((err as Error).message);
      load();
    }
  }

  const list = useList(lots, {
    search: (l) => [l.code, l.title, l.description, ...Object.keys(l.manifest.brandMix), ...Object.keys(l.manifest.categoryMix)],
    filters: {
      brand: { label: "Brand", value: (l) => Object.keys(l.manifest.brandMix) },
      category: { label: "Category", value: (l) => Object.keys(l.manifest.categoryMix) },
      grade: { label: "Grade", value: (l) => l.manifest.grades.map((g) => `Grade ${g}`) },
      offers: { label: "Offers", value: (l) => (l.status === "DRAFT" ? null : l.acceptOffers ? "Accepts offers" : "Buy Now only") },
    },
    tabs: [
      { key: "all", label: "All", match: () => true },
      { key: "draft", label: "Draft", match: (l) => l.status === "DRAFT" },
      { key: "listed", label: "On sale", match: (l) => l.status === "LISTED" },
      { key: "reserved", label: "Held for payment", match: (l) => l.status === "RESERVED" },
      { key: "sold", label: "Sold", match: (l) => l.status === "SOLD" },
    ],
    sorts: { code: (l) => l.code, created: (l) => l.createdAt, pieces: (l) => l.pieceCount, mrp: (l) => l.totalMrp, price: (l) => l.priceAmount, pct: (l) => l.pricePct },
    defaultSort: { key: "created", dir: "desc" },
  });
  const pick = useList(cartons, {
    search: (c) => [c.lpn, c.skuCode, c.brand, c.category, c.bin, c.containerRef],
    filters: {
      warehouse: { label: "Warehouse", value: (c) => c.warehouse },
      brand: { label: "Brand", value: (c) => c.brand },
      category: { label: "Category", value: (c) => c.category },
      grade: { label: "Grade", value: (c) => c.grade },
    },
    sorts: { lpn: (c) => c.lpn, pieces: (c) => c.pieceCount, mrp: (c) => c.totalMrp, bin: (c) => c.bin },
    defaultSort: { key: "bin", dir: "asc" },
    pageSize: 1000,
    syncUrl: false,
  });
  const tenant = getSession()?.user.tenantCode ?? "";

  return (
    <Shell title="Lots"
      help={<>A <b>lot</b> is what a buyer purchases: a set of shelved cartons sold together. Pick cartons, and the system works out what&apos;s inside. Then open the lot to add photos and put it on sale.</>}
      actions={<Button onClick={() => setBuilding(!building)}>{building ? "Cancel" : "Build new lot"}</Button>}>
      <ErrorBox message={error} />
      {building && (
        <div className="card mb-6 space-y-4">
          <div>
            <h2 className="section-title !mb-0">Lot builder: pick cartons</h2>
            <p className="muted mt-0.5">All cartons in a lot must come from one warehouse. The manifest (brand / category / size mix, MRP, weight) is derived from the cartons you pick.</p>
          </div>
          <ListToolbar list={pick} placeholder="Search carton label, stock type, bin, container…">
            {pick.total > 0 && <Button variant="secondary" size="sm" onClick={() => setPicked((prev) => new Set([...prev, ...pick.all.map((c) => c.id)]))}>Select all {pick.total} shown</Button>}
            {picked.size > 0 && <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())}>Clear selection</Button>}
          </ListToolbar>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200">
            <table className="data-table">
              <thead className="sticky top-0 z-10">
                <tr><th className="w-10" /><SortTh list={pick} k="lpn">Carton</SortTh><th>Stock type</th><th>Brand</th><SortTh list={pick} k="bin">Warehouse · bin</SortTh>
                  <SortTh list={pick} k="pieces" className="num">Pieces</SortTh><SortTh list={pick} k="mrp" className="num">MRP</SortTh></tr>
              </thead>
              <tbody>
                {pick.rows.map((c) => (
                  <tr key={c.id} className={`cursor-pointer ${picked.has(c.id) ? "!bg-emerald-50" : ""}`} onClick={() => toggle(c.id)}>
                    <td><input type="checkbox" className="accent-emerald-600" aria-label={`Pick ${c.lpn}`} checked={picked.has(c.id)} onChange={() => toggle(c.id)} onClick={(e) => e.stopPropagation()} /></td>
                    <td className="font-mono text-xs font-medium">{c.lpn}</td><td className="font-mono text-xs text-slate-600">{c.skuCode}</td><td>{c.brand}</td>
                    <td className="text-xs">{c.warehouse.split(" – ")[0]} · <span className="font-mono">{c.bin}</span></td>
                    <td className="num">{c.pieceCount}</td><td className="num">{inr(c.totalMrp)}</td>
                  </tr>
                ))}
                <EmptyRow list={pick} cols={7} empty="No shelved cartons. Sort a container and shelve the cartons first." />
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-72 flex-1"><label className="label" htmlFor="title">Lot title</label>
              <input id="title" className="input" placeholder="e.g. H&M Men Tees – Grade A" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><b>{selection.length}</b> cartons · <b>{num(selPieces)}</b> pcs · <b>{inr(selMrp)}</b> MRP</div>
            <Button disabled={!title || selection.length === 0} onClick={createLot}>Create lot</Button>
          </div>
          <div><label className="label" htmlFor="desc">Description for buyers (optional)</label>
            <textarea id="desc" rows={2} className="input" placeholder="Condition, fits, anything a buyer should know" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
      )}
      <ListTabs list={list} />
      <ListToolbar list={list} placeholder="Search lot code, title, brand, category…" />
      <div className="card overflow-x-auto !p-0">
        <table className="data-table">
          <thead>
            <tr><SortTh list={list} k="code">Lot</SortTh><th>Contents</th><th>Status</th><SortTh list={list} k="pieces" className="num">Pieces</SortTh>
              <SortTh list={list} k="mrp" className="num">Total MRP</SortTh><SortTh list={list} k="price" className="num">Price</SortTh><th>Next</th></tr>
          </thead>
          <tbody>
            {list.rows.map((l) => (
              <tr key={l.id}>
                <td>
                  <Link href={`/lots/${l.id}`} className="group flex items-center gap-3">
                    {l.photos[0]
                      ? <img src={photoUrl(tenant, l.photos[0])} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
                      : <span title="No photo yet" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M2 5.5A2.5 2.5 0 0 1 4.5 3h11A2.5 2.5 0 0 1 18 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 2 14.5v-9Zm2.5-1a1 1 0 0 0-1 1v6.94l2.72-2.72a.75.75 0 0 1 1.06 0L11 13.44l1.72-1.72a.75.75 0 0 1 1.06 0l2.72 2.72V5.5a1 1 0 0 0-1-1h-11ZM13 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" clipRule="evenodd" /></svg></span>}
                    <span><span className="block font-medium text-slate-900 group-hover:text-emerald-700 group-hover:underline">{l.title}</span>
                      <span className="muted font-mono">{l.code}</span></span>
                  </Link>
                </td>
                <td className="text-xs text-slate-600">{Object.keys(l.manifest.brandMix).join(", ")}<div className="muted">{Object.keys(l.manifest.categoryMix).join(", ")} · Grade {l.manifest.grades.join(", ")}</div></td>
                <td><Badge value={l.status} /></td>
                <td className="num">{num(l.pieceCount)}</td><td className="num">{inr(l.totalMrp)}</td>
                <td className="num">{l.priceAmount ? <><div className="font-medium">{inr(l.priceAmount)}</div><div className="muted">{l.pricePct}% of MRP</div></> : <span className="text-slate-400">—</span>}</td>
                <td className="text-sm">
                  {l.status === "DRAFT" && <Link className="font-medium text-emerald-700 hover:underline" href={`/lots/${l.id}`}>Add photos &amp; list →</Link>}
                  {l.status === "LISTED" && <span className="text-xs text-slate-500">{l.acceptOffers ? "Buy Now + offers" : "Buy Now"}</span>}
                  {l.status === "RESERVED" && <span className="text-xs text-amber-700">Buyer is paying</span>}
                </td>
              </tr>
            ))}
            <EmptyRow list={list} cols={7} empty="No lots yet. Build one from shelved cartons." />
          </tbody>
        </table>
        <Pagination list={list} />
      </div>
    </Shell>
  );
}
