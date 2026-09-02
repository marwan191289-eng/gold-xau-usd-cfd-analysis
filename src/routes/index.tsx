import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  Gauge,
  RefreshCw,
  Target,
  ShieldAlert,
  Clock,
  Signature,
  Heart,
  Copy,
  Settings as SettingsIcon,
  Wand2,
  Bell,
} from "lucide-react";

import { getGoldData } from "@/lib/gold.functions";
import {
  analyzeTF,
  atr,
  buildSeries,
  buildSignal,
  forecast,
  levels,
  pickTimeframe,
  pivots,
  positionSize,
} from "@/lib/analysis";
import type { Candle } from "@/lib/analysis";
import { MarketChart } from "@/components/MarketChart";
import { pushAlert, useSettings } from "@/lib/settings";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "محرك تحليل الذهب XAU/USD — إشارات واتجاهات لحظية" },
      {
        name: "description",
        content:
          "محرك تحليل احترافي للذهب XAU/USD: اتجاهات متعددة الفريمات، دعوم ومقاومات دقيقة، إشارات دخول وأهداف ووقف خسارة وتوقعات قصيرة المدى.",
      },
      { property: "og:title", content: "محرك تحليل الذهب XAU/USD" },
      {
        property: "og:description",
        content: "تحليل لحظي للذهب: الاتجاه، الدعوم والمقاومات، إشارة التداول والتوقعات القصيرة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GoldEngine,
});

