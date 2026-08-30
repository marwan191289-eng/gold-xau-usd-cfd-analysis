export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export function sma(v: number[], p: number): (number | null)[] {
  return v.map((_, i) => (i + 1 < p ? null : sum(v.slice(i + 1 - p, i + 1)) / p));
}

export function ema(v: number[], p: number): (number | null)[] {
  const k = 2 / (p + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  v.forEach((x, i) => {
    if (i + 1 < p) {
      out.push(null);
      return;
    }
    if (prev === null) prev = sum(v.slice(0, p)) / p;
    else prev = x * k + prev * (1 - k);
    out.push(prev);
  });
  return out;
}

export function rsi(v: number[], p = 14): (number | null)[] {
  const out: (number | null)[] = [null];
  let g = 0;
  let l = 0;
  for (let i = 1; i < v.length; i++) {
    const d = v[i]! - v[i - 1]!;
    const up = Math.max(d, 0);
    const dn = Math.max(-d, 0);
    if (i <= p) {
      g += up / p;
      l += dn / p;
      out.push(i === p ? (l === 0 ? 100 : 100 - 100 / (1 + g / l)) : null);
    } else {
      g = (g * (p - 1) + up) / p;
      l = (l * (p - 1) + dn) / p;
      out.push(l === 0 ? 100 : 100 - 100 / (1 + g / l));
    }
  }
  return out;
}

export function macd(v: number[], fast = 12, slow = 26, signal = 9) {
  const f = ema(v, fast);
  const s = ema(v, slow);
  const line = v.map((_, i) => (f[i] != null && s[i] != null ? (f[i] as number) - (s[i] as number) : null));
  const valid = line.filter((x): x is number => x != null);
  const sig = ema(valid, signal);
  const pad = line.length - valid.length;
  const sigFull: (number | null)[] = [...Array(pad).fill(null), ...sig];
  const hist = line.map((x, i) => (x != null && sigFull[i] != null ? x - (sigFull[i] as number) : null));
  return { line, signal: sigFull, hist };
}

export function atr(c: Candle[], p = 14): (number | null)[] {
  const tr = c.map((k, i) =>
    i === 0 ? k.h - k.l : Math.max(k.h - k.l, Math.abs(k.h - c[i - 1]!.c), Math.abs(k.l - c[i - 1]!.c)),
  );
  return ema(tr, p);
}

export function bollinger(v: number[], p = 20, mult = 2) {
  const m = sma(v, p);
  return v.map((_, i) => {
    if (m[i] == null) return { mid: null, up: null, low: null, width: null };
    const w = v.slice(i + 1 - p, i + 1);
    const mean = m[i] as number;
    const sd = Math.sqrt(sum(w.map((x) => (x - mean) ** 2)) / p);
    return { mid: mean, up: mean + mult * sd, low: mean - mult * sd, width: (4 * sd) / mean };
  });
}

export function stochastic(c: Candle[], p = 14, sm = 3) {
  const k = c.map((_, i) => {
    if (i + 1 < p) return null;
    const w = c.slice(i + 1 - p, i + 1);
    const hh = Math.max(...w.map((x) => x.h));
    const ll = Math.min(...w.map((x) => x.l));
    return hh === ll ? 50 : ((c[i]!.c - ll) / (hh - ll)) * 100;
  });
  const valid = k.filter((x): x is number => x != null);
  const d = sma(valid, sm);
  return { k, d: [...Array(k.length - valid.length).fill(null), ...d] };
}

export function adx(c: Candle[], p = 14): (number | null)[] {
  const plus: number[] = [0];
  const minus: number[] = [0];
  const tr: number[] = [c[0].h - c[0].l];
  for (let i = 1; i < c.length; i++) {
    const up = c[i]!.h - c[i - 1]!.h;
    const dn = c[i - 1]!.l - c[i]!.l;
    plus.push(up > dn && up > 0 ? up : 0);
    minus.push(dn > up && dn > 0 ? dn : 0);
    tr.push(Math.max(c[i]!.h - c[i]!.l, Math.abs(c[i]!.h - c[i - 1]!.c), Math.abs(c[i]!.l - c[i - 1]!.c)));
  }
  const atrS = ema(tr, p);
  const pS = ema(plus, p);
  const mS = ema(minus, p);
  const dx = c.map((_, i) => {
    if (atrS[i] == null || !atrS[i]) return null;
    const pdi = ((pS[i] as number) / (atrS[i] as number)) * 100;
    const mdi = ((mS[i] as number) / (atrS[i] as number)) * 100;
    return pdi + mdi === 0 ? null : (Math.abs(pdi - mdi) / (pdi + mdi)) * 100;
  });
  const valid = dx.filter((x): x is number => x != null);
  const smoothed = ema(valid, p);
  return [...Array(dx.length - valid.length).fill(null), ...smoothed];
}

export function vwap(c: Candle[]): number | null {
  let pv = 0;
  let vv = 0;
  for (const k of c.slice(-120)) {
    const tp = (k.h + k.l + k.c) / 3;
    const vol = k.v || 1;
    pv += tp * vol;
    vv += vol;
  }
  return vv ? pv / vv : null;
}

/** Swing-based support / resistance clustered by ATR proximity. */
export function levels(c: Candle[], atrVal: number) {
  const piv: { price: number; type: "support" | "resistance"; idx: number }[] = [];
  const L = 3;
  for (let i = L; i < c.length - L; i++) {
    const w = c.slice(i - L, i + L + 1);
    if (c[i]!.h === Math.max(...w.map((x) => x.h))) piv.push({ price: c[i]!.h, type: "resistance", idx: i });
    if (c[i]!.l === Math.min(...w.map((x) => x.l))) piv.push({ price: c[i]!.l, type: "support", idx: i });
  }
  const tol = Math.max(atrVal * 0.6, c[c.length - 1]!.c * 0.0004);
  const clusters: { price: number; touches: number; type: "support" | "resistance"; last: number }[] = [];
  for (const p of piv) {
    const f = clusters.find((x) => Math.abs(x.price - p.price) <= tol);
    if (f) {
      f.price = (f.price * f.touches + p.price) / (f.touches + 1);
      f.touches++;
      f.last = Math.max(f.last, p.idx);
    } else clusters.push({ price: p.price, touches: 1, type: p.type, last: p.idx });
  }
  const price = c[c.length - 1]!.c;
  const score = (x: (typeof clusters)[number]) =>
    x.touches * 2 + (x.last / c.length) * 3 - Math.abs(x.price - price) / tol;
  const supports = clusters
    .filter((x) => x.price < price)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3)
    .sort((a, b) => b.price - a.price);
  const resistances = clusters
    .filter((x) => x.price > price)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3)
    .sort((a, b) => a.price - b.price);
  return { supports, resistances };
}

