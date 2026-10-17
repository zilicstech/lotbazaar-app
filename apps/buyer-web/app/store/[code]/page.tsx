"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Header from "@/components/Header";
import { ErrorBox } from "@/components/ui";
import { api, getSession, inr, num, photoUrl } from "@/lib/api";
import type { Lot } from "@/lib/types";

function StorePageContent() {
  const { code } = useParams<{ code: string }>();
  const [lots, setLots] = useState<Lot[] | null>(null);
  const [store, setStore] = useState<{ tenant: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) return;
    api<{ tenant: string; status: string }>(`/store/${code}/access`).then((a) => {
      setStore(a);
      if (a.status === "APPROVED") api<Lot[]>(`/store/${code}/lots`).then(setLots).catch((e) => setError(e.message));
    }).catch((e) => setError(e.message));
  }, [code]);

  return (
    <>
      <Header storeCode={code} storeName={store?.tenant} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <ErrorBox message={error} />
        {store && store.status !== "APPROVED" && (
          <div className="card text-sm">
            {store.status === "NONE" ? "You are not registered with this seller yet." : `Your account is ${store.status.toLowerCase()} with ${store.tenant}. You will see lots once approved.`}
          </div>
        )}
        {lots && (
          <>
            <h1 className="text-2xl font-semibold">{store?.tenant}</h1>
            <p className="mb-6 text-sm text-slate-600">{lots.length} lots on sale · verified manifests · prices shown as % of tag MRP</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lots.map((l) => (
                <Link key={l.id} href={`/store/${code}/lots/${l.id}`} className="card flex flex-col hover:border-emerald-400">
                  {l.photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl(code, l.photos[0])} alt="" className="-mx-5 -mt-5 mb-3 h-40 w-[calc(100%+2.5rem)] max-w-none rounded-t-xl object-cover" />
                  )}
                  <div className="font-mono text-xs text-slate-500">{l.code}</div>
                  <div className="mt-1 font-semibold">{l.title}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.keys(l.manifest.brandMix).map((b) => <span key={b} className="rounded bg-slate-100 px-2 py-0.5 text-xs">{b}</span>)}
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Grade {l.manifest.grades.join("/")}</span>
                    {l.acceptOffers && <span className="rounded bg-sky-50 px-2 py-0.5 text-xs text-sky-700">Offers welcome</span>}
                  </div>
                  <div className="mt-3 text-sm text-slate-600">{num(l.pieceCount)} pcs · {l.manifest.cartons} cartons · MRP {inr(l.totalMrp)}</div>
                  <div className="mt-auto pt-4">
                    <div className="text-2xl font-semibold text-emerald-700">{inr(l.priceAmount)}</div>
                    <div className="text-xs text-slate-500">{l.pricePct}% of MRP · {inr((l.priceAmount ?? 0) / l.pieceCount)} / pc</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}

// useParams needs a Suspense boundary under cacheComponents.
export default function StorePage() {
  return (
    <Suspense>
      <StorePageContent />
    </Suspense>
  );
}
