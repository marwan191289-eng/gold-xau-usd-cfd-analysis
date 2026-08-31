import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint, TFAnalysis, levels as levelsFn } from "@/lib/analysis";

type Levels = ReturnType<typeof levelsFn>;

type LayerKey = "ema20" | "ema50" | "ema200" | "bollinger" | "vwap" | "sr";

const LAYERS: { key: LayerKey; label: string; color: string }[] = [
  { key: "ema20", label: "EMA 20", color: "var(--color-primary)" },
  { key: "ema50", label: "EMA 50", color: "#7dd3fc" },
  { key: "ema200", label: "EMA 200", color: "#c084fc" },
  { key: "bollinger", label: "Bollinger", color: "#94a3b8" },
  { key: "vwap", label: "VWAP", color: "#f472b6" },
  { key: "sr", label: "دعوم/مقاومات", color: "var(--color-success)" },
];

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-foreground)",
  fontSize: 12,
} as const;

export function MarketChart({
  series,
  lv,
  tf,
  analysis,
}: {
  series: SeriesPoint[];
  lv: Levels;
  tf: string;
  analysis: TFAnalysis;
}) {
  const [on, setOn] = useState<Record<LayerKey, boolean>>({
    ema20: true,
    ema50: true,
    ema200: false,
    bollinger: true,
    vwap: true,
    sr: true,
  });

  const toggle = (k: LayerKey) => setOn((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-primary/15 px-2 py-1 text-xs font-bold text-primary">فريم {tf}</span>
        {LAYERS.map((l) => (
          <button
            key={l.key}
            onClick={() => toggle(l.key)}
            className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
              on[l.key]
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* السعر + الطبقات */}
      <div className="h-72 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} minTickGap={44} />
            <YAxis
              domain={["dataMin - 2", "dataMax + 2"]}
              tickFormatter={(v: number) => v.toFixed(0)}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              width={58}
            />
            <RTooltip contentStyle={tooltipStyle} formatter={(v) => (typeof v === "number" ? v.toFixed(2) : v)} />
            {on.bollinger && (
              <>
                <Line dataKey="bbUp" stroke="#94a3b8" strokeOpacity={0.7} strokeWidth={1} dot={false} />
                <Line dataKey="bbLow" stroke="#94a3b8" strokeOpacity={0.7} strokeWidth={1} dot={false} />
                <Line dataKey="bbMid" stroke="#94a3b8" strokeOpacity={0.4} strokeDasharray="3 3" strokeWidth={1} dot={false} />
              </>
            )}
            <Area dataKey="price" stroke="var(--color-primary)" strokeWidth={2} fill="url(#priceFill)" dot={false} />
            {on.ema20 && <Line dataKey="ema20" stroke="var(--color-primary)" strokeWidth={1.5} dot={false} />}
            {on.ema50 && <Line dataKey="ema50" stroke="#7dd3fc" strokeWidth={1.5} dot={false} />}
            {on.ema200 && <Line dataKey="ema200" stroke="#c084fc" strokeWidth={1.5} dot={false} />}
            {on.vwap && <Line dataKey="vwap" stroke="#f472b6" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />}
            {on.sr &&
              lv.supports.map((s) => (
                <ReferenceLine
                  key={`s${s.price}`}
                  y={s.price}
                  stroke="var(--color-success)"
                  strokeDasharray="4 4"
                  label={{ value: `دعم ${s.price.toFixed(1)}`, fill: "var(--color-success)", fontSize: 10, position: "insideLeft" }}
                />
              ))}
            {on.sr &&
              lv.resistances.map((r) => (
                <ReferenceLine
                  key={`r${r.price}`}
                  y={r.price}
                  stroke="var(--color-destructive)"
                  strokeDasharray="4 4"
                  label={{ value: `مقاومة ${r.price.toFixed(1)}`, fill: "var(--color-destructive)", fontSize: 10, position: "insideLeft" }}
                />
              ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* RSI */}
      <div className="h-28 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.3} vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} width={58} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v) => (typeof v === "number" ? v.toFixed(1) : v)} />
            <ReferenceLine y={70} stroke="var(--color-destructive)" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="var(--color-success)" strokeDasharray="3 3" />
            <Line dataKey="rsi" name="RSI" stroke="var(--color-primary)" strokeWidth={1.6} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* MACD */}
      <div className="h-28 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.3} vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} width={58} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v) => (typeof v === "number" ? v.toFixed(2) : v)} />
            <ReferenceLine y={0} stroke="var(--color-border)" />
            <Bar dataKey="hist" name="Histogram" fill="var(--color-primary)" fillOpacity={0.45} />
            <Line dataKey="macd" name="MACD" stroke="#7dd3fc" strokeWidth={1.5} dot={false} />
            <Line dataKey="macdSignal" name="Signal" stroke="#f472b6" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ADX + ATR */}
      <div className="h-28 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.3} vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis yAxisId="adx" domain={[0, 60]} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} width={58} />
            <YAxis yAxisId="atr" orientation="right" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} width={44} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v) => (typeof v === "number" ? v.toFixed(2) : v)} />
            <ReferenceLine yAxisId="adx" y={25} stroke="var(--color-warning, #f59e0b)" strokeDasharray="3 3" />
            <Line yAxisId="adx" dataKey="adx" name="ADX" stroke="#c084fc" strokeWidth={1.6} dot={false} />
            <Line yAxisId="atr" dataKey="atr" name="ATR" stroke="var(--color-primary)" strokeWidth={1.4} strokeDasharray="4 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[11px] sm:grid-cols-6">
        {[
          ["EMA20", analysis.ema20.toFixed(2)],
          ["EMA50", analysis.ema50.toFixed(2)],
          ["RSI", analysis.rsi.toFixed(1)],
          ["MACD", analysis.macdHist.toFixed(2)],
          ["ADX", analysis.adx.toFixed(1)],
          ["ATR", analysis.atr.toFixed(2)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-md bg-secondary px-2 py-1.5">
            <div className="text-muted-foreground">{l}</div>
            <div className="font-bold text-foreground">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