/** Classic floor-trader pivots from the last completed session window. */
export function pivots(c: Candle[], bars: number) {
  const w = c.slice(-bars * 2, -bars);
  if (!w.length) return null;
  const h = Math.max(...w.map((x) => x.h));
  const l = Math.min(...w.map((x) => x.l));
  const cl = w[w.length - 1]!.c;
  const p = (h + l + cl) / 3;
  return {
    p,
    r1: 2 * p - l,
    r2: p + (h - l),
    r3: h + 2 * (p - l),
    s1: 2 * p - h,
    s2: p - (h - l),
    s3: l - 2 * (h - p),
  };
}

export type TFAnalysis = {
  tf: string;
  price: number;
  ema20: number;
  ema50: number;
  ema200: number;
  rsi: number;
  macdHist: number;
  macdLine: number;
  adx: number;
  atr: number;
  stochK: number;
  stochD: number;
  bbWidth: number;
  vwap: number | null;
  trend: "صاعد" | "هابط" | "عرضي";
  trendStrength: number;
  bias: number; // -100..100
  reasons: string[];
};

const last = <T,>(a: (T | null)[]): T => {
  for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return a[i] as T;
  return 0 as unknown as T;
};

export function analyzeTF(tf: string, c: Candle[]): TFAnalysis {
  const close = c.map((x) => x.c);
  const e20 = last(ema(close, 20));
  const e50 = last(ema(close, 50));
  const e200 = last(ema(close, Math.min(200, Math.floor(close.length / 2))));
  const r = last(rsi(close, 14));
  const m = macd(close);
  const mh = last(m.hist);
  const ml = last(m.line);
  const a = last(atr(c, 14));
  const adxV = last(adx(c, 14));
  const st = stochastic(c);
  const bb = bollinger(close);
  const bbw = (bb[bb.length - 1]?.width ?? 0) as number;
  const price = close[close.length - 1]!;
  const vw = vwap(c);

  let bias = 0;
  const reasons: string[] = [];
  if (price > e20) {
    bias += 12;
    reasons.push(`السعر فوق EMA20 (${e20.toFixed(2)})`);
  } else {
    bias -= 12;
    reasons.push(`السعر تحت EMA20 (${e20.toFixed(2)})`);
  }
  if (e20 > e50) {
    bias += 14;
    reasons.push("تقاطع EMA20 فوق EMA50 — زخم صاعد");
  } else {
    bias -= 14;
    reasons.push("EMA20 تحت EMA50 — زخم هابط");
  }
  if (price > e200) {
    bias += 10;
    reasons.push("الاتجاه العام فوق EMA200");
  } else {
    bias -= 10;
    reasons.push("الاتجاه العام تحت EMA200");
  }
  if (r > 55) {
    bias += Math.min((r - 50) * 0.8, 16);
    reasons.push(`RSI قوي عند ${r.toFixed(1)}`);
  } else if (r < 45) {
    bias -= Math.min((50 - r) * 0.8, 16);
    reasons.push(`RSI ضعيف عند ${r.toFixed(1)}`);
  } else reasons.push(`RSI محايد عند ${r.toFixed(1)}`);
  if (r > 72) {
    bias -= 8;
    reasons.push("تشبع شرائي — حذر من ارتداد");
  }
  if (r < 28) {
    bias += 8;
    reasons.push("تشبع بيعي — احتمال ارتداد صاعد");
  }
  if (mh > 0) {
    bias += 12;
    reasons.push("هيستوجرام MACD موجب");
  } else {
    bias -= 12;
    reasons.push("هيستوجرام MACD سالب");
  }
  const k = last(st.k) as number;
  const d = last(st.d) as number;
  if (k > d) bias += 6;
  else bias -= 6;
  if (vw != null) {
    if (price > vw) {
      bias += 8;
      reasons.push(`السعر فوق VWAP (${vw.toFixed(2)})`);
    } else {
      bias -= 8;
      reasons.push(`السعر تحت VWAP (${vw.toFixed(2)})`);
    }
  }
  const strength = Math.min(100, Math.round(adxV));
  const factor = adxV >= 25 ? 1.15 : adxV < 18 ? 0.75 : 1;
  bias = Math.max(-100, Math.min(100, bias * factor));
  reasons.push(adxV >= 25 ? `ADX ${adxV.toFixed(1)} — اتجاه واضح` : `ADX ${adxV.toFixed(1)} — اتجاه ضعيف/عرضي`);

  const trend: TFAnalysis["trend"] = adxV < 18 || Math.abs(bias) < 15 ? "عرضي" : bias > 0 ? "صاعد" : "هابط";

  return {
    tf,
    price,
    ema20: e20,
    ema50: e50,
    ema200: e200,
    rsi: r,
    macdHist: mh,
    macdLine: ml,
    adx: adxV,
    atr: a,
    stochK: k,
    stochD: d,
    bbWidth: bbw,
    vwap: vw,
    trend,
    trendStrength: strength,
    bias: Math.round(bias),
    reasons,
  };
}

