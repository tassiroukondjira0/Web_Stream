"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";

type VerifyState = "loading" | "success" | "pending" | "failed" | "error" | "missing";

interface VerifyResponse {
  status?: string;
  premium?: boolean;
  final?: boolean;
  error?: string;
}

const MAX_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 3000;

export default function PaymentStatus({ sessionId }: { sessionId: string | null }) {
  const [state, setState] = useState<VerifyState>(sessionId ? "loading" : "missing");
  const [message, setMessage] = useState<string | null>(null);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verifyRef = useRef<() => void>(() => {});

  const verify = useCallback(async () => {
    if (!sessionId) return;

    try {
      const res = await fetch(`/api/payment/verify?session_id=${encodeURIComponent(sessionId)}`, {
        cache: "no-store",
      });
      const data: VerifyResponse = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setState("error");
        setMessage("Votre session a expiré. Reconnectez-vous pour consulter votre abonnement.");
        return;
      }

      if (!res.ok) {
        setState("error");
        setMessage(data.error || "Impossible de vérifier le paiement.");
        return;
      }

      if (data.premium) {
        setState("success");
        setMessage("Votre Pass Premium est actif. Profitez de tout le catalogue !");
        return;
      }

      if (data.final) {
        setState("failed");
        setMessage("La transaction n'a pas abouti. Aucun montant n'a été prélevé.");
        return;
      }

      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setState("pending");
        setMessage(
          "Le paiement est en cours de confirmation par votre opérateur. L'accès sera activé automatiquement dès validation."
        );
        return;
      }

      setState("pending");
      setMessage("Confirmation du paiement en cours…");
      timerRef.current = setTimeout(() => verifyRef.current(), POLL_INTERVAL_MS);
    } catch {
      setState("error");
      setMessage("Erreur réseau lors de la vérification. Réessayez depuis votre compte.");
    }
  }, [sessionId]);

  useEffect(() => {
    verifyRef.current = verify;
  }, [verify]);

  useEffect(() => {
    timerRef.current = setTimeout(() => verifyRef.current(), 0);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      {state === "loading" && (
        <>
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-amber-400" />
          <h1 className="mt-6 text-2xl font-bold text-white">Vérification du paiement…</h1>
        </>
      )}

      {state === "pending" && (
        <>
          <Clock className="mx-auto h-12 w-12 text-amber-400" />
          <h1 className="mt-6 text-2xl font-bold text-white">Paiement en cours de confirmation</h1>
        </>
      )}

      {state === "success" && (
        <>
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
          <h1 className="mt-6 text-2xl font-bold text-white">Bienvenue dans le Premium&nbsp;!</h1>
        </>
      )}

      {(state === "failed" || state === "error" || state === "missing") && (
        <>
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-6 text-2xl font-bold text-white">
            {state === "failed" ? "Paiement non abouti" : "Vérification impossible"}
          </h1>
        </>
      )}

      {message && <p className="mt-4 text-sm leading-relaxed text-zinc-400">{message}</p>}

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/premium"
          className="rounded-xl bg-zinc-800 border border-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
        >
          Retour aux formules
        </Link>
        {(state === "success" || state === "pending") && (
          <Link
            href="/"
            className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition-colors"
          >
            Explorer le catalogue
          </Link>
        )}
        {state === "pending" && (
          <button
            type="button"
            onClick={() => {
              attemptsRef.current = 0;
              setState("loading");
              verify();
            }}
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-white/5 transition-colors"
          >
            Revérifier
          </button>
        )}
      </div>
    </div>
  );
}
