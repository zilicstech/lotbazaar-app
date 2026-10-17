"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox, statusLabel } from "@/components/ui";
import { EmptyRow, exportCsv, ListTabs, ListToolbar, Pagination, SortTh, useList } from "@/components/list";
import { api, inr, num } from "@/lib/api";
import type { Order } from "@/lib/types";

const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");
const TO_FULFIL = ["PAID", "PICKING", "PACKED"];

export default function OrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<Order[]>("/seller/orders").then(setRows).catch((e) => setError(e.message)); }, []);

  const list = useList(rows, {
    search: (o) => [o.orderNo, o.lotCode, o.lotTitle, o.buyerBusiness, o.buyerName, o.buyerCity, o.buyerGstin, o.invoiceNo],
    filters: {
      status: { label: "Status", value: (o) => o.status, format: statusLabel },
      source: { label: "Sold via", value: (o) => (o.source === "OFFER" ? "Offer" : "Buy Now") },
      city: { label: "Buyer city", value: (o) => o.buyerCity },
      claim: { label: "Claim", value: (o) => (o.claimStatus ? statusLabel(o.claimStatus) : "No claim") },
    },
    tabs: [
      { key: "all", label: "All", match: () => true },
      { key: "payment", label: "Awaiting payment", match: (o) => o.status === "PAYMENT_PENDING" },
      { key: "fulfil", label: "To fulfil", match: (o) => TO_FULFIL.includes(o.status) },
      { key: "transit", label: "In transit", match: (o) => o.status === "DISPATCHED" },
      { key: "delivered", label: "Delivered", match: (o) => o.status === "DELIVERED" || o.status === "CLOSED" },
      { key: "claims", label: "With claim", match: (o) => !!o.claimStatus },
    ],
    sorts: { order: (o) => o.orderNo, placed: (o) => o.createdAt, total: (o) => o.total, buyer: (o) => o.buyerBusiness, status: (o) => o.status },
    defaultSort: { key: "placed", dir: "desc" },
  });

  const csv = () => exportCsv("orders", list.all, [
    ["Order", (o) => o.orderNo], ["Placed", (o) => o.createdAt], ["Lot", (o) => o.lotCode], ["Lot title", (o) => o.lotTitle],
    ["Pieces", (o) => o.pieceCount], ["Buyer", (o) => o.buyerBusiness], ["City", (o) => o.buyerCity], ["GSTIN", (o) => o.buyerGstin],
    ["Via", (o) => o.source], ["Taxable", (o) => o.amount], ["CGST", (o) => o.cgst], ["SGST", (o) => o.sgst], ["IGST", (o) => o.igst],
    ["Total", (o) => o.total], ["Status", (o) => statusLabel(o.status)], ["Invoice", (o) => o.invoiceNo], ["Claim", (o) => o.claimStatus],
  ]);

  return (
    <Shell title="Orders" actions={<Button variant="secondary" onClick={csv} disabled={!list.total}>Export CSV</Button>}
      help={<>Every sale from checkout to closing. The warehouse moves paid orders forward in <Link className="font-medium text-slate-700 underline" href="/fulfil">Pick, pack &amp; dispatch</Link>.</>}>
      <ErrorBox message={error} />
      <ListTabs list={list} />
      <ListToolbar list={list} placeholder="Search order no, lot, buyer, GSTIN, invoice…" />
      <div className="card overflow-x-auto !p-0">
        <table className="data-table">
          <thead>
            <tr><SortTh list={list} k="order">Order</SortTh><th>Lot</th><SortTh list={list} k="buyer">Buyer</SortTh><th>Via</th>
              <th className="num">Taxable</th><th className="num">GST</th><SortTh list={list} k="total" className="num">Total</SortTh>
              <SortTh list={list} k="status">Status</SortTh><th>Invoice / claim</th></tr>
          </thead>
          <tbody>
            {list.rows.map((o) => (
              <tr key={o.id}>
                <td><div className="font-mono text-xs font-medium text-slate-900">{o.orderNo}</div><div className="muted">{when(o.createdAt)}</div></td>
                <td><div className="font-medium">{o.lotTitle}</div><div className="muted font-mono">{o.lotCode} · {num(o.pieceCount)} pcs</div></td>
                <td><div>{o.buyerBusiness}</div><div className="muted">{o.buyerCity} · <span className="font-mono">{o.buyerGstin}</span></div></td>
                <td className="text-xs text-slate-600">{o.source === "OFFER" ? "Offer" : "Buy Now"}</td>
                <td className="num">{inr(o.amount)}</td>
                <td className="num text-xs text-slate-600">{o.igst > 0 ? <>IGST {inr(o.igst)}</> : <>C+S {inr(o.cgst + o.sgst)}</>}</td>
                <td className="num font-semibold">{inr(o.total)}</td>
                <td><Badge value={o.status} />
                  {o.status === "PAYMENT_PENDING" && o.holdExpiresAt && <div className="muted mt-1">hold until {when(o.holdExpiresAt)}</div>}</td>
                <td className="text-xs">
                  {o.invoiceNo && <Link className="font-mono text-emerald-700 hover:underline" href={`/invoice/${o.id}`} target="_blank">{o.invoiceNo}</Link>}
                  {o.claimStatus && <div className="mt-1 flex items-center gap-1">Claim <Badge value={o.claimStatus} /></div>}
                </td>
              </tr>
            ))}
            <EmptyRow list={list} cols={9} empty="No orders yet. They appear here when a buyer checks out." />
          </tbody>
        </table>
        <Pagination list={list} />
      </div>
    </Shell>
  );
}