export type Signal = {
  action: "شراء" | "بيع" | "انتظار";
  confidence: number;
  entry: number;
  stop: number;
  targets: number[];
  rr: number;
  horizon: string;
  notes: string[];
};

const WEIGHTS: Record<string, number> = { "5m": 0.2, "15m": 0.3, "1h": 0.3, "4h": 0.2 };

export function buildSignal(
  tfs: TFAnalysis[],
  lv: ReturnType<typeof levels>,
  execATR: number,
  price: number,
): Signal {
  let score = 0;
  let wsum = 0;
  for (const t of tfs) {
    const w = WEIGHTS[t.tf] ?? 0.25;
    score += t.bias * w;
    wsum += w;
  }
  score = score / (wsum || 1);

  const aligned = tfs.filter((t) => Math.sign(t.bias) === Math.sign(score) && Math.abs(t.bias) > 10).length;
  const alignmentBonus = (aligned / tfs.length) * 20;
  let confidence = Math.min(96, Math.round(Math.abs(score) * 0.8 + alignmentBonus));

  const notes: string[] = [];
  const choppy = tfs.filter((t) => t.trend === "عرضي").length >= tfs.length / 2;
  if (choppy) {
    confidence = Math.round(confidence * 0.7);
    notes.push("السوق في نطاق عرضي على أغلب الفريمات — تقليل حجم الصفقة");
  }
  notes.push(`توافق الفريمات: ${aligned}/${tfs.length}`);

  const nearestRes = lv.resistances[0]?.price ?? price + execATR * 3;
  const nearestSup = lv.supports[0]?.price ?? price - execATR * 3;

  let action: Signal["action"] = "انتظار";
  if (score >= 22 && confidence >= 45) action = "شراء";
  else if (score <= -22 && confidence >= 45) action = "بيع";
  else notes.push("لا توجد أفضلية كافية — الانتظار أفضل قرار الآن");

  let stop: number;
  let targets: number[];
  if (action === "شراء") {
    stop = Math.min(nearestSup - execATR * 0.35, price - execATR * 1.2);
    targets = [price + execATR * 1.2, Math.max(nearestRes, price + execATR * 2.2), price + execATR * 3.4];
    if (nearestRes - price < execATR * 0.6) {
      notes.push("مقاومة قريبة جدًا — يفضل الانتظار حتى الاختراق وإعادة الاختبار");
      confidence = Math.round(confidence * 0.8);
    }
  } else if (action === "بيع") {
    stop = Math.max(nearestRes + execATR * 0.35, price + execATR * 1.2);
    targets = [price - execATR * 1.2, Math.min(nearestSup, price - execATR * 2.2), price - execATR * 3.4];
    if (price - nearestSup < execATR * 0.6) {
      notes.push("دعم قريب جدًا — خطر ارتداد عكسي");
      confidence = Math.round(confidence * 0.8);
    }
  } else {
    stop = price - execATR * 1.2;
    targets = [price + execATR * 1.2, price + execATR * 2.2, price + execATR * 3.4];
  }

  const risk = Math.abs(price - stop) || execATR;
  const rr = Math.abs(targets[1]! - price) / risk;
  notes.push(`تقلب ATR على فريم التنفيذ: ${execATR.toFixed(2)}$`);

  return {
    action,
    confidence,
    entry: price,
    stop,
    targets,
    rr,
    horizon: "من 1 إلى 8 ساعات (مضاربة قصيرة)",
    notes,
  };
}

export function forecast(price: number, execATR: number, score: number) {
  const drift = (score / 100) * execATR;
  const mk = (h: number) => {
    const s = execATR * Math.sqrt(h);
    return {
      hours: h,
      mid: price + drift * Math.sqrt(h) * 0.8,
      low: price + drift * Math.sqrt(h) * 0.8 - s,
      high: price + drift * Math.sqrt(h) * 0.8 + s,
    };
  };
  return [mk(1), mk(4), mk(8), mk(24)];
}
