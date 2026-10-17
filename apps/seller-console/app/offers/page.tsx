"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox, Notice } from "@/components/ui";
import { ListTabs, ListToolbar, Pagination, useList } from "@/components/list";
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

  const list = useList(rows, {
    search: (o) => [o.lotCode, o.lotTitle, o.buyerBusiness, o.buyerName, o.buyerCity, o.note],
    filters: {
      city: { label: "Buyer city", value: (o) => o.buyerCity },
      lot: { label: "Lot", value: (o) => o.lotCode },
    },
    tabs: [
      { key: "action", label: "Needs reply", match: (o) => o.status === "OPEN" },
      { key: "waiting", label: "Countered", match: (o) => o.status === "COUNTERED" },
      { key: "accepted", label: "Accepted", match: (o) => o.status === "ACCEPTED" },
      { key: "closed", label: "Rejected / expired", match: (o) => o.status === "REJECTED" || o.status === "EXPIRED" },
      { key: "all", label: "All", match: () => true },
    ],
    sorts: { newest: (o) => o.updatedAt, amount: (o) => o.amount },
    defaultSort: { key: "newest", dir: "desc" },
    pageSize: 20,
  });

  const pct = (o: Offer, v: number) => `${((100 * v) / o.lotTotalMrp).toFixed(1)}% of MRP`;
  return (
    <Shell title="Offers" help={<>Step 9b. Buyers can offer less than the Buy Now price on lots that accept offers. <b>Accept</b> holds the lot for that buyer for 24 hours to pay. <b>Counter</b> proposes a price in between; the buyer can take it. Other offers on a sold lot expire.</>}>
      <ErrorBox message={error} />
      <Notice message={notice} />
      <ListTabs list={list} />
      <ListToolbar list={list} placeholder="Search lot, buyer, city, note…">
        <select aria-label="Sort" className="input w-auto" value={`${list.state.sort}:${list.state.dir}`}
          onChange={(e) => { const [k, d] = e.target.value.split(":"); list.setSort(k, d as "asc" | "desc"); }}>
          <option value="newest:desc">Newest first</option><option value="newest:asc">Oldest first</option>
          <option value="amount:desc">Highest offer</option><option value="amount:asc">Lowest offer</option>
        </select>
      </ListToolbar>
      <div className="space-y-3">
        {list.rows.map((o) => (
          <div key={o.id} className="card flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><Badge value={o.status} /><span className="font-semibold text-slate-900">{o.lotTitle}</span><span className="font-mono text-xs text-slate-500">{o.lotCode}</span><span className="muted">· {new Date(o.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></div>
              <div className="mt-1.5 text-sm text-slate-700">
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
        {list.total === 0 && (
          <div className="card py-10 text-center text-sm text-slate-500">
            {list.unfiltered === 0 ? "No offers yet. Buyers can make offers on lots that accept them." : <>Nothing here. <button type="button" className="font-medium text-emerald-700 hover:underline" onClick={() => { list.clear(); list.setTab("all"); }}>Show all offers</button></>}
          </div>
        )}
      </div>
      {list.total > 0 && <div className="card mt-3 !p-0"><Pagination list={list} /></div>}
    </Shell>
  );
}
