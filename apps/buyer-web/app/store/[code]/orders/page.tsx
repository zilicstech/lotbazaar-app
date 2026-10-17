"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Header from "@/components/Header";
import { Badge, ErrorBox } from "@/components/ui";
import { EmptyRow, ListTabs, ListToolbar, Pagination, SortTh, useList } from "@/components/list";
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

  const list = useList(rows, {
    search: (o) => [o.orderNo, o.lotCode, o.lotTitle, o.invoiceNo],
    tabs: [
      { key: "all", label: "All", match: () => true },
      { key: "pay", label: "To pay", match: (o) => o.status === "PAYMENT_PENDING" },
      { key: "way", label: "On the way", match: (o) => ["PAID", "PICKING", "PACKED", "DISPATCHED"].includes(o.status) },
      { key: "delivered", label: "Delivered", match: (o) => o.status === "DELIVERED" || o.status === "CLOSED" },
    ],
    sorts: { placed: (o) => o.createdAt, total: (o) => o.total, pieces: (o) => o.pieceCount },
    defaultSort: { key: "placed", dir: "desc" },
  });

  return (
    <>
      <Header storeCode={code} />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">My orders</h1>
        <ErrorBox message={error} />
        <ListTabs list={list} />
        <ListToolbar list={list} placeholder="Search order no, lot, invoice…" />
        <div className="card overflow-x-auto !p-0">
          <table className="data-table">
            <thead>
              <tr><SortTh list={list} k="placed">Order</SortTh><th>Lot</th><SortTh list={list} k="pieces" className="num">Pieces</SortTh>
                <SortTh list={list} k="total" className="num">Total (incl. GST)</SortTh><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {list.rows.map((o) => (
                <tr key={o.id}>
                  <td><div className="font-mono text-xs font-medium text-slate-900">{o.orderNo}</div><div className="muted">{when(o.createdAt)}</div></td>
                  <td><div className="font-medium">{o.lotTitle}</div><div className="muted font-mono">{o.lotCode}</div></td>
                  <td className="num">{num(o.pieceCount)}</td><td className="num font-semibold">{inr(o.total)}</td>
                  <td><Badge value={o.status} /></td>
                  <td className="text-right">
                    <Link className={o.status === "PAYMENT_PENDING" ? "inline-flex rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700" : "whitespace-nowrap text-sm font-medium text-emerald-700 hover:underline"}
                      href={o.status === "PAYMENT_PENDING" ? `/store/${code}/checkout/${o.id}` : `/store/${code}/orders/${o.id}`}>
                      {NEXT[o.status] ?? "Details"} →
                    </Link>
                  </td>
                </tr>
              ))}
              <EmptyRow list={list} cols={6} empty="No orders yet. Buy a lot to see it here." />
            </tbody>
          </table>
          <Pagination list={list} />
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
