"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, ErrorBox } from "@/components/ui";
import { api, num } from "@/lib/api";
import type { WorkOrder } from "@/lib/types";

const NEXT: Record<string, string> = { PAID: "Start picking", PICKING: "Continue picking", PACKED: "Dispatch", DISPATCHED: "View" };

export default function FulfilPage() {
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<WorkOrder[]>("/seller/wh/orders").then(setRows).catch((e) => setError(e.message)); }, []);

  return (
    <Shell title="Pick, pack & dispatch" help={<>Steps 11–13. Paid orders appear here. Open one: <b>pick</b> by scanning each carton at its bin, <b>pack</b> and weigh, then <b>dispatch</b> with the transporter details. The GST invoice and e-way bill are created at dispatch.</>}>
      <ErrorBox message={error} />
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Order</th><th>Lot</th><th>Ship to</th><th>From</th><th className="text-right">Cartons picked</th><th className="px-3">Status</th><th className="px-4" /></tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs">{o.orderNo}</td>
                <td><div>{o.lotTitle}</div><div className="text-xs text-slate-500">{num(o.pieceCount)} pcs · {o.expectedKg} kg</div></td>
                <td>{o.buyerBusiness}<div className="text-xs text-slate-500">{o.buyerCity}</div></td>
                <td className="text-xs">{o.warehouse}</td>
                <td className="text-right tabular-nums">{o.picked}/{o.cartons}</td>
                <td className="px-3"><Badge value={o.status} /></td>
                <td className="px-4 text-right"><Link className="font-medium underline" href={`/fulfil/${o.id}`}>{NEXT[o.status]} →</Link></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No paid orders waiting.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
