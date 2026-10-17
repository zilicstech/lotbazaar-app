"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, ErrorBox } from "@/components/ui";
import { api, inr, num } from "@/lib/api";
import type { Order } from "@/lib/types";

const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");

export default function OrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<Order[]>("/seller/orders").then(setRows).catch((e) => setError(e.message)); }, []);

  return (
    <Shell title="Orders" help={<>Every sale and where it is: <b>awaiting payment</b> → paid → picking → packed → dispatched → delivered → closed. The warehouse moves orders forward in <Link className="underline" href="/fulfil">Pick, pack &amp; dispatch</Link>.</>}>
      <ErrorBox message={error} />
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Order</th><th>Lot</th><th>Buyer</th><th>Via</th><th className="text-right">Price</th><th className="text-right">GST</th>
              <th className="text-right">Total</th><th className="px-3">Status</th><th className="px-4">Invoice / claim</th></tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2"><div className="font-mono text-xs">{o.orderNo}</div><div className="text-xs text-slate-500">{when(o.createdAt)}</div></td>
                <td><div>{o.lotTitle}</div><div className="font-mono text-xs text-slate-500">{o.lotCode} · {num(o.pieceCount)} pcs</div></td>
                <td><div>{o.buyerBusiness}</div><div className="text-xs text-slate-500">{o.buyerCity} · {o.buyerGstin}</div></td>
                <td className="text-xs">{o.source === "OFFER" ? "Offer" : "Buy Now"}</td>
                <td className="text-right tabular-nums">{inr(o.amount)}</td>
                <td className="text-right text-xs tabular-nums">{o.igst > 0 ? `IGST ${inr(o.igst)}` : `C+S ${inr(o.cgst + o.sgst)}`}</td>
                <td className="text-right font-medium tabular-nums">{inr(o.total)}</td>
                <td className="px-3"><Badge value={o.status} />
                  {o.status === "PAYMENT_PENDING" && o.holdExpiresAt && <div className="mt-1 text-[11px] text-slate-500">hold until {when(o.holdExpiresAt)}</div>}</td>
                <td className="px-4 text-xs">
                  {o.invoiceNo && <Link className="underline" href={`/invoice/${o.id}`} target="_blank">{o.invoiceNo}</Link>}
                  {o.claimStatus && <div className="mt-1">Claim: <Badge value={o.claimStatus} /></div>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
