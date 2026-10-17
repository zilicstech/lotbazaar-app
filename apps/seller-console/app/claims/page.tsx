"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox, Notice } from "@/components/ui";
import { ListTabs, ListToolbar, Pagination, useList } from "@/components/list";
import { api, inr } from "@/lib/api";
import type { Claim } from "@/lib/types";

const TYPE: Record<string, string> = { SHORT: "Fewer pieces than manifest", WRONG_GRADE: "Wrong grade", DAMAGED: "Damaged goods", OTHER: "Other" };

export default function ClaimsPage() {
  const [rows, setRows] = useState<Claim[]>([]);
  const [form, setForm] = useState<Record<string, { credit: string; note: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(() => api<Claim[]>("/seller/claims").then(setRows).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function settle(c: Claim, action: "resolve" | "reject") {
    const f = form[c.id] ?? { credit: "", note: "" };
    setError(null);
    setNotice(null);
    try {
      await api(`/seller/claims/${c.id}/${action}`, { method: "POST", body: { creditAmount: action === "resolve" ? Number(f.credit) : null, note: f.note } });
      setNotice(action === "resolve" ? `Credit of ${inr(Number(f.credit))} issued to ${c.buyerBusiness}; order closed.` : "Claim rejected; order closed.");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const list = useList(rows, {
    search: (c) => [c.orderNo, c.lotCode, c.lotTitle, c.buyerBusiness, c.buyerCity, c.note],
    filters: {
      type: { label: "Problem", value: (c) => TYPE[c.type] ?? c.type },
      city: { label: "Buyer city", value: (c) => c.buyerCity },
    },
    tabs: [
      { key: "open", label: "To settle", match: (c) => c.status === "OPEN" },
      { key: "resolved", label: "Credited", match: (c) => c.status === "RESOLVED" },
      { key: "rejected", label: "Rejected", match: (c) => c.status === "REJECTED" },
      { key: "all", label: "All", match: () => true },
    ],
    sorts: { raised: (c) => c.createdAt },
    defaultSort: { key: "raised", dir: "desc" },
    pageSize: 20,
  });

  return (
    <Shell title="Claims" help={<>Buyers can report a problem within 72 hours of delivery (with an unboxing video on WhatsApp). Give a credit amount, or reject with a reason. Either way the order closes.</>}>
      <ErrorBox message={error} />
      <Notice message={notice} />
      <ListTabs list={list} />
      <ListToolbar list={list} placeholder="Search order, lot, buyer, note…" />
      <div className="space-y-3">
        {list.rows.map((c) => {
          const f = form[c.id] ?? { credit: "", note: "" };
          return (
            <div key={c.id} className="card space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge value={c.status} /><span className="font-semibold text-slate-900">{TYPE[c.type]}</span>{c.pieces > 0 && <span className="text-sm text-slate-600">· {c.pieces} pcs</span>}
                <span className="muted ml-auto">{new Date(c.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
              </div>
              <div className="text-sm text-slate-600">{c.buyerBusiness}, {c.buyerCity} · order <span className="font-mono">{c.orderNo}</span> ({inr(c.orderTotal)}) · {c.lotTitle}
              </div>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-700">&ldquo;{c.note}&rdquo;</p>
              {c.status === "OPEN" ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div><label className="label" htmlFor={`cr-${c.id}`}>Credit (₹)</label>
                    <input id={`cr-${c.id}`} type="number" min="0" className="input w-32" value={f.credit} onChange={(e) => setForm({ ...form, [c.id]: { ...f, credit: e.target.value } })} /></div>
                  <div className="min-w-64 flex-1"><label className="label" htmlFor={`nt-${c.id}`}>Note to buyer</label>
                    <input id={`nt-${c.id}`} className="input" value={f.note} onChange={(e) => setForm({ ...form, [c.id]: { ...f, note: e.target.value } })} /></div>
                  <Button disabled={f.credit === ""} onClick={() => settle(c, "resolve")}>Give credit & close</Button>
                  <Button variant="secondary" disabled={!f.note} onClick={() => settle(c, "reject")}>Reject</Button>
                </div>
              ) : (
                <p className="text-sm">{c.status === "RESOLVED" ? <>Credited <b>{inr(c.creditAmount)}</b>. </> : "Rejected. "}{c.resolutionNote}</p>
              )}
            </div>
          );
        })}
        {list.total === 0 && (
          <div className="card py-10 text-center text-sm text-slate-500">
            {list.unfiltered === 0 ? <>No claims. <Link className="font-medium text-emerald-700 hover:underline" href="/orders">See orders</Link></>
              : <>Nothing here. <button type="button" className="font-medium text-emerald-700 hover:underline" onClick={() => { list.clear(); list.setTab("all"); }}>Show all claims</button></>}
          </div>
        )}
      </div>
      {list.total > 0 && <div className="card mt-3 !p-0"><Pagination list={list} /></div>}
    </Shell>
  );
}
