import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, Percent, RotateCcw, Trash2, Wallet, Wand2 } from "lucide-react";
import { toast } from "sonner";

import {
  clearAlerts,
  PROFILE_RISK,
  readAlerts,
  useSettings,
  type AlertItem,
  type RiskProfile,
} from "@/lib/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات المخاطرة والتنبيهات — محرك الذهب" },
      {
        name: "description",
        content: "اضبط نمط المخاطرة ونسبة المخاطرة لكل صفقة، وفعّل تنبيهات ارتفاع وانخفاض درجة الثقة داخل التطبيق.",
      },
      { property: "og:title", content: "إعدادات المخاطرة والتنبيهات" },
      { property: "og:description", content: "نمط المخاطرة، رصيد الحساب، عتبات التنبيه واختيار الفريم التلقائي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const PROFILES: RiskProfile[] = ["محافظ", "متوازن", "هجومي", "مخصص"];

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="surface-panel p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary";

function SettingsPage() {
  const { settings, update, reset, loaded } = useSettings();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => setAlerts(readAlerts()), []);

  const setProfile = (p: RiskProfile) => {
    if (p === "مخصص") update({ profile: p });
    else update({ profile: p, riskPercent: PROFILE_RISK[p] });
  };

  return (
    <div dir="rtl" className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-primary">SETTINGS</p>
            <h1 className="text-gold text-3xl font-extrabold">إعدادات المخاطرة والتنبيهات</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              اضبط نمط المخاطرة ومتى يُنبهك المحرك عند تغير درجة الثقة.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            <ArrowRight size={16} /> لوحة التحليل
          </Link>
        </header>

        {!loaded && <div className="surface-panel p-8 text-center text-muted-foreground">جارٍ تحميل الإعدادات…</div>}

        {loaded && (
          <>
            <Panel title="نمط المخاطرة" icon={<Percent size={16} />}>
              <div className="flex flex-wrap gap-2">
                {PROFILES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setProfile(p)}
                    className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${
                      settings.profile === p
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p}
                    {p !== "مخصص" && <span className="mr-1 text-[11px]">({PROFILE_RISK[p]}٪)</span>}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label={`نسبة المخاطرة لكل صفقة: ${settings.riskPercent}٪`} hint="من 0.1٪ إلى 5٪ من رأس المال">
                  <input
                    type="range"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={settings.riskPercent}
                    onChange={(e) => update({ riskPercent: Number(e.target.value), profile: "مخصص" })}
                    className="w-full accent-[var(--color-primary)]"
                  />
                </Field>
                <Field label="رصيد الحساب ($)" hint="يُستخدم لحساب حجم الصفقة المقترح">
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={settings.balance}
                    onChange={(e) => update({ balance: Number(e.target.value) || 0 })}
                    className={inputCls}
                  />
                </Field>
                <Field label="اسم الحساب (اختياري)">
                  <input
                    type="text"
                    value={settings.accountName}
                    onChange={(e) => update({ accountName: e.target.value })}
                    placeholder="مثال: حساب MT5 الرئيسي"
                    className={inputCls}
                  />
                </Field>
                <Field label="المبلغ المخاطر به لكل صفقة">
                  <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-bold text-primary">
                    ${((settings.balance * settings.riskPercent) / 100).toFixed(2)}
                  </div>
                </Field>
              </div>
            </Panel>

            <Panel title="اختيار الفريم" icon={<Wand2 size={16} />}>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-foreground">اختيار الفريم تلقائيًا</div>
                  <div className="text-[11px] text-muted-foreground">
                    يختار المحرك أفضل فريم تنفيذ مع كل تغير في السوق بدل التثبيت اليدوي على 5 دقائق.
                  </div>
                </div>
                <button
                  onClick={() => update({ autoTimeframe: !settings.autoTimeframe })}
                  className={`h-7 w-14 rounded-full transition ${settings.autoTimeframe ? "bg-primary" : "bg-muted"}`}
                  aria-pressed={settings.autoTimeframe}
                >
                  <span
                    className={`block h-6 w-6 rounded-full bg-background transition ${
                      settings.autoTimeframe ? "translate-x-1" : "translate-x-7"
                    }`}
                  />
                </button>
              </div>
            </Panel>

            <Panel title="التنبيهات" icon={<Bell size={16} />}>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div className="text-sm font-bold text-foreground">تفعيل تنبيهات درجة الثقة</div>
                <button
                  onClick={() => update({ alertsEnabled: !settings.alertsEnabled })}
                  className={`h-7 w-14 rounded-full transition ${settings.alertsEnabled ? "bg-primary" : "bg-muted"}`}
                  aria-pressed={settings.alertsEnabled}
                >
                  <span
                    className={`block h-6 w-6 rounded-full bg-background transition ${
                      settings.alertsEnabled ? "translate-x-1" : "translate-x-7"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={`تنبيه عند ارتفاع الثقة إلى: ${settings.riseThreshold}%`}>
                  <input
                    type="range"
                    min={40}
                    max={95}
                    step={1}
                    value={settings.riseThreshold}
                    onChange={(e) => update({ riseThreshold: Number(e.target.value) })}
                    className="w-full accent-[var(--color-primary)]"
                  />
                </Field>
                <Field label={`تنبيه عند انخفاض الثقة إلى: ${settings.dropThreshold}%`}>
                  <input
                    type="range"
                    min={10}
                    max={70}
                    step={1}
                    value={settings.dropThreshold}
                    onChange={(e) => update({ dropThreshold: Number(e.target.value) })}
                    className="w-full accent-[var(--color-primary)]"
                  />
                </Field>
                <Field label={`الحد الأدنى للثقة لعرض الإشارة: ${settings.minConfidence}%`}>
                  <input
                    type="range"
                    min={30}
                    max={90}
                    step={1}
                    value={settings.minConfidence}
                    onChange={(e) => update({ minConfidence: Number(e.target.value) })}
                    className="w-full accent-[var(--color-primary)]"
                  />
                </Field>
              </div>
            </Panel>

            <Panel title="ملخص التنبيهات داخل التطبيق" icon={<Bell size={16} />}>
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد تنبيهات مسجلة بعد.</p>
              ) : (
                <div className="space-y-2">
                  {alerts.map((a) => (
                    <div key={a.id} className="rounded-lg border border-border bg-card px-3 py-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-primary">{a.kind}</span>
                        <span className="text-muted-foreground">{new Date(a.at).toLocaleString("ar-EG")}</span>
                      </div>
                      <div className="mt-1 text-sm text-foreground">{a.message}</div>
                      <div className="text-[11px] text-muted-foreground">الثقة: {a.confidence}%</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    clearAlerts();
                    setAlerts([]);
                    toast.success("تم مسح سجل التنبيهات");
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-bold text-muted-foreground transition hover:text-destructive"
                >
                  <Trash2 size={14} /> مسح التنبيهات
                </button>
                <button
                  onClick={() => {
                    reset();
                    toast.success("تمت استعادة الإعدادات الافتراضية");
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-bold text-muted-foreground transition hover:text-primary"
                >
                  <RotateCcw size={14} /> استعادة الافتراضي
                </button>
                <span className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                  <Wallet size={14} /> الحساب: {settings.accountName || "غير محدد"}
                </span>
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
