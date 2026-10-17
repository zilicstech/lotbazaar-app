"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import { Badge, Button, ErrorBox, Notice } from "@/components/ui";
import { api, getSession, inr, inr2, num, when } from "@/lib/api";
import type { Claim, Order } from "@/lib/types";

const TIMELINE: { status: string; label: string; at: (o: Order) => string | null }[] = [
  { status: "PAID", label: "Paid", at: (o) => o.paidAt },
  { status: "PACKED", label: "Packed", at: (o) => o.packedAt },
  { status: "DISPATCHED", label: "Dispatched", at: (o) => o.dispatchedAt },
  { status: "DELIVERED", label: "Delivered", at: (o) => o.deliveredAt },
  { status: "CLOSED", label: "Closed", at: (o) => o.closedAt },
];

const CLAIM_TYPES = [
  { id: "SHORT", label: "Fewer pieces than the manifest" },
  { id: "WRONG_GRADE", label: "Wrong grade / quality" },
  { id: "DAMAGED", label: "Damaged in transit" },
  { id: "OTHER", label: "Something else" },
];

function OrderContent() {
  const { code, orderId } = useParams<{ code: string; orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [form, setForm] = useState({ type: "SHORT", pieces: "", note: "" });
  const [showClaim, setShowClaim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setOrder(await api<Order>(`/store/${code}/orders/${orderId}`));
    setClaim((await api<Claim[]>(`/store/${code}/orders/${orderId}/claim`))[0] ?? null);
  }, [code, orderId]);
  useEffect(() => { if (getSession()) load().catch((e) => setError(e.message)); }, [load]);

  async function act(path: string, body: unknown, ok: string) {
    setError(null);
    setNotice(null);
    try {
      await api(`/store/${code}/orders/${orderId}/${path}`, { method: "POST", body });
      setNotice(ok);
      setShowClaim(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const windowEnds = order?.deliveredAt ? new Date(new Date(order.deliveredAt).getTime() + 72 * 3_600_000) : null;
  return (
    <>
      <Header storeCode={code} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href={`/store/${code}/orders`} className="text-sm text-slate-500 text-emerald-700 hover:underline">← My orders</Link>
        <div className="mt-3"><ErrorBox message={error} /><Notice message={notice} /></div>
        {order && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">Order {order.orderNo}</h1><Badge value={order.status} />
            </div>
            <div className="card text-sm">
              <div className="font-medium">{order.lotTitle}</div>
              <div className="text-slate-500"><span className="font-mono">{order.lotCode}</span> · {num(order.pieceCount)} pcs · {inr(order.amount)} + GST = <b>{inr2(order.total)}</b></div>
              {order.invoiceNo && (
                <div className="mt-2">Tax invoice <b>{order.invoiceNo}</b> · <Link className="text-emerald-700 hover:underline" href={`/store/${code}/invoice/${order.id}`} target="_blank">View / print</Link>
                  {order.transporter && <> · shipped by {order.transporter} ({order.vehicleNo})</>}</div>
              )}
            </div>

            <ol className="card space-y-2">
              {TIMELINE.map((t) => {
                const at = t.at(order);
                return (
                  <li key={t.status} className="flex items-center gap-3 text-sm">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${at ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>{at ? "✓" : ""}</span>
                    <span className={at ? "font-medium" : "text-slate-500"}>{t.label}</span>
                    <span className="text-xs text-slate-500">{when(at)}</span>
                  </li>
                );
              })}
            </ol>

            {order.status === "PAYMENT_PENDING" && (
              <Link href={`/store/${code}/checkout/${order.id}`}><Button className="!bg-emerald-700">Complete payment</Button></Link>
            )}
            {order.status === "DISPATCHED" && (
              <div className="card space-y-2">
                <div className="font-medium">Has the lot arrived? (step 14)</div>
                <p className="text-sm text-slate-600">Confirm once the transporter delivers. Record a video while opening the cartons; you have 72 hours to report a problem.</p>
                <Button onClick={() => act("delivered", {}, "Delivery confirmed. Check the goods within 72 hours.")}>Yes, I received it</Button>
              </div>
            )}
            {order.status === "DELIVERED" && !claim && (
              <div className="card space-y-3">
                <div className="font-medium">Is everything as described? (step 15)</div>
                <p className="text-sm text-slate-600">Claim window ends {windowEnds?.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}. After that the order closes on its own.</p>
                {!showClaim ? (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => act("no-issues", {}, "Thanks! Order closed.")}>All good, close the order</Button>
                    <Button variant="secondary" onClick={() => setShowClaim(true)}>Report a problem</Button>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); act("claim", { type: form.type, pieces: Number(form.pieces || 0), note: form.note }, "Claim sent. The seller will review your video and respond."); }} className="space-y-3">
                    <fieldset className="space-y-1">
                      <legend className="label">What is wrong?</legend>
                      {CLAIM_TYPES.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 text-sm">
                          <input type="radio" name="type" checked={form.type === t.id} onChange={() => setForm({ ...form, type: t.id })} />{t.label}
                        </label>
                      ))}
                    </fieldset>
                    <div><label className="label" htmlFor="pcs">Pieces affected</label>
                      <input id="pcs" type="number" min="0" max={order.pieceCount} className="input w-32" value={form.pieces} onChange={(e) => setForm({ ...form, pieces: e.target.value })} /></div>
                    <div><label className="label" htmlFor="desc">Describe it</label>
                      <textarea id="desc" required rows={3} className="input" placeholder="Which carton, what you found. Mention that the unboxing video is on WhatsApp." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
                    <div className="flex gap-2"><Button type="submit">Send claim</Button><Button type="button" variant="ghost" onClick={() => setShowClaim(false)}>Cancel</Button></div>
                  </form>
                )}
              </div>
            )}
            {claim && (
              <div className="card text-sm">
                <div className="flex items-center gap-2 font-medium">Your claim <Badge value={claim.status} /></div>
                <p className="mt-1 italic">&ldquo;{claim.note}&rdquo;</p>
                {claim.status === "RESOLVED" && <p className="mt-2">Seller issued a credit of <b>{inr(claim.creditAmount)}</b>. {claim.resolutionNote}</p>}
                {claim.status === "REJECTED" && <p className="mt-2">Seller rejected the claim: {claim.resolutionNote}</p>}
                {claim.status === "OPEN" && <p className="mt-2 text-slate-500">Waiting for the seller.</p>}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

export default function OrderPage() {
  return <Suspense><OrderContent /></Suspense>;
}
