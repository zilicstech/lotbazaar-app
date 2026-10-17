"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import { Badge, Button, ErrorBox } from "@/components/ui";
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

  return (
    <>
      <Header storeCode={code} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold">My offers</h1>
        <p className="mb-4 text-sm text-slate-600">When the seller accepts, the lot is held for you for 24 hours: pay from here. If they counter, you can take the counter price.</p>
        <ErrorBox message={error} />
        <div className="space-y-3">
          {rows.map((o) => (
            <div key={o.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><Badge value={o.status} />
                  <Link className="font-medium underline" href={`/store/${code}/lots/${o.lotId}`}>{o.lotTitle}</Link></div>
                <div className="mt-1 text-sm">You offered <b>{inr(o.amount)}</b> (Buy Now {inr(o.lotPriceAmount)}){o.counterAmount != null && <> · seller countered <b>{inr(o.counterAmount)}</b></>}</div>
                <div className="text-xs text-slate-500">{when(o.updatedAt)}</div>
              </div>
              {o.status === "COUNTERED" && (
                <div className="flex gap-2"><Button onClick={() => act(o, "accept-counter")}>Accept {inr(o.counterAmount)}</Button><Button variant="ghost" onClick={() => act(o, "withdraw")}>Decline</Button></div>
              )}
              {o.status === "OPEN" && <Button variant="ghost" onClick={() => act(o, "withdraw")}>Withdraw</Button>}
              {o.status === "ACCEPTED" && o.orderId && (o.orderStatus === "PAYMENT_PENDING"
                ? <Link href={`/store/${code}/checkout/${o.orderId}`}><Button className="!bg-emerald-700">Pay now</Button></Link>
                : o.orderStatus === "CANCELLED"
                  ? <span className="text-sm text-slate-500">Payment window passed</span>
                  : <Link className="text-sm underline" href={`/store/${code}/orders/${o.orderId}`}>Paid · track order →</Link>)}
            </div>
          ))}
          {rows.length === 0 && <div className="card text-center text-sm text-slate-500">No offers yet. Lots marked &ldquo;Offers welcome&rdquo; accept them.</div>}
        </div>
      </main>
    </>
  );
}

export default function OffersPage() {
  return <Suspense><OffersContent /></Suspense>;
}
