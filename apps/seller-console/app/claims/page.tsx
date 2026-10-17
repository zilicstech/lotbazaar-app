"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox, Notice } from "@/components/ui";
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

  return (
    <Shell title="Claims" help={<>Step 16. Buyers can report a problem within 72 hours of delivery (with an unboxing video on WhatsApp). Give a credit amount, or reject with a reason. Either way the order closes.</>}>
      <ErrorBox message={error} />
      <Notice message={notice} />
      <div className="space-y-3">
        {rows.map((c) => {
          const f = form[c.id] ?? { credit: "", note: "" };
          return (
            <div key={c.id} className="card space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge value={c.status} /><b>{TYPE[c.type]}</b>{c.pieces > 0 && <span>· {c.pieces} pcs</span>}
                <span className="text-sm text-slate-500">— {c.buyerBusiness}, {c.buyerCity} · order <span className="font-mono">{c.orderNo}</span> ({inr(c.orderTotal)}) · {c.lotTitle}</span>
              </div>
              <p className="text-sm italic">&ldquo;{c.note}&rdquo;</p>
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
        {rows.length === 0 && <div className="card text-center text-sm text-slate-500">No claims. <Link className="underline" href="/orders">See orders</Link></div>}
      </div>
    </Shell>
  );
}
