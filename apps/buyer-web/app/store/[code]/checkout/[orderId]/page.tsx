"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button, ErrorBox } from "@/components/ui";
import { api, getSession, inr2, num } from "@/lib/api";
import type { Order } from "@/lib/types";
import { useCountdown } from "@/lib/useCountdown";

function CheckoutContent() {
  const { code, orderId } = useParams<{ code: string; orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (getSession()) api<Order>(`/store/${code}/orders/${orderId}`).then(setOrder).catch((e) => setError(e.message));
  }, [code, orderId]);
  const countdown = useCountdown(order?.holdExpiresAt);
  const expired = countdown != null && countdown.left === 0;

  return (
    <>
      <Header storeCode={code} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold">Checkout</h1>
        <p className="mb-4 text-sm text-slate-600">Step 9–10: review the bill, then pay. The lot is held only for you until the timer runs out.</p>
        <ErrorBox message={error} />
        {order && (
          <div className="card space-y-4">
            <div>
              <div className="font-semibold">{order.lotTitle}</div>
              <div className="text-sm text-slate-500"><span className="font-mono">{order.lotCode}</span> · {num(order.pieceCount)} pieces · order <span className="font-mono">{order.orderNo}</span>
                {order.source === "OFFER" && " · your accepted offer"}</div>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr><td className="py-1">Lot price</td><td className="text-right tabular-nums">{inr2(order.amount)}</td></tr>
                {order.igst > 0
                  ? <tr><td className="py-1">IGST {order.gstRate}% <span className="text-xs text-slate-500">(seller in another state)</span></td><td className="text-right tabular-nums">{inr2(order.igst)}</td></tr>
                  : <>
                      <tr><td className="py-1">CGST {order.gstRate / 2}%</td><td className="text-right tabular-nums">{inr2(order.cgst)}</td></tr>
                      <tr><td className="py-1">SGST {order.gstRate / 2}% <span className="text-xs text-slate-500">(same state as seller)</span></td><td className="text-right tabular-nums">{inr2(order.sgst)}</td></tr>
                    </>}
                <tr className="border-t border-slate-300 text-base font-semibold"><td className="py-2">Total to pay</td><td className="text-right tabular-nums">{inr2(order.total)}</td></tr>
              </tbody>
            </table>
            <p className="text-xs text-slate-500">You can claim this GST as input tax credit with your GSTIN {order.buyerGstin}.</p>
            {order.status === "PAYMENT_PENDING" ? (
              <>
                <div className={`rounded-md px-3 py-2 text-sm ${expired ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-900"}`}>
                  {expired ? "Your hold has expired. The lot goes back on sale shortly." : <>Lot held for you for <b className="tabular-nums">{countdown?.text}</b></>}
                </div>
                <Link href={`/store/${code}/pay/${order.id}`} aria-disabled={expired} className={expired ? "pointer-events-none" : ""}>
                  <Button disabled={expired} className="w-full !bg-emerald-700 py-3 hover:!bg-emerald-600">Pay {inr2(order.total)}</Button>
                </Link>
              </>
            ) : (
              <div className="text-sm">This order is already {order.status.toLowerCase().replace("_", " ")}. <Link className="underline" href={`/store/${code}/orders/${order.id}`}>Track it</Link></div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

export default function CheckoutPage() {
  return <Suspense><CheckoutContent /></Suspense>;
}
