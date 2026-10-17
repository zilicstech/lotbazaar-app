"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox } from "@/components/ui";
import { EmptyRow, exportCsv, ListTabs, ListToolbar, Pagination, SortTh, useList } from "@/components/list";
import { api } from "@/lib/api";
import type { Buyer } from "@/lib/types";

// The first two GSTIN digits are the state code.
const STATE: Record<string, string> = {
  "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "24": "Gujarat", "27": "Maharashtra", "29": "Karnataka",
  "32": "Kerala", "33": "Tamil Nadu", "36": "Telangana", "19": "West Bengal", "06": "Haryana", "03": "Punjab",
};
const stateOf = (gstin: string) => STATE[gstin.slice(0, 2)] ?? `State ${gstin.slice(0, 2)}`;

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

  const list = useList(rows, {
    search: (b) => [b.businessName, b.name, b.email, b.gstin, b.city],
    filters: {
      city: { label: "City", value: (b) => b.city },
      state: { label: "State", value: (b) => stateOf(b.gstin) },
    },
    tabs: [
      { key: "all", label: "All", match: () => true },
      { key: "pending", label: "Waiting for approval", match: (b) => b.status === "PENDING" },
      { key: "approved", label: "Approved", match: (b) => b.status === "APPROVED" },
      { key: "blocked", label: "Blocked", match: (b) => b.status === "BLOCKED" },
    ],
    sorts: { business: (b) => b.businessName, city: (b) => b.city, joined: (b) => b.createdAt },
    defaultSort: { key: "joined", dir: "desc" },
  });

  const csv = () => exportCsv("buyers", list.all, [
    ["Business", (b) => b.businessName], ["Contact", (b) => b.name], ["Email", (b) => b.email], ["GSTIN", (b) => b.gstin],
    ["City", (b) => b.city], ["State", (b) => stateOf(b.gstin)], ["Status", (b) => b.status], ["Registered", (b) => b.createdAt],
  ]);

  return (
    <Shell title="Buyers" actions={<Button variant="secondary" onClick={csv} disabled={!list.total}>Export CSV</Button>}
      help={<>Shop owners register on the buyer site with their GSTIN. Only approved buyers can see your lots and prices.</>}>
      <ErrorBox message={error} />
      <ListTabs list={list} />
      <ListToolbar list={list} placeholder="Search business, contact, email, GSTIN…" />
      <div className="card overflow-x-auto !p-0">
        <table className="data-table">
          <thead>
            <tr><SortTh list={list} k="business">Business</SortTh><th>Contact</th><th>GSTIN</th><SortTh list={list} k="city">City</SortTh>
              <SortTh list={list} k="joined">Registered</SortTh><th>Status</th><th className="text-right">Action</th></tr>
          </thead>
          <tbody>
            {list.rows.map((b) => (
              <tr key={b.id}>
                <td className="font-medium text-slate-900">{b.businessName}</td>
                <td><div>{b.name}</div><div className="muted">{b.email}</div></td>
                <td><div className="font-mono text-xs">{b.gstin}</div><div className="muted">{stateOf(b.gstin)}</div></td>
                <td>{b.city}</td>
                <td className="text-xs text-slate-600">{new Date(b.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
                <td><Badge value={b.status} /></td>
                <td>
                  <div className="flex justify-end gap-2">
                    {b.status !== "APPROVED" && <Button size="sm" onClick={() => act(b.id, "approve")}>Approve</Button>}
                    {b.status !== "BLOCKED" && <Button size="sm" variant="danger" onClick={() => act(b.id, "block")}>Block</Button>}
                  </div>
                </td>
              </tr>
            ))}
            <EmptyRow list={list} cols={7} empty="No buyers have registered yet." />
          </tbody>
        </table>
        <Pagination list={list} />
      </div>
    </Shell>
  );
}
