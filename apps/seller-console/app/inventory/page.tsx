"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorBox } from "@/components/ui";
import { api, inr, num } from "@/lib/api";
import type { StockLine } from "@/lib/types";

export default function InventoryPage() {
  const [rows, setRows] = useState<StockLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<StockLine[]>("/seller/stock").then(setRows).catch((e) => setError(e.message)); }, []);

  return (
    <Shell title="Inventory by stock type" help={<>Each row is one <b>stock type</b> (brand · gender · category · grade · MRP band), e.g. ZARA-W-DRESS-A-1500_2499. Stock is counted in cartons and pieces. &quot;Available&quot; = on a shelf and not yet in a lot.</>}>
      <ErrorBox message={error} />
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">SKU</th><th>Brand</th><th>Category</th><th>Grade</th><th>MRP band</th>
              <th className="text-right">Avail. cartons</th><th className="text-right">Avail. pcs</th><th className="text-right">Avail. MRP</th>
              <th className="text-right">In lots</th><th className="px-4 text-right">Sold</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.skuCode} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs">{r.skuCode}</td><td>{r.brand}</td><td>{r.category}</td><td>{r.grade}</td>
                <td>{r.mrpBand.replace("_", "–").replace("–UP", "+")}</td>
                <td className="text-right tabular-nums">{r.availableCartons}</td><td className="text-right tabular-nums">{num(r.availablePieces)}</td>
                <td className="text-right tabular-nums">{inr(r.availableMrp)}</td><td className="text-right tabular-nums">{r.reservedCartons}</td>
                <td className="px-4 text-right tabular-nums">{r.soldCartons}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
