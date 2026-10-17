"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Header from "@/components/Header";
import { Badge, Button, ErrorBox, ManifestView, Notice } from "@/components/ui";
import { api, getSession, inr, photoUrl } from "@/lib/api";
import type { Lot, Offer, Order } from "@/lib/types";

function LotPageContent() {
  const { code, id } = useParams<{ code: string; id: string }>();
  const router = useRouter();
  const [lot, setLot] = useState<Lot | null>(null);
  const [photo, setPhoto] = useState(0);
  const [offer, setOffer] = useState({ amount: "", note: "" });
  const [showOffer, setShowOffer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getSession()) api<Lot>(`/store/${code}/lots/${id}`).then(setLot).catch((e) => setError(e.message));
  }, [code, id]);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const order = await api<Order>(`/store/${code}/lots/${id}/checkout`, { method: "POST" });
      router.push(`/store/${code}/checkout/${order.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function makeOffer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const o = await api<Offer>(`/store/${code}/lots/${id}/offers`, { method: "POST", body: { amount: Number(offer.amount), note: offer.note } });
      setNotice(`Offer of ${inr(o.amount)} sent. The seller will accept, counter or reject it. Track it in My offers.`);
      setShowOffer(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <Header storeCode={code} />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <Link href={`/store/${code}`} className="text-sm text-slate-500 text-emerald-700 hover:underline">← All lots</Link>
        <div className="mt-3"><ErrorBox message={error} /><Notice message={notice} /></div>
        {lot && (
          <div className="mt-2 grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div>
                <div className="font-mono text-xs text-slate-500">{lot.code}</div>
                <h1 className="text-2xl font-semibold">{lot.title}</h1>
                {lot.description && <p className="mt-1 text-slate-700">{lot.description}</p>}
              </div>
              {lot.photos.length > 0 && (
                <div className="card space-y-2 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(code, lot.photos[photo])} alt={`${lot.title} photo ${photo + 1}`} className="h-80 w-full rounded-md bg-slate-100 object-contain" />
                  <div className="flex gap-2 overflow-x-auto">
                    {lot.photos.map((p, i) => (
                      <button key={p} type="button" onClick={() => setPhoto(i)} aria-label={`Show photo ${i + 1}`}
                        className={`shrink-0 rounded border-2 ${i === photo ? "border-emerald-600" : "border-transparent"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoUrl(code, p)} alt="" className="h-16 w-16 rounded object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="card"><h2 className="mb-4 font-semibold">What&apos;s inside (manifest)</h2><ManifestView m={lot.manifest} /></div>
            </div>
            <aside className="card h-fit space-y-4 lg:sticky lg:top-6">
              <div>
                <div className="text-3xl font-semibold text-emerald-700">{inr(lot.priceAmount)} <span className="text-sm font-normal text-slate-500">+ GST</span></div>
                <div className="text-sm text-slate-500">{lot.pricePct}% of {inr(lot.totalMrp)} MRP · {inr((lot.priceAmount ?? 0) / lot.pieceCount)} per piece</div>
              </div>
              <ul className="space-y-1 text-xs text-slate-600">
                <li>✓ Piece count guaranteed within ±2%</li>
                <li>✓ Claims within 72 hours of delivery (keep an unboxing video)</li>
                <li>✓ GST invoice from the dispatching warehouse</li>
              </ul>
              {lot.status === "LISTED" ? (
                <>
                  <Button onClick={buy} disabled={busy} className="w-full !bg-emerald-700 py-3 hover:!bg-emerald-600">
                    {busy ? "Holding the lot…" : "Buy now"}
                  </Button>
                  <p className="text-[11px] text-slate-500">The lot is held for you for 15 minutes while you pay.</p>
                  {lot.acceptOffers && !showOffer && (
                    <Button variant="secondary" className="w-full" onClick={() => setShowOffer(true)}>Make an offer</Button>
                  )}
                  {showOffer && (
                    <form onSubmit={makeOffer} className="space-y-2 border-t border-slate-200 pt-3">
                      <div><label className="label" htmlFor="amt">Your offer (₹, before GST)</label>
                        <input id="amt" required type="number" min={lot.offerFloorAmount ?? 1} className="input" value={offer.amount} onChange={(e) => setOffer({ ...offer, amount: e.target.value })} />
                        <div className="mt-1 text-[11px] text-slate-500">Offers from {inr(lot.offerFloorAmount)} accepted for review.</div></div>
                      <div><label className="label" htmlFor="note">Note to seller (optional)</label>
                        <input id="note" className="input" placeholder="e.g. can pick up myself" value={offer.note} onChange={(e) => setOffer({ ...offer, note: e.target.value })} /></div>
                      <div className="flex gap-2"><Button type="submit">Send offer</Button><Button type="button" variant="ghost" onClick={() => setShowOffer(false)}>Cancel</Button></div>
                    </form>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm"><Badge value={lot.status} />
                  {lot.status === "RESERVED" ? "Another buyer is paying for this lot right now." : "This lot is sold."}</div>
              )}
            </aside>
          </div>
        )}
      </main>
    </>
  );
}

// useParams needs a Suspense boundary under cacheComponents.
export default function LotPage() {
  return (
    <Suspense>
      <LotPageContent />
    </Suspense>
  );
}
