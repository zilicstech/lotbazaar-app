"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, ErrorBox, Stat } from "@/components/ui";
import { api, getSession, inr, num } from "@/lib/api";

type Dashboard = {
  headline: {
    containers: number; availableCartons: number; availablePieces: number; availableMrp: number; unshelvedCartons: number;
    draftLots: number; listedLots: number; reservedLots: number; soldLots: number; gmv: number; soldMrp: number;
    pendingBuyers: number; openOffers: number; ordersToFulfil: number; openClaims: number; claimCredits: number;
    deliveredOrders: number; claims: number; ledgerDrift: number;
  };
  recovery: { ref: string; supplier: string; status: string; landedCost: number; containerMrp: number; soldMrp: number;
    revenue: number; recoveryPct: number | null; sellThroughPct: number | null }[];
  aging: { bucket: string; cartons: number; pieces: number; mrp: number }[];
  funnel: { status: string; orders: number; value: number }[];
};

const PIPELINE = ["PAYMENT_PENDING", "PAID", "PICKING", "PACKED", "DISPATCHED", "DELIVERED", "CLOSED"];

function Bar({ pct, tone = "bg-slate-700" }: { pct: number; tone?: string }) {
  return <div className="h-2 w-full rounded-full bg-slate-100"><div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [d, setD] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (getSession()?.user.role !== "OWNER") { router.replace("/guide"); return; }
    api<Dashboard>("/seller/dashboard").then(setD).catch((e) => setError(e.message));
  }, [router]);

  const h = d?.headline;
  const maxAging = Math.max(1, ...(d?.aging.map((a) => a.pieces) ?? [1]));
  const maxFunnel = Math.max(1, ...(d?.funnel.map((f) => f.orders) ?? [1]));
  return (
    <Shell title="Dashboard" help="How the business is doing: money recovered per container, what stock is ageing, where orders are stuck.">
      <ErrorBox message={error} />
      {d && h && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Sales (paid, ex-GST)" value={inr(h.gmv)} hint={h.soldMrp > 0 ? `${((100 * h.gmv) / h.soldMrp).toFixed(1)}% of MRP sold` : undefined} />
            <Stat label="Sellable stock" value={`${num(h.availablePieces)} pcs`} hint={`${h.availableCartons} cartons on shelves · ${inr(h.availableMrp)} MRP`} />
            <Stat label="Lots" value={`${h.listedLots} on sale`} hint={`${h.draftLots} draft · ${h.reservedLots} on hold · ${h.soldLots} sold`} />
            <Stat label="Claims" value={h.deliveredOrders ? `${((100 * h.claims) / h.deliveredOrders).toFixed(0)}%` : "—"} hint={`${h.claims} claims on ${h.deliveredOrders} delivered · ${inr(h.claimCredits)} credited`} />
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {[
              { href: "/putaway", label: "Cartons to shelve", v: h.unshelvedCartons },
              { href: "/buyers", label: "Buyers to approve", v: h.pendingBuyers },
              { href: "/offers", label: "Offers to answer", v: h.openOffers },
              { href: "/fulfil", label: "Orders to pack/ship", v: h.ordersToFulfil },
              { href: "/claims", label: "Open claims", v: h.openClaims },
            ].map((t) => (
              <Link key={t.href} href={t.href} className={`card !p-4 transition hover:-translate-y-0.5 hover:shadow-md ${t.v > 0 ? "!border-amber-300 bg-amber-50/40" : ""}`}>
                <div className="text-xs font-medium text-slate-500">{t.label}</div>
                <div className={`mt-1 text-2xl font-semibold tabular-nums ${t.v > 0 ? "text-amber-700" : "text-slate-900"}`}>{t.v}</div>
              </Link>
            ))}
            <div className="card !p-4">
              <div className="text-xs font-medium text-slate-500">Stock ledger</div>
              <div className={`mt-1 text-lg font-semibold ${h.ledgerDrift === 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {h.ledgerDrift === 0 ? "Matches ✓" : `Off by ${h.ledgerDrift} pcs`}
              </div>
            </div>
          </div>

          <section className="card overflow-x-auto !p-0">
            <div className="px-5 pt-5">
              <h2 className="section-title !mb-1">Recovery per container</h2>
              <p className="muted">Sales from each container (split by its cartons&apos; share of every sold lot) against what the container cost. 100% = paid back.</p>
            </div>
            <table className="data-table mt-4">
              <thead>
                <tr><th>Container</th><th>Status</th><th className="num">Landed cost</th><th className="num">Sales so far</th>
                  <th className="w-48">Recovered</th><th className="w-48">MRP sold</th></tr>
              </thead>
              <tbody>
                {d.recovery.map((r) => (
                  <tr key={r.ref}>
                    <td><div className="font-mono text-sm font-medium">{r.ref}</div><div className="muted">{r.supplier}</div></td>
                    <td><Badge value={r.status} /></td>
                    <td className="num">{inr(r.landedCost)}</td>
                    <td className="num">{inr(r.revenue)}</td>
                    <td><div className="text-xs tabular-nums">{r.recoveryPct ?? 0}%</div><Bar pct={r.recoveryPct ?? 0} tone="bg-emerald-600" /></td>
                    <td><div className="text-xs tabular-nums">{r.sellThroughPct ?? 0}%</div><Bar pct={r.sellThroughPct ?? 0} tone="bg-slate-500" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card">
              <h2 className="section-title !mb-1">Stock age</h2>
              <p className="muted mb-4">Unsold pieces by days since sorting. Old stock should be marked down or bundled.</p>
              <div className="space-y-2">
                {d.aging.map((a) => (
                  <div key={a.bucket} className="grid grid-cols-[90px_1fr_150px] items-center gap-2 text-sm">
                    <div>{a.bucket}</div><Bar pct={(100 * a.pieces) / maxAging} tone={a.bucket.startsWith("0") ? "bg-emerald-600" : "bg-amber-500"} />
                    <div className="text-right text-xs tabular-nums">{num(a.pieces)} pcs · {a.cartons} ctn</div>
                  </div>
                ))}
                {d.aging.length === 0 && <div className="text-sm text-slate-500">No unsold stock.</div>}
              </div>
            </section>
            <section className="card">
              <h2 className="section-title !mb-1">Order pipeline</h2>
              <p className="muted mb-4">Where every order is right now (value incl. GST).</p>
              <div className="space-y-2">
                {PIPELINE.map((s) => {
                  const f = d.funnel.find((x) => x.status === s);
                  return (
                    <div key={s} className="grid grid-cols-[150px_1fr_130px] items-center gap-2 text-sm">
                      <Badge value={s} /><Bar pct={(100 * (f?.orders ?? 0)) / maxFunnel} tone="bg-emerald-500" />
                      <div className="text-right text-xs tabular-nums">{f?.orders ?? 0} · {inr(f?.value ?? 0)}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}
    </Shell>
  );
}
