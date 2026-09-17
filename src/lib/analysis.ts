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

/** Wilder's smoothing (RMA) — المعيار الصحيح لمؤشرات RSI/ATR/ADX. */
export function rma(v: number[], p: number): (number | null)[] {
  const out: (number | null)[] = [];
  let prev: number | null = null;
  v.forEach((x, i) => {
    if (i + 1 < p) {
      out.push(null);
      return;
    }
    prev = prev === null ? sum(v.slice(i + 1 - p, i + 1)) / p : (prev * (p - 1) + x) / p;
    out.push(prev);
  });
  return out;
}

/** ميل خط الانحدار الخطي كنسبة من السعر (قياس زخم مستقر ضد الضجيج). */
export function slope(v: number[], p = 20): number {
  const w = v.slice(-p);
  const n = w.length;
  if (n < 3) return 0;
  const mx = (n - 1) / 2;
  const my = sum(w) / n;
  let num = 0;
  let den = 0;
  w.forEach((y, i) => {
    num += (i - mx) * (y - my);
    den += (i - mx) ** 2;
  });
  const b = den ? num / den : 0;
  return (b / (my || 1)) * 100 * p; // نسبة التغير المتوقعة عبر النافذة
}

export function rsi(v: number[], p = 14): (number | null)[] {
  const up: number[] = [0];
  const dn: number[] = [0];
  for (let i = 1; i < v.length; i++) {
    const d = v[i]! - v[i - 1]!;
    up.push(Math.max(d, 0));
    dn.push(Math.max(-d, 0));
  }
  const gu = rma(up, p);
  const gd = rma(dn, p);
  return v.map((_, i) => {
    const g = gu[i];
    const l = gd[i];
    if (g == null || l == null) return null;
    return l === 0 ? 100 : 100 - 100 / (1 + g / l);
  });
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
  return rma(tr, p);
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

/** ADX/DI بطريقة Wilder الصحيحة. */
export function directional(c: Candle[], p = 14) {
  const plus: number[] = [0];
  const minus: number[] = [0];
  const tr: number[] = [c[0]!.h - c[0]!.l];
  for (let i = 1; i < c.length; i++) {
    const up = c[i]!.h - c[i - 1]!.h;
    const dn = c[i - 1]!.l - c[i]!.l;
    plus.push(up > dn && up > 0 ? up : 0);
    minus.push(dn > up && dn > 0 ? dn : 0);
    tr.push(Math.max(c[i]!.h - c[i]!.l, Math.abs(c[i]!.h - c[i - 1]!.c), Math.abs(c[i]!.l - c[i - 1]!.c)));
  }
  const atrS = rma(tr, p);
  const pS = rma(plus, p);
  const mS = rma(minus, p);
  const pdi: (number | null)[] = [];
  const mdi: (number | null)[] = [];
  const dx: (number | null)[] = [];
  c.forEach((_, i) => {
    const a = atrS[i];
    if (a == null || !a || pS[i] == null || mS[i] == null) {
      pdi.push(null);
      mdi.push(null);
      dx.push(null);
      return;
    }
    const pv = ((pS[i] as number) / a) * 100;
    const mv = ((mS[i] as number) / a) * 100;
    pdi.push(pv);
    mdi.push(mv);
    dx.push(pv + mv === 0 ? null : (Math.abs(pv - mv) / (pv + mv)) * 100);
  });
  const valid = dx.filter((x): x is number => x != null);
  const smoothed = rma(valid, p);
  const adxFull: (number | null)[] = [...Array(dx.length - valid.length).fill(null), ...smoothed];
  return { adx: adxFull, pdi, mdi };
}

export function adx(c: Candle[], p = 14): (number | null)[] {
  return directional(c, p).adx;
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
  pdi: number;
  mdi: number;
  atr: number;
  stochK: number;
  stochD: number;
  bbWidth: number;
  vwap: number | null;
  slope: number;
  structure: "قمم وقيعان صاعدة" | "قمم وقيعان هابطة" | "بنية متداخلة";
  divergence: "إيجابي" | "سلبي" | "لا يوجد";
  volPct: number;
  trend: "صاعد" | "هابط" | "عرضي";
  trendStrength: number;
  bias: number; // -100..100
  quality: number; // 0..100 جودة البيئة للتداول
  reasons: string[];
};

const last = <T,>(a: (T | null)[]): T => {
  for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return a[i] as T;
  return 0 as unknown as T;
};

/** بنية السوق: قمم وقيعان متتالية. */
function marketStructure(c: Candle[]): TFAnalysis["structure"] {
  const L = 3;
  const hi: number[] = [];
  const lo: number[] = [];
  for (let i = c.length - 60 > L ? c.length - 60 : L; i < c.length - L; i++) {
    const w = c.slice(i - L, i + L + 1);
    if (c[i]!.h === Math.max(...w.map((x) => x.h))) hi.push(c[i]!.h);
    if (c[i]!.l === Math.min(...w.map((x) => x.l))) lo.push(c[i]!.l);
  }
  const up = hi.length >= 2 && lo.length >= 2 && hi.at(-1)! > hi.at(-2)! && lo.at(-1)! > lo.at(-2)!;
  const dn = hi.length >= 2 && lo.length >= 2 && hi.at(-1)! < hi.at(-2)! && lo.at(-1)! < lo.at(-2)!;
  return up ? "قمم وقيعان صاعدة" : dn ? "قمم وقيعان هابطة" : "بنية متداخلة";
}

/** دايفرجنس RSI مقابل السعر على آخر نافذة. */
function rsiDivergence(c: Candle[], r: (number | null)[]): TFAnalysis["divergence"] {
  const n = c.length;
  const w = 30;
  if (n < w * 2) return "لا يوجد";
  const a = c.slice(n - w * 2, n - w);
  const b = c.slice(n - w);
  const ra = r.slice(n - w * 2, n - w).filter((x): x is number => x != null);
  const rb = r.slice(n - w).filter((x): x is number => x != null);
  if (!ra.length || !rb.length) return "لا يوجد";
  const pLowA = Math.min(...a.map((x) => x.l));
  const pLowB = Math.min(...b.map((x) => x.l));
  const pHighA = Math.max(...a.map((x) => x.h));
  const pHighB = Math.max(...b.map((x) => x.h));
  const rLowA = Math.min(...ra);
  const rLowB = Math.min(...rb);
  const rHighA = Math.max(...ra);
  const rHighB = Math.max(...rb);
  if (pLowB < pLowA && rLowB > rLowA) return "إيجابي";
  if (pHighB > pHighA && rHighB < rHighA) return "سلبي";
  return "لا يوجد";
}

export function analyzeTF(tf: string, c: Candle[]): TFAnalysis {
  const close = c.map((x) => x.c);
  const e20 = last(ema(close, 20));
  const e50 = last(ema(close, 50));
  const e200 = last(ema(close, Math.min(200, Math.max(20, Math.floor(close.length / 2)))));
  const rArr = rsi(close, 14);
  const r = last(rArr);
  const m = macd(close);
  const mh = last(m.hist);
  const mhPrev = (m.hist[m.hist.length - 2] ?? mh) as number;
  const ml = last(m.line);
  const a = last(atr(c, 14));
  const dir = directional(c, 14);
  const adxV = last(dir.adx);
  const pdiV = last(dir.pdi);
  const mdiV = last(dir.mdi);
  const st = stochastic(c);
  const bb = bollinger(close);
  const bbw = (bb[bb.length - 1]?.width ?? 0) as number;
  const price = close[close.length - 1]!;
  const vw = vwap(c);
  const sl = slope(close, 20);
  const structure = marketStructure(c);
  const divergence = rsiDivergence(c, rArr);
  const volPct = (a / price) * 100;

  let bias = 0;
  const reasons: string[] = [];

  /* 1) هيكل الاتجاه (وزن أعلى للمعطيات الأكثر موثوقية) */
  if (e20 > e50 && e50 > e200) {
    bias += 20;
    reasons.push("ترتيب صاعد كامل للمتوسطات EMA20>EMA50>EMA200");
  } else if (e20 < e50 && e50 < e200) {
    bias -= 20;
    reasons.push("ترتيب هابط كامل للمتوسطات EMA20<EMA50<EMA200");
  } else {
    reasons.push("تشابك المتوسطات — اتجاه غير محسوم");
  }
  if (price > e20) bias += 8;
  else bias -= 8;

  /* 2) الزخم الاتجاهي عبر DI (بديل أدق من مجرد ADX) */
  const diGap = pdiV - mdiV;
  if (adxV >= 20) {
    bias += Math.max(-18, Math.min(18, diGap * 1.2));
    reasons.push(`ADX ${adxV.toFixed(1)} مع ${diGap >= 0 ? "+DI" : "-DI"} مسيطر (فارق ${Math.abs(diGap).toFixed(1)})`);
  } else {
    reasons.push(`ADX ${adxV.toFixed(1)} — بيئة عرضية، تقليل وزن الاتجاه`);
  }

  /* 3) ميل الانحدار الخطي */
  bias += Math.max(-14, Math.min(14, sl * 6));
  reasons.push(`ميل الانحدار ${sl >= 0 ? "+" : ""}${sl.toFixed(2)}٪ عبر آخر 20 شمعة`);

  /* 4) الزخم: MACD واتجاه الهيستوجرام */
  if (mh > 0) bias += 8;
  else bias -= 8;
  if (mh > mhPrev) bias += 5;
  else bias -= 5;
  reasons.push(`MACD ${mh > 0 ? "موجب" : "سالب"} و${mh > mhPrev ? "يتصاعد" : "يتراجع"}`);

  /* 5) RSI مع معالجة صحيحة للتشبع داخل الاتجاه */
  const strongTrend = adxV >= 25;
  if (r > 55) bias += Math.min((r - 50) * 0.6, 12);
  else if (r < 45) bias -= Math.min((50 - r) * 0.6, 12);
  if (!strongTrend) {
    if (r > 72) {
      bias -= 10;
      reasons.push("تشبع شرائي في سوق عرضي — خطر ارتداد");
    }
    if (r < 28) {
      bias += 10;
      reasons.push("تشبع بيعي في سوق عرضي — احتمال ارتداد صاعد");
    }
  } else reasons.push(`RSI ${r.toFixed(1)} داخل اتجاه قوي — التشبع ليس إشارة انعكاس`);

  /* 6) البنية السعرية */
  if (structure === "قمم وقيعان صاعدة") {
    bias += 12;
    reasons.push("بنية السوق: قمم وقيعان صاعدة");
  } else if (structure === "قمم وقيعان هابطة") {
    bias -= 12;
    reasons.push("بنية السوق: قمم وقيعان هابطة");
  }

  /* 7) الدايفرجنس */
  if (divergence === "إيجابي") {
    bias += 9;
    reasons.push("دايفرجنس إيجابي بين السعر وRSI");
  } else if (divergence === "سلبي") {
    bias -= 9;
    reasons.push("دايفرجنس سلبي بين السعر وRSI");
  }

  /* 8) VWAP وستوكاستيك (وزن خفيف) */
  const k = last(st.k) as number;
  const d = last(st.d) as number;
  bias += k > d ? 4 : -4;
  if (vw != null) {
    bias += price > vw ? 6 : -6;
    reasons.push(`السعر ${price > vw ? "فوق" : "تحت"} VWAP (${vw.toFixed(2)})`);
  }

  /* معايرة نهائية حسب وضوح الاتجاه */
  const factor = adxV >= 30 ? 1.2 : adxV >= 22 ? 1.05 : adxV < 16 ? 0.6 : 0.85;
  bias = Math.max(-100, Math.min(100, bias * factor));

  /* جودة البيئة: تقلب مناسب + اتجاه واضح + بنية متسقة */
  let quality = 50;
  quality += adxV >= 25 ? 20 : adxV < 16 ? -20 : 0;
  quality += volPct >= 0.08 && volPct <= 0.9 ? 15 : -15;
  quality += bbw < 0.004 ? -15 : 5;
  quality += structure !== "بنية متداخلة" ? 10 : -5;
  quality = Math.max(0, Math.min(100, quality));

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
    pdi: pdiV,
    mdi: mdiV,
    atr: a,
    stochK: k,
    stochD: d,
    bbWidth: bbw,
    vwap: vw,
    slope: sl,
    structure,
    divergence,
    volPct,
    trend,
    trendStrength: Math.min(100, Math.round(adxV)),
    bias: Math.round(bias),
    quality: Math.round(quality),
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

const WEIGHTS: Record<string, number> = { "5m": 0.15, "15m": 0.3, "1h": 0.35, "1d": 0.2 };

/**
 * اختبار تاريخي سريع (walk-forward) لقاعدة الدخول على نفس الفريم،
 * يُستخدم لمعايرة درجة الثقة بدل الاعتماد على أرقام نظرية.
 */
export function backtest(c: Candle[], lookback = 400) {
  const n = c.length;
  const startI = Math.max(60, n - lookback);
  const close = c.map((x) => x.c);
  const e20 = ema(close, 20);
  const e50 = ema(close, 50);
  const r = rsi(close, 14);
  const m = macd(close);
  const dir = directional(c, 14);
  const a = atr(c, 14);
  let wins = 0;
  let losses = 0;
  let rSum = 0;
  for (let i = startI; i < n - 12; i++) {
    const av = a[i];
    const ad = dir.adx[i];
    if (av == null || !av || ad == null || ad < 20) continue;
    const up = (e20[i] ?? 0) > (e50[i] ?? 0) && (m.hist[i] ?? 0) > 0 && (r[i] ?? 50) > 50;
    const dn = (e20[i] ?? 0) < (e50[i] ?? 0) && (m.hist[i] ?? 0) < 0 && (r[i] ?? 50) < 50;
    if (!up && !dn) continue;
    const entry = close[i]!;
    const stop = up ? entry - av * 1.2 : entry + av * 1.2;
    const target = up ? entry + av * 2.0 : entry - av * 2.0;
    let done = false;
    for (let j = i + 1; j <= Math.min(n - 1, i + 12); j++) {
      const hit = up ? c[j]!.h >= target : c[j]!.l <= target;
      const out = up ? c[j]!.l <= stop : c[j]!.h >= stop;
      if (out) {
        losses++;
        rSum -= 1;
        done = true;
        break;
      }
      if (hit) {
        wins++;
        rSum += 2.0 / 1.2;
        done = true;
        break;
      }
    }
    if (!done) {
      const exit = close[Math.min(n - 1, i + 12)]!;
      const rMul = ((up ? exit - entry : entry - exit) / (av * 1.2)) as number;
      rSum += rMul;
      if (rMul > 0) wins++;
      else losses++;
    }
    i += 3; // تجنب تكرار نفس الإشارة
  }
  const trades = wins + losses;
  return {
    trades,
    winRate: trades ? (wins / trades) * 100 : 0,
    expectancy: trades ? rSum / trades : 0,
  };
}

export function buildSignal(
  tfs: TFAnalysis[],
  lv: ReturnType<typeof levels>,
  execATR: number,
  price: number,
  bt?: { trades: number; winRate: number; expectancy: number },
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
  const notes: string[] = [];

  /* فلتر الاتجاه الأعلى: لا نتداول ضد فريم الساعة/اليوم */
  const htf = tfs.find((t) => t.tf === "1h") ?? tfs.find((t) => t.tf === "1d");
  const against = htf && Math.abs(htf.bias) > 25 && Math.sign(htf.bias) !== Math.sign(score);
  if (against) notes.push(`الإشارة تعاكس اتجاه فريم ${htf!.tf} — تم خفض الأولوية بشدة`);

  const avgQuality = tfs.reduce((s, t) => s + t.quality, 0) / (tfs.length || 1);

  let confidence = Math.round(Math.abs(score) * 0.55 + (aligned / (tfs.length || 1)) * 22 + avgQuality * 0.2);
  if (bt && bt.trades >= 12) {
    const edge = (bt.winRate - 50) * 0.35 + bt.expectancy * 8;
    confidence = Math.round(confidence + Math.max(-18, Math.min(15, edge)));
    notes.push(
      `معايرة تاريخية: ${bt.trades} صفقة، نسبة نجاح ${bt.winRate.toFixed(0)}٪، توقّع ${bt.expectancy.toFixed(2)}R`,
    );
  }
  if (against) confidence = Math.round(confidence * 0.55);

  const choppy = tfs.filter((t) => t.trend === "عرضي").length >= tfs.length / 2;
  if (choppy) {
    confidence = Math.round(confidence * 0.75);
    notes.push("أغلب الفريمات عرضية — تقليل حجم الصفقة");
  }
  confidence = Math.max(0, Math.min(94, confidence));
  notes.push(`توافق الفريمات: ${aligned}/${tfs.length} • جودة البيئة ${avgQuality.toFixed(0)}٪`);

  const nearestRes = lv.resistances[0]?.price ?? price + execATR * 3;
  const nearestSup = lv.supports[0]?.price ?? price - execATR * 3;

  let action: Signal["action"] = "انتظار";
  if (!against && score >= 25 && confidence >= 52) action = "شراء";
  else if (!against && score <= -25 && confidence >= 52) action = "بيع";
  else notes.push("لا توجد أفضلية إحصائية كافية — الانتظار أفضل قرار الآن");

  let stop: number;
  let targets: number[];
  if (action === "شراء") {
    stop = Math.min(nearestSup - execATR * 0.4, price - execATR * 1.1);
    targets = [price + execATR * 1.1, Math.max(nearestRes, price + execATR * 2.0), price + execATR * 3.2];
    if (nearestRes - price < execATR * 0.6) {
      notes.push("مقاومة قريبة جدًا — يفضل انتظار الاختراق وإعادة الاختبار");
      confidence = Math.round(confidence * 0.8);
    }
  } else if (action === "بيع") {
    stop = Math.max(nearestRes + execATR * 0.4, price + execATR * 1.1);
    targets = [price - execATR * 1.1, Math.min(nearestSup, price - execATR * 2.0), price - execATR * 3.2];
    if (price - nearestSup < execATR * 0.6) {
      notes.push("دعم قريب جدًا — خطر ارتداد عكسي");
      confidence = Math.round(confidence * 0.8);
    }
  } else {
    stop = price - execATR * 1.1;
    targets = [price + execATR * 1.1, price + execATR * 2.0, price + execATR * 3.2];
  }

  const risk = Math.abs(price - stop) || execATR;
  const rr = Math.abs(targets[1]! - price) / risk;
  if (action !== "انتظار" && rr < 1.2) {
    action = "انتظار";
    notes.push("العائد مقابل المخاطرة أقل من 1.2 — الصفقة غير مجدية");
    confidence = Math.round(confidence * 0.7);
  }
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

/**
 * توقع سعري يمزج الانجراف الاتجاهي (مُخمَّد بجودة الاتجاه) مع الارتداد للمتوسط
 * في البيئة العرضية، ونطاق احتمالي يتوسع بجذر الزمن.
 */
export function forecast(price: number, execATR: number, score: number, adxVal = 22, anchor?: number | null) {
  const trendQuality = Math.max(0.25, Math.min(1.15, adxVal / 25));
  const drift = (score / 100) * execATR * trendQuality;
  const pull = anchor != null && adxVal < 20 ? (anchor - price) * 0.25 : 0;
  const mk = (h: number) => {
    const sq = Math.sqrt(h);
    const mid = price + drift * sq * 0.85 + pull * Math.min(1, sq / 2);
    const band = execATR * sq * (adxVal < 20 ? 0.85 : 1.05);
    return { hours: h, mid, low: mid - band, high: mid + band };
  };
  return [mk(1), mk(4), mk(8), mk(24)];
}

/* ---------- سلاسل المؤشرات للرسم البياني متعدد الطبقات ---------- */

export type SeriesPoint = {
  t: number;
  time: string;
  price: number;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  bbUp: number | null;
  bbLow: number | null;
  bbMid: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  hist: number | null;
  adx: number | null;
  atr: number | null;
  vwap: number | null;
};

export function buildSeries(c: Candle[], take = 140): SeriesPoint[] {
  const close = c.map((x) => x.c);
  const e20 = ema(close, 20);
  const e50 = ema(close, 50);
  const e200 = ema(close, Math.min(200, Math.max(20, Math.floor(close.length / 2))));
  const bb = bollinger(close, 20, 2);
  const r = rsi(close, 14);
  const m = macd(close);
  const a = atr(c, 14);
  const ad = adx(c, 14);

  // VWAP تراكمي متدحرج
  const vw: (number | null)[] = [];
  let pv = 0;
  let vv = 0;
  c.forEach((k) => {
    const tp = (k.h + k.l + k.c) / 3;
    const vol = k.v || 1;
    pv += tp * vol;
    vv += vol;
    vw.push(vv ? pv / vv : null);
  });

  const start = Math.max(0, c.length - take);
  const out: SeriesPoint[] = [];
  for (let i = start; i < c.length; i++) {
    const k = c[i]!;
    out.push({
      t: k.t,
      time: new Date(k.t).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      price: k.c,
      ema20: e20[i] ?? null,
      ema50: e50[i] ?? null,
      ema200: e200[i] ?? null,
      bbUp: bb[i]?.up ?? null,
      bbLow: bb[i]?.low ?? null,
      bbMid: bb[i]?.mid ?? null,
      rsi: r[i] ?? null,
      macd: m.line[i] ?? null,
      macdSignal: m.signal[i] ?? null,
      hist: m.hist[i] ?? null,
      adx: ad[i] ?? null,
      atr: a[i] ?? null,
      vwap: vw[i] ?? null,
    });
  }
  return out;
}

/* ---------- الاختيار التلقائي لأفضل فريم تنفيذ ---------- */

export type TFPick = {
  tf: string;
  score: number;
  reason: string;
  ranked: { tf: string; score: number }[];
  regime: "زخم اتجاهي" | "تذبذب عرضي" | "تقلب عالي" | "هدوء";
};

/**
 * يختار فريم التنفيذ الأنسب لحالة السوق الحالية:
 * وضوح الاتجاه (ADX) + قوة الانحياز + توافق باقي الفريمات + جودة التقلب.
 */
export function pickTimeframe(tfs: TFAnalysis[]): TFPick {
  const consensus = tfs.reduce((a, t) => a + t.bias, 0) / (tfs.length || 1);
  const ranked = tfs
    .map((t) => {
      const adxScore = Math.min(t.adx, 45) * 1.1; // وضوح الاتجاه
      const biasScore = Math.min(Math.abs(t.bias), 100) * 0.45;
      const align = Math.sign(t.bias) === Math.sign(consensus) ? 14 : -10;
      const volPct = (t.atr / t.price) * 100;
      // نفضل تقلبًا كافيًا للربح دون فوضى
      const volScore = volPct < 0.05 ? -12 : volPct > 1.2 ? -10 : 12;
      const squeeze = t.bbWidth < 0.004 ? -8 : 0; // انضغاط = إشارات ضعيفة
      const speed = t.tf === "5m" ? 8 : t.tf === "15m" ? 10 : t.tf === "1h" ? 6 : -4; // ملاءمة المدى القصير
      return { tf: t.tf, score: Math.round(adxScore + biasScore + align + volScore + squeeze + speed) };
    })
    .sort((a, b) => b.score - a.score);

  const bestTf = ranked[0]?.tf ?? tfs[0]?.tf ?? "15m";
  const best = tfs.find((t) => t.tf === bestTf)!;
  const volPct = (best.atr / best.price) * 100;
  const regime: TFPick["regime"] =
    best.adx >= 25 && Math.abs(best.bias) > 25
      ? "زخم اتجاهي"
      : volPct > 0.9
        ? "تقلب عالي"
        : best.adx < 18
          ? "تذبذب عرضي"
          : "هدوء";

  const reason =
    `تم اختيار فريم ${bestTf} تلقائيًا: ADX ${best.adx.toFixed(1)}، انحياز ${best.bias}، ` +
    `تقلب ${volPct.toFixed(2)}٪ من السعر، والحالة السوقية: ${regime}.`;

  return { tf: bestTf, score: ranked[0]?.score ?? 0, reason, ranked, regime };
}

/* ---------- إدارة المخاطر ---------- */

export function positionSize(balance: number, riskPct: number, entry: number, stop: number) {
  const riskAmount = (balance * riskPct) / 100;
  const perUnit = Math.abs(entry - stop);
  const units = perUnit > 0 ? riskAmount / perUnit : 0; // أونصات
  return { riskAmount, perUnit, units, lots: units / 100 };
}

/* ---------- مقارنة إشارات المحرك بحركة السعر الحقيقية ---------- */

export type MarketCompare = {
  bars: number;
  from: number;
  to: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netR: number;
  avgR: number;
  engineReturnPct: number;
  directionHitRate: number;
  buyHoldPct: number;
  marketMovePct: number;
  edgePct: number;
  maxDrawdownR: number;
};

/**
 * تقارن إشارات المحرك على آخر N شمعة بالنتيجة الفعلية لحركة سعر XAU/USD
 * (تنفيذ حقيقي: وقف خسارة/هدف على شموع فعلية) مقابل شراء وتثبيت.
 */
export function compareToMarket(c: Candle[], lookback = 400): MarketCompare {
  const n = c.length;
  const startI = Math.max(60, n - lookback);
  const close = c.map((x) => x.c);
  const e20 = ema(close, 20);
  const e50 = ema(close, 50);
  const r = rsi(close, 14);
  const m = macd(close);
  const dir = directional(c, 14);
  const a = atr(c, 14);

  let wins = 0;
  let losses = 0;
  let rSum = 0;
  let dirHits = 0;
  let pnlPct = 0;
  let equity = 0;
  let peak = 0;
  let maxDD = 0;

  for (let i = startI; i < n - 12; i++) {
    const av = a[i];
    const ad = dir.adx[i];
    if (av == null || !av || ad == null || ad < 20) continue;
    const up = (e20[i] ?? 0) > (e50[i] ?? 0) && (m.hist[i] ?? 0) > 0 && (r[i] ?? 50) > 50;
    const dn = (e20[i] ?? 0) < (e50[i] ?? 0) && (m.hist[i] ?? 0) < 0 && (r[i] ?? 50) < 50;
    if (!up && !dn) continue;

    const entry = close[i]!;
    const risk = av * 1.2;
    const stop = up ? entry - risk : entry + risk;
    const target = up ? entry + av * 2 : entry - av * 2;
    const lastIdx = Math.min(n - 1, i + 12);

    // الاتجاه الحقيقي بعد الأفق الزمني
    const after = close[lastIdx]!;
    if ((up && after > entry) || (dn && after < entry)) dirHits++;

    let exit = after;
    for (let j = i + 1; j <= lastIdx; j++) {
      const hitStop = up ? c[j]!.l <= stop : c[j]!.h >= stop;
      const hitTgt = up ? c[j]!.h >= target : c[j]!.l <= target;
      if (hitStop) {
        exit = stop;
        break;
      }
      if (hitTgt) {
        exit = target;
        break;
      }
    }
    const gain = up ? exit - entry : entry - exit;
    const rMul = gain / risk;
    rSum += rMul;
    pnlPct += (gain / entry) * 100;
    if (rMul > 0) wins++;
    else losses++;

    equity += rMul;
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, peak - equity);

    i += 3;
  }

  const trades = wins + losses;
  const first = close[startI]!;
  const last = close[n - 1]!;
  const buyHoldPct = ((last - first) / first) * 100;

  return {
    bars: n - startI,
    from: c[startI]!.t,
    to: c[n - 1]!.t,
    trades,
    wins,
    losses,
    winRate: trades ? (wins / trades) * 100 : 0,
    netR: rSum,
    avgR: trades ? rSum / trades : 0,
    engineReturnPct: pnlPct,
    directionHitRate: trades ? (dirHits / trades) * 100 : 0,
    buyHoldPct,
    marketMovePct: Math.abs(buyHoldPct),
    edgePct: pnlPct - buyHoldPct,
    maxDrawdownR: maxDD,
  };
}
