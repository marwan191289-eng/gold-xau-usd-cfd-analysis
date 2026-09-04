import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Bar,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Candle, Signal } from "@/lib/analysis";

type ForecastPoint = { hours: number; mid: number; low: number; high: number };

type Row = {
  label: string;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  candle?: [number, number];
  fcMid?: number | null;
  fcBand?: [number, number] | null;
  isFuture: boolean;
};

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-foreground)",
  fontSize: 12,
} as const;

function CandleShape(props: any) {
  const { x, y, width, height, payload } = props;
  const row = payload as Row;
  if (!row?.candle || row.h === undefined || row.l === undefined) return <g />;
  const range = row.h - row.l;
  const ppp = range === 0 ? 0 : height / range;
  const up = (row.c ?? 0) >= (row.o ?? 0);
  const color = up ? "var(--color-success)" : "var(--color-destructive)";
  const top = Math.max(row.o ?? 0, row.c ?? 0);
  const bottom = Math.min(row.o ?? 0, row.c ?? 0);
  const bodyY = y + (row.h - top) * ppp;
  const bodyH = Math.max(1, (top - bottom) * ppp);
  const bw = Math.max(2, width * 0.62);
  const cx = x + width / 2;

  return (
    <g>
      <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={cx - bw / 2} y={bodyY} width={bw} height={bodyH} fill={color} fillOpacity={up ? 0.85 : 0.9} rx={1} />
    </g>
  );
}

export function ProChart({
  candles,
  signal,
  fc,
  tf,
}: {
  candles: Candle[];
  signal: Signal;
  fc: ForecastPoint[];
  tf: string;
}) {
  const [bars, setBars] = useState(70);
  const [showFc, setShowFc] = useState(true);
  const [showLevels, setShowLevels] = useState(true);

  const rows = useMemo<Row[]>(() => {
    const slice = candles.slice(Math.max(0, candles.length - bars));
    const hist: Row[] = slice.map((k) => ({
      label: new Date(k.t).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      o: k.o,
      h: k.h,
      l: k.l,
      c: k.c,
      candle: [k.l, k.h] as [number, number],
      fcMid: null,
      fcBand: null,
      isFuture: false,
    }));
    if (hist.length) {
      const last = slice[slice.length - 1]!;
      hist[hist.length - 1] = { ...hist[hist.length - 1]!, fcMid: last.c, fcBand: [last.c, last.c] };
    }
    const future: Row[] = showFc
      ? fc.map((p) => ({
          label: `+${p.hours}س`,
          fcMid: p.mid,
          fcBand: [p.low, p.high] as [number, number],
          isFuture: true,
        }))
      : [];
    return [...hist, ...future];
  }, [candles, bars, fc, showFc]);

  const domain = useMemo(() => {
    const vals: number[] = [];
    rows.forEach((r) => {
      if (r.h !== undefined) vals.push(r.h);
      if (r.l !== undefined) vals.push(r.l);
      if (r.fcBand) vals.push(r.fcBand[0], r.fcBand[1]);
    });
    vals.push(signal.entry, signal.stop, ...signal.targets);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.06 || 1;
    return [min - pad, max + pad] as [number, number];
  }, [rows, signal]);

  const chip = (active: boolean) =>
    `rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
      active
        ? "border-primary/60 bg-primary/10 text-primary"
        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-primary/15 px-2 py-1 text-xs font-bold text-primary">شموع {tf}</span>
        {[40, 70, 120].map((n) => (
          <button key={n} onClick={() => setBars(n)} className={chip(bars === n)}>
            {n} شمعة
          </button>
        ))}
        <button onClick={() => setShowFc((v) => !v)} className={chip(showFc)}>
          مسار التنبؤ
        </button>
        <button onClick={() => setShowLevels((v) => !v)} className={chip(showLevels)}>
          مستويات الإشارة
        </button>
      </div>

      <div className="h-96 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 60, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="fcBandFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.32} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} minTickGap={38} />
            <YAxis
              domain={domain}
              orientation="right"
              tickFormatter={(v: number) => v.toFixed(1)}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              width={62}
            />
            <RTooltip
              contentStyle={tooltipStyle}
              formatter={(v: unknown, name: string) => {
                if (Array.isArray(v)) return [`${v[0]?.toFixed?.(2)} – ${v[1]?.toFixed?.(2)}`, name];
                return [typeof v === "number" ? v.toFixed(2) : String(v), name];
              }}
              labelFormatter={(l) => `الوقت: ${l}`}
            />

            <Bar dataKey="candle" name="OHLC" shape={<CandleShape />} isAnimationActive={false} />

            {showFc && (
                <Area
                  dataKey="fcBand"
                  name="نطاق التنبؤ"
                  stroke="var(--color-primary)"
                  strokeOpacity={0.35}
                  strokeWidth={1}
                  fill="url(#fcBandFill)"
                  connectNulls
                  isAnimationActive={false}
                />
            )}
            {showFc && (
                <Line
                  dataKey="fcMid"
                  name="المسار المتوقع"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 2.5, fill: "var(--color-primary)" }}
                  connectNulls
                  isAnimationActive={false}
                />
            )}

            {showLevels && (
                <ReferenceLine
                  y={signal.entry}
                  stroke="var(--color-primary)"
                  strokeDasharray="5 4"
                  label={{ value: `دخول ${signal.entry.toFixed(1)}`, fill: "var(--color-primary)", fontSize: 10, position: "insideLeft" }}
                />
            )}
            {showLevels && (
                <ReferenceLine
                  y={signal.stop}
                  stroke="var(--color-destructive)"
                  strokeDasharray="5 4"
                  label={{ value: `وقف ${signal.stop.toFixed(1)}`, fill: "var(--color-destructive)", fontSize: 10, position: "insideLeft" }}
                />
            )}
            {showLevels &&
                signal.targets.map((t, i) => (
                  <ReferenceLine
                    key={t}
                    y={t}
                    stroke="var(--color-success)"
                    strokeOpacity={0.85 - i * 0.18}
                    strokeDasharray="4 5"
                    label={{ value: `هدف ${i + 1} ${t.toFixed(1)}`, fill: "var(--color-success)", fontSize: 10, position: "insideLeft" }}
                  />
                ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-[11px] sm:grid-cols-4">
        {fc.map((p) => (
          <div key={p.hours} className="rounded-md bg-secondary px-2 py-1.5">
            <div className="text-muted-foreground">بعد {p.hours} ساعة</div>
            <div className="font-bold text-foreground">${p.mid.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">
              {p.low.toFixed(1)} – {p.high.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
