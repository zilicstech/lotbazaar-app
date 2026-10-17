"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox, Notice } from "@/components/ui";
import { api, num } from "@/lib/api";
import type { PickLine, WorkOrder } from "@/lib/types";

const STAGES = [
  { key: "PICK", label: "1. Pick", done: (s: string) => ["PACKED", "DISPATCHED"].includes(s) },
  { key: "PACK", label: "2. Pack & weigh", done: (s: string) => ["PACKED", "DISPATCHED"].includes(s) },
  { key: "SHIP", label: "3. Dispatch", done: (s: string) => s === "DISPATCHED" },
];

function FulfilContent() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [lines, setLines] = useState<PickLine[]>([]);
  const [lpn, setLpn] = useState("");
  const [kg, setKg] = useState("");
  const [weightWarning, setWeightWarning] = useState<string | null>(null);
  const [ship, setShip] = useState({ transporter: "", vehicleNo: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const scanInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setOrder(await api<WorkOrder>(`/seller/wh/orders/${id}`));
    setLines(await api<PickLine[]>(`/seller/wh/orders/${id}/picks`));
  }, [id]);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  async function post(path: string, body: unknown, ok: string) {
    setError(null);
    setNotice(null);
    try {
      await api(`/seller/wh/orders/${id}/${path}`, { method: "POST", body });
      setNotice(ok);
      await load();
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      if (path === "pack" && msg.includes("% off")) setWeightWarning(msg);
      else setError(msg);
      return false;
    }
  }

  async function scan(e: React.FormEvent) {
    e.preventDefault();
    const code = lpn.trim().toUpperCase();
    setLpn("");
    await post("scan", { lpn: code }, `${code} picked ✓`);
    scanInput.current?.focus();
  }

  if (!order) return <Shell title="Order"><ErrorBox message={error} /></Shell>;
  const s = order.status;
  const allPicked = lines.length > 0 && lines.every((l) => l.picked);
  return (
    <Shell title={`Order ${order.orderNo}`}
      help={s === "PAID" || s === "PICKING" ? <>Step 11. Go to each bin on the list, find the carton and scan its label. A carton from another order is rejected, so the wrong goods never ship.</>
        : s === "PACKED" ? <>Step 13. Hand over to the transporter. Dispatching creates the GST tax invoice (and an e-way bill above ₹50,000) and removes the cartons from stock.</>
        : <>Dispatched. The buyer confirms delivery from their side.</>}
      actions={<Link href="/fulfil"><Button variant="secondary">Back to queue</Button></Link>}>
      <ErrorBox message={error} />
      <Notice message={notice} />
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
        <Badge value={s} />
        <span>{order.lotTitle} · {num(order.pieceCount)} pcs · {order.cartons} cartons</span>
        <span className="text-slate-500">Ship to {order.buyerBusiness}, {order.buyerCity} · from {order.warehouse}</span>
      </div>
      <ol className="mb-6 grid grid-cols-3 gap-2 text-center text-sm">
        {STAGES.map((st) => (
          <li key={st.key} className={`rounded-md border px-2 py-2 ${st.done(s) ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white"}`}>
            {st.done(s) ? "✓ " : ""}{st.label}
          </li>
        ))}
      </ol>

      {(s === "PAID" || s === "PICKING") && (
        <form onSubmit={scan} className="card mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1"><label className="label" htmlFor="scan">Scan carton label</label>
            <input id="scan" ref={scanInput} autoFocus className="input font-mono uppercase" placeholder="LPN-…" value={lpn} onChange={(e) => setLpn(e.target.value)} /></div>
          <Button type="submit" disabled={!lpn}>Pick</Button>
        </form>
      )}

      <div className="card mb-4 overflow-x-auto p-0">
        <table className="data-table">
          <thead>
            <tr><th className="px-4 py-2">Bin</th><th>Carton</th><th>Stock type</th><th className="text-right">Pieces</th><th className="text-right">Weight</th><th className="px-4">Picked</th></tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.lpn} className={`border-t border-slate-100 ${l.picked ? "bg-emerald-50" : ""}`}>
                <td className="px-4 py-2 font-mono font-semibold">{l.bin}</td>
                <td className="font-mono text-xs">{l.lpn}
                  {!l.picked && (s === "PAID" || s === "PICKING") && <button type="button" className="ml-2 text-[11px] text-slate-500 text-emerald-700 hover:underline" onClick={() => { setLpn(l.lpn); scanInput.current?.focus(); }}>fill</button>}
                </td>
                <td className="font-mono text-xs">{l.skuCode}</td>
                <td className="text-right tabular-nums">{l.pieceCount}</td><td className="text-right tabular-nums">{l.weightKg} kg</td>
                <td className="px-4">{l.picked ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {s === "PICKING" && allPicked && (
        <form onSubmit={async (e) => { e.preventDefault(); setWeightWarning(null); await post("pack", { kg: Number(kg), confirm: false }, "Packed. Ready to dispatch."); }} className="card mb-4 space-y-3">
          <h2 className="font-semibold">Pack &amp; weigh (step 12)</h2>
          <p className="text-sm text-slate-600">All cartons picked. Weigh the whole consignment. Expected from sorting: <b>{order.expectedKg} kg</b> (±5% allowed).</p>
          <div className="flex flex-wrap items-end gap-3">
            <div><label className="label" htmlFor="kg">Packed weight (kg)</label>
              <input id="kg" required type="number" step="0.1" min="0.1" className="input w-32" value={kg} onChange={(e) => setKg(e.target.value)} /></div>
            <Button type="submit">Save weight & pack</Button>
          </div>
          {weightWarning && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {weightWarning}
              <div className="mt-2"><Button type="button" variant="secondary" onClick={() => post("pack", { kg: Number(kg), confirm: true }, "Packed with weight override.").then((ok) => ok && setWeightWarning(null))}>I re-weighed it, the weight is right</Button></div>
            </div>
          )}
        </form>
      )}

      {s === "PACKED" && (
        <form onSubmit={(e) => { e.preventDefault(); post("dispatch", ship, "Dispatched. Invoice generated."); }} className="card mb-4 space-y-3">
          <h2 className="font-semibold">Dispatch (step 13)</h2>
          <p className="text-sm text-slate-600">Packed at {order.dispatchKg} kg. Enter who is carrying it.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div><label className="label" htmlFor="tr">Transporter</label>
              <input id="tr" required className="input w-56" placeholder="VRL Logistics" value={ship.transporter} onChange={(e) => setShip({ ...ship, transporter: e.target.value })} /></div>
            <div><label className="label" htmlFor="veh">Vehicle number</label>
              <input id="veh" required className="input w-40 uppercase" placeholder="DL01AB1234" value={ship.vehicleNo} onChange={(e) => setShip({ ...ship, vehicleNo: e.target.value })} /></div>
            <Button type="submit">Dispatch & create invoice</Button>
          </div>
        </form>
      )}

      {s === "DISPATCHED" && order.invoiceNo && (
        <div className="card text-sm">
          Dispatched via <b>{order.transporter}</b> ({order.vehicleNo}). Tax invoice <b>{order.invoiceNo}</b>.{" "}
          <Link className="font-medium text-emerald-700 hover:underline" href={`/invoice/${order.id}`} target="_blank">Open / print invoice</Link>
        </div>
      )}
    </Shell>
  );
}

export default function FulfilOrderPage() {
  return <Suspense><FulfilContent /></Suspense>;
}
