import { useCallback, useEffect, useState } from "react";
import { verifyCertificate } from "./billing.functions";

export type Certificate = {
  plan: "starter" | "pro" | "elite";
  ref: string;
  issuedAt: number;
  expiresAt: number;
  holder: string;
};

const KEY = "gold-engine-certificate";

export const PLAN_LABEL: Record<Certificate["plan"], string> = {
  starter: "الباقة الأساسية",
  pro: "الباقة الاحترافية",
  elite: "باقة النخبة",
};

export function saveCertificate(cert: string, payload: Certificate) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ cert, payload }));
  } catch {
    /* تجاهل */
  }
}

export function clearCertificate() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* تجاهل */
  }
}

function readStored(): { cert: string; payload: Certificate } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as { cert: string; payload: Certificate }) : null;
  } catch {
    return null;
  }
}

/** حالة الاشتراك: تُتحقق الشهادة على الخادم عند فتح التطبيق. */
export function useSubscription() {
  const [cert, setCert] = useState<Certificate | null>(null);
  const [checked, setChecked] = useState(false);

  const refresh = useCallback(async () => {
    const stored = readStored();
    if (!stored) {
      setCert(null);
      setChecked(true);
      return;
    }
    try {
      const res = await verifyCertificate({ data: { cert: stored.cert } });
      if (res.valid && res.payload) setCert(res.payload as Certificate);
      else {
        clearCertificate();
        setCert(null);
      }
    } catch {
      setCert(null);
    }
    setChecked(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { cert, active: Boolean(cert), checked, refresh };
}
