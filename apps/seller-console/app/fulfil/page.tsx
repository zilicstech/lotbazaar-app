"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, ErrorBox, statusLabel } from "@/components/ui";
import { EmptyRow, ListTabs, ListToolbar, Pagination, SortTh, useList } from "@/components/list";
import { api, num } from "@/lib/api";
import type { WorkOrder } from "@/lib/types";

const NEXT: Record<string, string> = { PAID: "Start picking", PICKING: "Continue picking", PACKED: "Dispatch", DISPATCHED: "View" };
const ago = (s: string | null) => {
  if (!s) return "";
  const h = Math.floor((Date.now() - new Date(s).getTime()) / 3_600_000);
  return h < 1 ? "just now" : h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
};

export default function FulfilPage() {
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<WorkOrder[]>("/seller/wh/orders").then(setRows).catch((e) => setError(e.message)); }, []);

  const list = useList(rows, {
    search: (o) => [o.orderNo, o.lotCode, o.lotTitle, o.buyerBusiness, o.buyerCity, o.invoiceNo, o.vehicleNo],
    filters: {
      warehouse: { label: "Warehouse", value: (o) => o.warehouse },
      city: { label: "Ship to", value: (o) => o.buyerCity },
    },
    tabs: [
      { key: "pick", label: "To pick", match: (o) => o.status === "PAID" || o.status === "PICKING" },
      { key: "dispatch", label: "To dispatch", match: (o) => o.status === "PACKED" },
      { key: "done", label: "Dispatched", match: (o) => o.status === "DISPATCHED" },
      { key: "all", label: "All", match: () => true },
    ],
    sorts: { paid: (o) => o.paidAt, order: (o) => o.orderNo, cartons: (o) => o.cartons, status: (o) => statusLabel(o.status) },
    defaultSort: { key: "paid", dir: "asc" },
  });

  return (
    <Shell title="Pick, pack & dispatch"
      help={<>Paid orders, oldest first. Open one to <b>pick</b> by scanning each carton at its bin, <b>pack</b> and weigh, then <b>dispatch</b>; the GST invoice and e-way bill are created at dispatch.</>}>
      <ErrorBox message={error} />
      <ListTabs list={list} />
      <ListToolbar list={list} placeholder="Search order, lot, buyer, invoice, vehicle…" />
      <div className="card overflow-x-auto !p-0">
        <table className="data-table">
          <thead>
            <tr><SortTh list={list} k="order">Order</SortTh><th>Lot</th><th>Ship to</th><th>From</th>
              <SortTh list={list} k="cartons" className="num">Picked</SortTh><SortTh list={list} k="status">Status</SortTh><SortTh list={list} k="paid">Paid</SortTh><th /></tr>
          </thead>
          <tbody>
            {list.rows.map((o) => (
              <tr key={o.id}>
                <td className="font-mono text-xs font-medium text-slate-900">{o.orderNo}</td>
                <td><div className="font-medium">{o.lotTitle}</div><div className="muted">{num(o.pieceCount)} pcs · {o.expectedKg} kg</div></td>
                <td>{o.buyerBusiness}<div className="muted">{o.buyerCity}</div></td>
                <td className="text-xs text-slate-600">{o.warehouse}</td>
                <td className="num">
                  <div className="font-medium">{o.picked}/{o.cartons}</div>
                  <div className="ml-auto mt-1 h-1.5 w-16 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(100 * o.picked) / Math.max(1, o.cartons)}%` }} /></div>
                </td>
                <td><Badge value={o.status} /></td>
                <td className="text-xs text-slate-600">{ago(o.paidAt)}</td>
                <td className="text-right"><Link className="whitespace-nowrap text-sm font-medium text-emerald-700 hover:underline" href={`/fulfil/${o.id}`}>{NEXT[o.status]} →</Link></td>
              </tr>
            ))}
            <EmptyRow list={list} cols={8} empty="Nothing to pick. Paid orders appear here." />
          </tbody>
        </table>
        <Pagination list={list} />
      </div>
    </Shell>
  );
}
