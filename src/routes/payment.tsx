import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, BadgeCheck, Check, CreditCard, Crown, LoaderCircle, Rocket, ShieldCheck, Sparkles } from "lucide-react";

import { createCheckout, paymentsReady } from "@/lib/billing.functions";
import { PLAN_LABEL, useSubscription, type Certificate } from "@/lib/license";

export const Route = createFileRoute("/payment")({
  head: () => ({
    meta: [
      { title: "الاشتراك والدفع — محرك تحليل الذهب XAU/USD" },
      {
        name: "description",
        content:
          "اشترك في محرك تحليل الذهب XAU/USD: الدفع الآمن يصدر شهادة اشتراك تلقائية تفتح لوحة المخطط والتحليل الكاملة فورًا.",
      },
      { property: "og:title", content: "الاشتراك في محرك تحليل الذهب XAU/USD" },
      { property: "og:description", content: "باقات 200$ و500$ و800$ مع تفعيل فوري بشهادة اشتراك موقّعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentPage,
});

type PlanId = "starter" | "pro" | "elite";

type Plan = {
  id: PlanId;
  price: number;
  period: string;
  tag?: string;
  icon: React.ReactNode;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: "starter",
    price: 200,
    period: "شهريًا",
    icon: <Rocket size={18} />,
    features: [
      "إشارات XAU/USD لحظية على فريم واحد",
      "الدعوم والمقاومات الأساسية",
      "تحديث تلقائي في الخلفية",
      "دعم عبر البريد",
    ],
  },
  {
    id: "pro",
    price: 500,
    period: "شهريًا",
    tag: "الأكثر اختيارًا",
    icon: <Sparkles size={18} />,
    features: [
      "تحليل متعدد الفريمات 5m/15m/1h/1d",
      "اختيار الفريم الأفضل تلقائيًا",
      "الشارت الاحترافي مع مسار التنبؤ",
      "تنبيهات ارتفاع وانخفاض الثقة",
      "نسخ الإشارة مباشرة لحساب التداول",
    ],
  },
  {
    id: "elite",
    price: 800,
    period: "شهريًا",
    icon: <Crown size={18} />,
    features: [
      "كل مزايا الباقة الاحترافية",
      "إدارة مخاطر وحجم صفقة مخصص",
      "أولوية في سرعة تحديث البيانات",
      "تقارير أداء ومقارنة بالسوق الحقيقي",
      "دعم مباشر ذو أولوية",
    ],
  },
];

function PaymentPage() {
  const { cert, active } = useSubscription();
  const [selected, setSelected] = useState<PlanId>("pro");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    paymentsReady()
      .then((r) => setReady(r.ready))
      .catch(() => setReady(false));
  }, []);

  const go = async (plan: Plan) => {
    setSelected(plan.id);
    setBusy(plan.id);
    try {
      const res = await createCheckout({
        data: { plan: plan.id, origin: window.location.origin, email: email.trim() },
      });
      window.location.href = res.url;
    } catch (e) {
      toast.error("تعذر بدء عملية الدفع", {
        description: e instanceof Error ? e.message : "حاول مرة أخرى",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-primary">SUBSCRIPTION</p>
          <h1 className="text-gold mt-1 text-3xl font-extrabold md:text-4xl">اشترك في محرك تحليل الذهب</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            الدفع الآمن يصدر لك شهادة اشتراك موقّعة تلقائيًا، وتُفتح لوحة المخطط والتحليل الكاملة فور اكتمال العملية.
          </p>
          <div className="mt-4 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-bold text-foreground transition hover:text-primary"
            >
              <ArrowRight size={15} /> العودة للمحرك
            </Link>
          </div>
        </header>

        {active && cert && <ActiveCert cert={cert} />}

        {ready === false && (
          <div className="surface-panel border-warning p-4 text-center text-sm text-warning">
            بوابة الدفع غير مُفعّلة بعد — أضف مفتاح الدفع السري ليعمل الاشتراك مباشرة.
          </div>
        )}

        <div className="mx-auto max-w-md">
          <label className="block text-xs">
            <span className="text-muted-foreground">البريد الإلكتروني (لإصدار الشهادة باسمك)</span>
            <input
              dir="ltr"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => {
            const activePlan = selected === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`surface-panel relative cursor-pointer p-6 transition ${
                  activePlan ? "glow-gold border-primary/60" : "hover:border-primary/30"
                }`}
              >
                {p.tag && (
                  <span className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
                    {p.tag}
                  </span>
                )}
                <div className="flex items-center gap-2 text-primary">
                  {p.icon}
                  <h2 className="text-base font-bold text-foreground">{PLAN_LABEL[p.id]}</h2>
                </div>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-foreground">${p.price}</span>
                  <span className="pb-1 text-xs text-muted-foreground">/ {p.period}</span>
                </div>
                <ul className="mt-5 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-muted-foreground">
                      <Check size={15} className="mt-0.5 shrink-0 text-success" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  disabled={busy !== null}
                  onClick={(e) => {
                    e.stopPropagation();
                    void go(p);
                  }}
                  className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition disabled:opacity-60 ${
                    activePlan
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {busy === p.id ? <LoaderCircle size={16} className="animate-spin" /> : <CreditCard size={16} />}
                  ادفع واحصل على الشهادة
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={14} className="text-success" /> الدفع يتم على صفحة بوابة الدفع الآمنة
          </span>
          <span>• لا نخزّن بيانات البطاقات</span>
          <span>• التحليل لأغراض تعليمية ولا يُعد نصيحة استثمارية</span>
        </div>
      </div>
    </div>
  );
}

function ActiveCert({ cert }: { cert: Certificate }) {
  return (
    <div className="surface-panel glow-gold p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-success">
          <BadgeCheck size={20} />
          <b className="text-foreground">اشتراكك مفعّل — {PLAN_LABEL[cert.plan]}</b>
        </div>
        <div className="text-xs text-muted-foreground">
          شهادة {cert.ref} • صالحة حتى {new Date(cert.expiresAt).toLocaleDateString("ar-EG")}
        </div>
      </div>
    </div>
  );
}