const f2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Panel({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface-panel p-5 ${className}`}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function GoldEngine() {
  const fetchGold = useServerFn(getGoldData);
  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["gold"],
    queryFn: () => fetchGold(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const engine = useMemo(() => {
    if (!data) return null;
    const d = data.data as Record<string, Candle[]>;
    const tfs = ["5m", "15m", "1h", "1d"].filter((k) => (d[k]?.length ?? 0) > 60).map((k) => analyzeTF(k, d[k]!));
    const exec = d["5m"]!;
    const execATRArr = atr(exec, 14);
    const execATR = (execATRArr[execATRArr.length - 1] as number) || data.price * 0.002;
    const price = data.price;
    const lv = levels(d["15m"] ?? exec, execATR * 1.5);
    const piv = pivots(d["1h"] ?? exec, 24);
    const score = tfs.reduce((a, t) => a + t.bias, 0) / (tfs.length || 1);
    const sig = buildSignal(tfs, lv, execATR, price);
    const fc = forecast(price, execATR, score);
    const chart = exec.slice(-120).map((c) => ({
      time: new Date(c.t).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      price: c.c,
    }));
    const change = ((price - exec[Math.max(0, exec.length - 78)]!.c) / price) * 100;
    return { tfs, execATR, price, lv, piv, sig, fc, chart, score, change };
  }, [data]);

  return (
    <div dir="rtl" className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-primary">GOLD ENGINE</p>
            <h1 className="text-gold text-3xl font-extrabold md:text-4xl">محرك تحليل الذهب XAU/USD</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              اتجاهات متعددة الفريمات • دعوم ومقاومات • إشارة تداول • توقعات قصيرة المدى
            </p>
          </div>
          <div className="flex items-center gap-3">
            {engine && (
              <div className="text-left">
                <div className="text-3xl font-extrabold text-foreground">${f2(engine.price)}</div>
                <div
                  className={`flex items-center justify-end gap-1 text-sm font-semibold ${
                    engine.change >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {engine.change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  {engine.change.toFixed(2)}٪ / 24 ساعة
                </div>
              </div>
            )}
            <button
              onClick={() => refetch()}
              className="glow-gold inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
              تحديث
            </button>
          </div>
        </header>

        {isLoading && <div className="surface-panel p-10 text-center text-muted-foreground">جارٍ تحليل السوق…</div>}
        {error && (
          <div className="surface-panel border-destructive p-6 text-center text-destructive">
            تعذر جلب بيانات السوق. حاول التحديث مرة أخرى.
          </div>
        )}

        {engine && (
          <>
            {/* الإشارة */}
            <Panel title="إشارة التداول اللحظية" icon={<Target size={16} />} className="glow-gold">
              <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                <div className="flex flex-col items-center justify-center rounded-xl bg-secondary p-5">
                  <span
                    className={`text-4xl font-extrabold ${
                      engine.sig.action === "شراء"
                        ? "text-success"
                        : engine.sig.action === "بيع"
                          ? "text-destructive"
                          : "text-warning"
                    }`}
                  >
                    {engine.sig.action}
                  </span>
                  <span className="mt-2 text-xs text-muted-foreground">درجة الثقة</span>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${engine.sig.confidence}%` }} />
                  </div>
                  <span className="mt-1 text-lg font-bold text-primary">{engine.sig.confidence}%</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { l: "سعر الدخول", v: `$${f2(engine.sig.entry)}` },
                    { l: "وقف الخسارة", v: `$${f2(engine.sig.stop)}`, c: "text-destructive" },
                    { l: "الهدف 1", v: `$${f2(engine.sig.targets[0]!)}`, c: "text-success" },
                    { l: "الهدف 2", v: `$${f2(engine.sig.targets[1]!)}`, c: "text-success" },
                    { l: "الهدف 3", v: `$${f2(engine.sig.targets[2]!)}`, c: "text-success" },
                    { l: "العائد/المخاطرة", v: `1 : ${engine.sig.rr.toFixed(2)}` },
                  ].map((x) => (
                    <div key={x.l} className="rounded-lg border border-border bg-card px-3 py-2">
                      <div className="text-[11px] text-muted-foreground">{x.l}</div>
                      <div className={`text-base font-bold ${x.c ?? "text-foreground"}`}>{x.v}</div>
                    </div>
                  ))}
                  <div className="col-span-2 rounded-lg border border-border bg-card px-3 py-2 sm:col-span-3">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock size={12} /> الأفق الزمني: {engine.sig.horizon}
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {engine.sig.notes.map((n) => (
                        <li key={n}>• {n}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Panel>

            {/* اختيار الفريم تلقائيًا */}
            <Panel title="اختيار الفريم تلقائيًا حسب حالة السوق" icon={<Wand2 size={16} />}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg bg-primary/15 px-3 py-1.5 text-lg font-extrabold text-primary">
                  {engine.pick.tf}
                </span>
                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-bold text-foreground">
                  الحالة: {engine.pick.regime}
                </span>
                {engine.pick.ranked.map((r) => (
                  <span
                    key={r.tf}
                    className={`rounded-md px-2 py-1 text-[11px] ${
                      r.tf === engine.pick.tf ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r.tf}: {r.score}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{engine.pick.reason}</p>
            </Panel>

            {/* المخطط متعدد الطبقات */}
            <Panel title="مخطط XAU/USD — الطبقات والمؤشرات" icon={<Activity size={16} />}>
              <MarketChart series={engine.series} lv={engine.lv} tf={engine.execTf} analysis={engine.execAnalysis} />
            </Panel>


            <div className="grid gap-6 lg:grid-cols-2">
              {/* الاتجاهات */}
              <Panel title="الاتجاه حسب الفريم الزمني" icon={<Gauge size={16} />}>
                <div className="space-y-3">
                  {engine.tfs.map((t) => (
                    <div key={t.tf} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">{t.tf}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                            t.trend === "صاعد"
                              ? "bg-success/15 text-success"
                              : t.trend === "هابط"
                                ? "bg-destructive/15 text-destructive"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t.trend}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                        <div>RSI: <b className="text-foreground">{t.rsi.toFixed(1)}</b></div>
                        <div>ADX: <b className="text-foreground">{t.adx.toFixed(1)}</b></div>
                        <div>MACD: <b className={t.macdHist >= 0 ? "text-success" : "text-destructive"}>{t.macdHist.toFixed(2)}</b></div>
                        <div>ATR: <b className="text-foreground">{t.atr.toFixed(2)}</b></div>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full ${t.bias >= 0 ? "bg-success" : "bg-destructive"}`}
                          style={{ width: `${Math.min(100, Math.abs(t.bias))}%`, marginInlineStart: "auto" }}
                        />
                      </div>
                      <details className="mt-2 text-[11px] text-muted-foreground">
                        <summary className="cursor-pointer">تفاصيل القراءة</summary>
                        <ul className="mt-1 space-y-0.5">
                          {t.reasons.map((r) => (
                            <li key={r}>• {r}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* الدعوم والمقاومات */}
              <Panel title="الدعوم والمقاومات" icon={<ShieldAlert size={16} />}>
                <div className="space-y-2">
                  {engine.lv.resistances
                    .slice()
                    .reverse()
                    .map((r) => (
                      <div
                        key={r.price}
                        className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm"
                      >
                        <span className="font-semibold text-destructive">مقاومة</span>
                        <span className="font-bold">${f2(r.price)}</span>
                        <span className="text-[11px] text-muted-foreground">قوة: {r.touches} لمسة</span>
                      </div>
                    ))}
                  <div className="rounded-lg border border-primary bg-primary/10 px-3 py-2 text-center text-sm font-bold text-primary">
                    السعر الحالي ${f2(engine.price)}
                  </div>
                  {engine.lv.supports.map((s) => (
                    <div
                      key={s.price}
                      className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-success">دعم</span>
                      <span className="font-bold">${f2(s.price)}</span>
                      <span className="text-[11px] text-muted-foreground">قوة: {s.touches} لمسة</span>
                    </div>
                  ))}
                </div>
                {engine.piv && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-xs font-bold text-muted-foreground">نقاط البيفوت الكلاسيكية</h3>
                    <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                      {[
                        ["R3", engine.piv.r3],
                        ["R2", engine.piv.r2],
                        ["R1", engine.piv.r1],
                        ["PP", engine.piv.p],
                        ["S1", engine.piv.s1],
                        ["S2", engine.piv.s2],
                        ["S3", engine.piv.s3],
                      ].map(([l, v]) => (
                        <div key={l as string} className="rounded-md bg-secondary px-2 py-1">
                          <div className="text-muted-foreground">{l as string}</div>
                          <div className="font-bold">{f2(v as number)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            </div>

            {/* التوقعات */}
            <Panel title="التوقعات قصيرة المدى (نطاق احتمالي)" icon={<Clock size={16} />}>
              <div className="grid gap-3 sm:grid-cols-4">
                {engine.fc.map((f) => (
                  <div key={f.hours} className="rounded-lg border border-border bg-card p-3 text-center">
                    <div className="text-xs text-muted-foreground">بعد {f.hours} ساعة</div>
                    <div className="mt-1 text-lg font-bold text-primary">${f2(f.mid)}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      النطاق: {f2(f.low)} — {f2(f.high)}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                التوقعات محسوبة عبر انحراف الاتجاه المرجّح مع تقلب ATR، وليست ضمانًا لحركة السوق. إدارة رأس المال
                والالتزام بوقف الخسارة أهم من الإشارة نفسها. آخر تحديث:{" "}
                {new Date(dataUpdatedAt).toLocaleTimeString("ar-EG")} — المصدر: {data?.symbol}
              </p>
            </Panel>
</>
        )}

        {/* توقيع المطور */}
        <footer className="signature-card relative overflow-hidden rounded-2xl px-6 py-6 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
          />
          <div className="flex flex-col items-center justify-center gap-1">
            <Signature size={18} className="text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-muted-foreground">Developer</p>
            <p className="neon-text font-signature text-4xl font-bold md:text-5xl">Marwan Negm</p>
            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-primary/50" />
              <span className="flex items-center gap-1.5">
                <Heart size={11} className="fill-destructive text-destructive" />
                صُنع بشغف لعشّاق الذهب
              </span>
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-primary/50" />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
