"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox } from "@/components/ui";
import { api, inr, num } from "@/lib/api";
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

  return (
    <Shell title="Lots"
      help={<>Steps 6–7. A <b>lot</b> is what a buyer purchases: a set of shelved cartons sold together. Pick cartons, and the system works out what&apos;s inside. Then open the lot to add photos and put it on sale.</>}
      actions={<Button onClick={() => setBuilding(!building)}>{building ? "Cancel" : "Build new lot"}</Button>}>
      <ErrorBox message={error} />
      {building && (
        <div className="card mb-6 space-y-4">
          <div>
            <h2 className="font-semibold">Lot builder — pick cartons</h2>
            <p className="text-xs text-slate-500">The manifest (brand / category / size mix, MRP, weight) is derived from the cartons you pick.</p>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="w-10 px-3 py-2"></th><th>LPN</th><th>Stock type</th><th>Brand</th><th>Warehouse · bin</th><th className="text-right">Pieces</th><th className="px-3 text-right">MRP</th></tr>
              </thead>
              <tbody>
                {cartons.map((c) => (
                  <tr key={c.id} className={`cursor-pointer border-t border-slate-100 ${picked.has(c.id) ? "bg-sky-50" : ""}`} onClick={() => toggle(c.id)}>
                    <td className="px-3 py-1.5"><input type="checkbox" aria-label={`Pick ${c.lpn}`} checked={picked.has(c.id)} onChange={() => toggle(c.id)} onClick={(e) => e.stopPropagation()} /></td>
                    <td className="font-mono text-xs">{c.lpn}</td><td className="font-mono text-xs">{c.skuCode}</td><td>{c.brand}</td>
                    <td className="text-xs">{c.warehouse.split(" – ")[0]} · <span className="font-mono">{c.bin}</span></td>
                    <td className="text-right tabular-nums">{c.pieceCount}</td><td className="px-3 text-right tabular-nums">{inr(c.totalMrp)}</td>
                  </tr>
                ))}
                {cartons.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No shelved cartons. Sort a container and shelve the cartons first.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-72 flex-1"><label className="label" htmlFor="title">Lot title</label>
              <input id="title" className="input" placeholder="e.g. H&M Men Tees – Grade A" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="text-sm text-slate-600">{selection.length} cartons · {num(selPieces)} pcs · {inr(selMrp)} MRP</div>
            <Button disabled={!title || selection.length === 0} onClick={createLot}>Create lot</Button>
          </div>
          <div><label className="label" htmlFor="desc">Description for buyers (optional)</label>
            <textarea id="desc" rows={2} className="input" placeholder="Condition, fits, anything a buyer should know" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
      )}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Lot</th><th>Title</th><th>Status</th><th className="text-right">Pieces</th><th className="text-right">Total MRP</th>
              <th className="text-right">Price</th><th className="px-4">Next</th></tr>
          </thead>
          <tbody>
            {lots.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs"><Link className="underline" href={`/lots/${l.id}`}>{l.code}</Link></td>
                <td>{l.title}</td><td><Badge value={l.status} /></td>
                <td className="text-right tabular-nums">{num(l.pieceCount)}</td><td className="text-right tabular-nums">{inr(l.totalMrp)}</td>
                <td className="text-right tabular-nums">{l.priceAmount ? `${inr(l.priceAmount)} (${l.pricePct}%)` : "—"}</td>
                <td className="px-4 py-2">
                  {l.status === "DRAFT" && <Link className="text-sm font-medium underline" href={`/lots/${l.id}`}>Add photos & list →</Link>}
                  {l.status === "LISTED" && <span className="text-xs text-slate-500">{l.acceptOffers ? "Buy Now + offers" : "Buy Now"}</span>}
                  {l.status === "RESERVED" && <span className="text-xs text-amber-700">Buyer is paying</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
