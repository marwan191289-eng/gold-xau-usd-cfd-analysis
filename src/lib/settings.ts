import { useCallback, useEffect, useState } from "react";

export type RiskProfile = "محافظ" | "متوازن" | "هجومي" | "مخصص";

export type Settings = {
  profile: RiskProfile;
  riskPercent: number;
  balance: number;
  alertsEnabled: boolean;
  riseThreshold: number;
  dropThreshold: number;
  minConfidence: number;
  autoTimeframe: boolean;
  accountName: string;
  payLinks: Record<PlanId, string>;
};

export type PlanId = "starter" | "pro" | "elite";

export const DEFAULT_SETTINGS: Settings = {
  profile: "متوازن",
  riskPercent: 1,
  balance: 10000,
  alertsEnabled: true,
  riseThreshold: 70,
  dropThreshold: 40,
  minConfidence: 55,
  autoTimeframe: true,
  accountName: "",
  payLinks: { starter: "", pro: "", elite: "" },
};


export const PROFILE_RISK: Record<Exclude<RiskProfile, "مخصص">, number> = {
  محافظ: 0.5,
  متوازن: 1,
  هجومي: 2,
};

const KEY = "gold-engine-settings";

export function readSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
    setLoaded(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSettings(readSettings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* تجاهل */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* تجاهل */
    }
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, update, reset, loaded };
}

/* ---------- سجل التنبيهات داخل التطبيق ---------- */

export type AlertItem = {
  id: string;
  at: number;
  kind: "ارتفاع الثقة" | "انخفاض الثقة" | "تغير الإشارة";
  message: string;
  confidence: number;
};

const ALERTS_KEY = "gold-engine-alerts";

export function readAlerts(): AlertItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ALERTS_KEY);
    return raw ? (JSON.parse(raw) as AlertItem[]) : [];
  } catch {
    return [];
  }
}

export function pushAlert(item: AlertItem): AlertItem[] {
  const next = [item, ...readAlerts()].slice(0, 30);
  try {
    window.localStorage.setItem(ALERTS_KEY, JSON.stringify(next));
  } catch {
    /* تجاهل */
  }
  return next;
}

export function clearAlerts() {
  try {
    window.localStorage.removeItem(ALERTS_KEY);
  } catch {
    /* تجاهل */
  }
}
