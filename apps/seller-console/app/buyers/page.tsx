"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox } from "@/components/ui";
import { api } from "@/lib/api";
import type { Buyer } from "@/lib/types";

export default function BuyersPage() {
  const [rows, setRows] = useState<Buyer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api<Buyer[]>("/seller/buyers").then(setRows).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "approve" | "block") {
    setError(null);
    try {
      await api(`/seller/buyers/${id}/${action}`, { method: "POST" });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Shell title="Buyers" help={<>Step 8. Shop owners sign up on the buyer site with their GSTIN. Only approved buyers can see your lots and prices. Block anyone who misbehaves.</>}>
      <ErrorBox message={error} />
      <p className="mb-4 text-sm text-slate-600">Only approved, GST-registered retailers can see your catalog and buy.</p>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Business</th><th>Contact</th><th>GSTIN</th><th>City</th><th>Status</th><th className="px-4">Action</th></tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{b.businessName}</td><td><div>{b.name}</div><div className="text-xs text-slate-500">{b.email}</div></td>
                <td className="font-mono text-xs">{b.gstin}</td><td>{b.city}</td><td><Badge value={b.status} /></td>
                <td className="px-4">
                  <div className="flex gap-2">
                    {b.status !== "APPROVED" && <Button variant="secondary" onClick={() => act(b.id, "approve")}>Approve</Button>}
                    {b.status !== "BLOCKED" && <Button variant="ghost" onClick={() => act(b.id, "block")}>Block</Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
