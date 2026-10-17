"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Header from "@/components/Header";
import { Badge, ErrorBox } from "@/components/ui";
import { api, getSession, inr, num, when } from "@/lib/api";
import type { Order } from "@/lib/types";

const NEXT: Record<string, string> = {
  PAYMENT_PENDING: "Pay now", DISPATCHED: "Confirm delivery", DELIVERED: "Close or raise claim",
};

function OrdersPageContent() {
  const { code } = useParams<{ code: string }>();
  const [rows, setRows] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (getSession()) api<Order[]>(`/store/${code}/orders`).then(setRows).catch((e) => setError(e.message));
  }, [code]);

  return (
    <>
      <Header storeCode={code} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold">My orders</h1>
        <ErrorBox message={error} />
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Order</th><th>Lot</th><th className="text-right">Pieces</th><th className="text-right">Total (incl. GST)</th><th className="px-3">Status</th><th className="px-4" /></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-2"><div className="font-mono text-xs">{o.orderNo}</div><div className="text-xs text-slate-500">{when(o.createdAt)}</div></td>
                  <td><div>{o.lotTitle}</div><div className="font-mono text-xs text-slate-500">{o.lotCode}</div></td>
                  <td className="text-right tabular-nums">{num(o.pieceCount)}</td><td className="text-right tabular-nums">{inr(o.total)}</td>
                  <td className="px-3"><Badge value={o.status} /></td>
                  <td className="px-4 text-right">
                    <Link className="font-medium underline" href={o.status === "PAYMENT_PENDING" ? `/store/${code}/checkout/${o.id}` : `/store/${code}/orders/${o.id}`}>
                      {NEXT[o.status] ?? "Details"} →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

// useParams needs a Suspense boundary under cacheComponents.
export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersPageContent />
    </Suspense>
  );
}
