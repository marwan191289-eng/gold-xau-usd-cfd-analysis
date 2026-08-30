import { createServerFn } from "@tanstack/react-start";
import type { Candle } from "./analysis";

const SYMBOL = "GC=F"; // COMEX Gold futures — أدق مصدر مجاني متاح لسعر الذهب الفوري

const TFS: { tf: string; interval: string; range: string }[] = [
  { tf: "5m", interval: "5m", range: "5d" },
  { tf: "15m", interval: "15m", range: "1mo" },
  { tf: "1h", interval: "60m", range: "3mo" },
  { tf: "4h", interval: "1d", range: "1y" },
];

async function fetchTF(interval: string, range: string): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    SYMBOL,
  )}?interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`فشل جلب البيانات (${res.status})`);
  const json = (await res.json()) as any;
  const r = json?.chart?.result?.[0];
  if (!r) throw new Error("لا توجد بيانات للرمز المطلوب");
  const q = r.indicators.quote[0];
  const out: Candle[] = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    const o = q.open[i];
    const h = q.high[i];
    const l = q.low[i];
    const c = q.close[i];
    if ([o, h, l, c].some((x) => x == null)) continue;
    out.push({ t: r.timestamp[i] * 1000, o, h, l, c, v: q.volume?.[i] ?? 0 });
  }
  return out;
}

export const getGoldData = createServerFn({ method: "GET" }).handler(async () => {
  const results = await Promise.all(TFS.map((t) => fetchTF(t.interval, t.range)));
  const data: Record<string, Candle[]> = {};
  TFS.forEach((t, i) => {
    data[t.tf] = results[i];
  });
  const exec = data["5m"];
  const price = exec[exec.length - 1].c;
  return { data, price, fetchedAt: Date.now(), symbol: "XAU/USD (COMEX GC)" };
});
