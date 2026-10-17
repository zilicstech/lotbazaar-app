"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox, Notice } from "@/components/ui";
import { api, inr } from "@/lib/api";
import type { Offer } from "@/lib/types";

export default function OffersPage() {
  const [rows, setRows] = useState<Offer[]>([]);
  const [counter, setCounter] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(() => api<Offer[]>("/seller/offers").then(setRows).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function act(o: Offer, action: "accept" | "counter" | "reject") {
    setError(null);
    setNotice(null);
    try {
      await api(`/seller/offers/${o.id}/${action}`, { method: "POST", body: action === "counter" ? { amount: Number(counter[o.id]) } : {} });
      setNotice(action === "accept" ? `Accepted. ${o.buyerBusiness} has 24 hours to pay ${inr(o.amount)} + GST; the lot is held for them.`
        : action === "counter" ? `Counter of ${inr(Number(counter[o.id]))} sent to ${o.buyerBusiness}.` : "Offer rejected.");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const pct = (o: Offer, v: number) => `${((100 * v) / o.lotTotalMrp).toFixed(1)}% of MRP`;
  return (
    <Shell title="Offers" help={<>Step 9b. Buyers can offer less than the Buy Now price on lots that accept offers. <b>Accept</b> holds the lot for that buyer for 24 hours to pay. <b>Counter</b> proposes a price in between; the buyer can take it. Other offers on a sold lot expire.</>}>
      <ErrorBox message={error} />
      <Notice message={notice} />
      <div className="space-y-3">
        {rows.map((o) => (
          <div key={o.id} className="card flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><Badge value={o.status} /><span className="font-medium">{o.lotTitle}</span><span className="font-mono text-xs text-slate-500">{o.lotCode}</span></div>
              <div className="mt-1 text-sm">
                <b>{o.buyerBusiness}</b> ({o.buyerCity}) offers <b>{inr(o.amount)}</b> <span className="text-slate-500">({pct(o, o.amount)})</span>
                {" "}vs Buy Now {inr(o.lotPriceAmount)}
                {o.counterAmount != null && <> · you countered <b>{inr(o.counterAmount)}</b></>}
              </div>
              {o.note && <div className="mt-1 text-sm italic text-slate-600">&ldquo;{o.note}&rdquo;</div>}
            </div>
            {o.status === "OPEN" && (
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => act(o, "accept")}>Accept</Button>
                <input aria-label="Counter amount" type="number" className="input w-28" placeholder="₹ counter" value={counter[o.id] ?? ""} onChange={(e) => setCounter({ ...counter, [o.id]: e.target.value })} />
                <Button variant="secondary" disabled={!counter[o.id]} onClick={() => act(o, "counter")}>Counter</Button>
                <Button variant="ghost" onClick={() => act(o, "reject")}>Reject</Button>
              </div>
            )}
            {o.status === "COUNTERED" && <div className="text-sm text-slate-500">Waiting for the buyer</div>}
          </div>
        ))}
        {rows.length === 0 && <div className="card text-center text-sm text-slate-500">No offers yet.</div>}
      </div>
    </Shell>
  );
}
