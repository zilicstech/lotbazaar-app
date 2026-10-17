"use client";

const KEY = "lb_buyer_session";

export type Session = {
  token: string;
  user: { id: string; email: string; name: string; kind: string; role: string; tenantName: string | null; businessName: string };
};

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const session = getSession();
  const res = await fetch(`/api${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      // Never send a stale token to login/register: the JWT filter would 401 it.
      ...(session && !path.startsWith("/auth/") ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (res.status === 401 && !path.startsWith("/auth/")) {
    clearSession();
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const problem = await res.json().catch(() => null);
    throw new Error(problem?.detail ?? problem?.message ?? `Request failed (${res.status})`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const photoUrl = (tenantCode: string, id: string) => `/api/public/${tenantCode}/photos/${id}`;

export const when = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";

export const inr = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

/** Exact rupees and paise, for taxes and amounts payable. */
export const inr2 = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

export const num = (v: number) => new Intl.NumberFormat("en-IN").format(v);
