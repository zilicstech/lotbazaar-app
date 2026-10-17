"use client";

import Link from "next/link";
import Shell from "@/components/Shell";
import { ROLE_LABEL, STEPS } from "@/lib/workflow";

const ROLE_STYLE: Record<string, string> = {
  OWNER: "bg-violet-50 text-violet-700", WAREHOUSE: "bg-amber-50 text-amber-800",
  SALES: "bg-sky-50 text-sky-700", BUYER: "bg-emerald-50 text-emerald-700",
};

export default function GuidePage() {
  return (
    <Shell title="How it works">
      <div className="mb-6 max-w-3xl space-y-2 text-sm text-slate-700">
        <p>
          A liquidator buys whole <b>containers</b> of unsold branded clothes and shoes, and resells them to shop owners in
          <b> lots</b> of 100–1,000+ pieces. Nobody can scan 50,000 T-shirts, so the system tracks <b>cartons</b>: each
          carton holds one kind of item and has a barcode label.
        </p>
        <p>
          Follow the steps below in order. Each one is done by a different person, so sign out and sign in with the
          matching demo role (the login screen has one-click buttons). The buyer steps happen on the buyer site
          (localhost:3000, sign in as <span className="font-mono">buyer@shop.demo</span>).
        </p>
        <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">
          Tip: container <b>CN-2026-0510</b> has just arrived and is waiting for you. Start at step 2 with it and walk it
          all the way to step 17.
        </p>
      </div>
      <ol className="space-y-3">
        {STEPS.map((s) => {
          const external = s.href.startsWith("http");
          return (
            <li key={s.n} className="card flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">{s.n}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{s.title}</span>
                  {s.who.map((w) => (
                    <span key={w} className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLE[w]}`}>{ROLE_LABEL[w]}</span>
                  ))}
                </div>
                <div className="text-sm text-slate-600">{s.why}</div>
              </div>
              {external
                ? <a href={s.href} target="_blank" rel="noreferrer" className="shrink-0 text-sm text-emerald-700 hover:underline">Buyer site ↗</a>
                : <Link href={s.href} className="shrink-0 text-sm text-emerald-700 hover:underline">{s.where}</Link>}
            </li>
          );
        })}
      </ol>
    </Shell>
  );
}
