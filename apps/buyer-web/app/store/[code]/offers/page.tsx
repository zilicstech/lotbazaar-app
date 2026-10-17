"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import { Badge, Button, ErrorBox } from "@/components/ui";
import { ListTabs, ListToolbar, Pagination, useList } from "@/components/list";
import { api, getSession, inr, when } from "@/lib/api";
import type { Offer } from "@/lib/types";

function OffersContent() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<Offer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api<Offer[]>(`/store/${code}/offers`).then(setRows).catch((e) => setError(e.message)), [code]);
  useEffect(() => { if (getSession()) load(); }, [load]);

  async function act(o: Offer, action: "accept-counter" | "withdraw") {
    setError(null);
    try {
      const r = await api<Offer>(`/store/${code}/offers/${o.id}/${action}`, { method: "POST" });
      if (action === "accept-counter" && r.orderId) router.push(`/store/${code}/checkout/${r.orderId}`);
      else load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const list = useList(rows, {
    search: (o) => [o.lotCode, o.lotTitle, o.note],
    tabs: [
      { key: "all", label: "All", match: () => true },
      { key: "action", label: "Needs your reply", match: (o) => o.status === "COUNTERED" || (o.status === "ACCEPTED" && o.orderStatus === "PAYMENT_PENDING") },
      { key: "open", label: "Waiting for seller", match: (o) => o.status === "OPEN" },
      { key: "closed", label: "Closed", match: (o) => ["REJECTED", "EXPIRED"].includes(o.status) || (o.status === "ACCEPTED" && o.orderStatus !== "PAYMENT_PENDING") },
    ],
    sorts: { updated: (o) => o.updatedAt },
    defaultSort: { key: "updated", dir: "desc" },
    pageSize: 20,
  });

  return (
    <>
      <Header storeCode={code} />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">My offers</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">When the seller accepts, the lot is held for you for 24 hours: pay from here. If they counter, you can take the counter price.</p>
        <ErrorBox message={error} />
        <ListTabs list={list} />
        <ListToolbar list={list} placeholder="Search lot title or code…" />
        <div className="space-y-3">
          {list.rows.map((o) => (
            <div key={o.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><Badge value={o.status} />
                  <Link className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline" href={`/store/${code}/lots/${o.lotId}`}>{o.lotTitle}</Link></div>
                <div className="mt-1.5 text-sm text-slate-700">You offered <b>{inr(o.amount)}</b> (Buy Now {inr(o.lotPriceAmount)}){o.counterAmount != null && <> · seller countered <b>{inr(o.counterAmount)}</b></>}</div>
                <div className="text-xs text-slate-500">{when(o.updatedAt)}</div>
              </div>
              {o.status === "COUNTERED" && (
                <div className="flex gap-2"><Button onClick={() => act(o, "accept-counter")}>Accept {inr(o.counterAmount)}</Button><Button variant="ghost" onClick={() => act(o, "withdraw")}>Decline</Button></div>
              )}
              {o.status === "OPEN" && <Button variant="ghost" onClick={() => act(o, "withdraw")}>Withdraw</Button>}
              {o.status === "ACCEPTED" && o.orderId && (o.orderStatus === "PAYMENT_PENDING"
                ? <Link href={`/store/${code}/checkout/${o.orderId}`}><Button>Pay now</Button></Link>
                : o.orderStatus === "CANCELLED"
                  ? <span className="text-sm text-slate-500">Payment window passed</span>
                  : <Link className="text-sm font-medium text-emerald-700 hover:underline" href={`/store/${code}/orders/${o.orderId}`}>Paid · track order →</Link>)}
            </div>
          ))}
          {list.total === 0 && (
            <div className="card py-10 text-center text-sm text-slate-500">
              {rows.length === 0 ? <>No offers yet. Lots marked &ldquo;Takes offers&rdquo; accept them.</>
                : <>Nothing here. <button type="button" className="font-medium text-emerald-700 hover:underline" onClick={() => { list.clear(); list.setTab("all"); }}>Show all offers</button></>}
            </div>
          )}
        </div>
        {list.total > 0 && <div className="card mt-3 !p-0"><Pagination list={list} /></div>}
      </main>
    </>
  );
}

export default function OffersPage() {
  return <Suspense><OffersContent /></Suspense>;
}
