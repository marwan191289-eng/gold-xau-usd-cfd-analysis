import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, CreditCard, Crown, Link2, Rocket, ShieldCheck, Sparkles } from "lucide-react";

import { useSettings, type PlanId } from "@/lib/settings";

export const Route = createFileRoute("/payment")({
  head: () => ({
    meta: [
      { title: "الاشتراك والدفع — محرك تحليل الذهب XAU/USD" },
      {
        name: "description",
        content: "اختر باقة الاشتراك في محرك تحليل الذهب XAU/USD: إشارات لحظية، تنبؤات، وتنبيهات ثقة — دفع آمن عبر رابط الدفع.",
      },
      { property: "og:title", content: "الاشتراك في محرك تحليل الذهب XAU/USD" },
      { property: "og:description", content: "باقات 200$ و500$ و800$ للوصول الكامل لإشارات وتنبؤات الذهب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentPage,
});

type Plan = {
  id: PlanId;
  name: string;
  price: number;
  period: string;
  tag?: string;
  icon: React.ReactNode;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "الباقة الأساسية",
    price: 200,
    period: "شهريًا",
    icon: <Rocket size={18} />,
    features: [
      "إشارات XAU/USD لحظية على فريم واحد",
      "الدعوم والمقاومات الأساسية",
      "تحديث تلقائي كل 60 ثانية",
      "دعم عبر البريد",
    ],
  },
  {
    id: "pro",
    name: "الباقة الاحترافية",
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
    name: "باقة النخبة",
    price: 800,
    period: "شهريًا",
    icon: <Crown size={18} />,
    features: [
      "كل مزايا الباقة الاحترافية",
      "إدارة مخاطر وحجم صفقة مخصص",
      "أولوية في سرعة تحديث البيانات",
      "تقارير أداء وتوقعات ممتدة",
      "دعم مباشر ذو أولوية",
    ],
  },
];

function PaymentPage() {
  const { settings, update, loaded } = useSettings();
  const [selected, setSelected] = useState<PlanId>("pro");
  const [editLinks, setEditLinks] = useState(false);

  const go = (plan: Plan) => {
    const url = settings.payLinks[plan.id]?.trim();
    if (!url) {
      setEditLinks(true);
      toast.error("لا يوجد رابط دفع لهذه الباقة", {
        description: "أضف رابط الدفع الخاص بك ثم أعد المحاولة",
      });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div dir="rtl" className="min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-primary">SUBSCRIPTION</p>
          <h1 className="text-gold mt-1 text-3xl font-extrabold md:text-4xl">اشترك في محرك تحليل الذهب</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            وصول كامل لإشارات XAU/USD اللحظية، الشارت الاحترافي، التنبؤات قصيرة المدى وتنبيهات درجة الثقة.
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

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => {
            const active = selected === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`surface-panel relative cursor-pointer p-6 transition ${
                  active ? "glow-gold border-primary/60" : "hover:border-primary/30"
                }`}
              >
                {p.tag && (
                  <span className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
                    {p.tag}
                  </span>
                )}
                <div className="flex items-center gap-2 text-primary">
                  {p.icon}
                  <h2 className="text-base font-bold text-foreground">{p.name}</h2>
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(p.id);
                    go(p);
                  }}
                  className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                    active
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  <CreditCard size={16} /> اشترك الآن
                </button>
              </div>
            );
          })}
        </div>

        <section className="surface-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Link2 size={16} /> روابط الدفع الخارجية
            </h2>
            <button
              onClick={() => setEditLinks((v) => !v)}
              className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-foreground transition hover:text-primary"
            >
              {editLinks ? "إخفاء" : "تعديل الروابط"}
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            الصق رابط الدفع الجاهز لكل باقة (Stripe Payment Link أو PayPal أو أي بوابة). لا تضع مفتاح API هنا أبدًا —
            المفاتيح السرية تُحفظ في الخادم فقط.
          </p>
          {editLinks && loaded && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {PLANS.map((p) => (
                <label key={p.id} className="block text-xs">
                  <span className="text-muted-foreground">
                    {p.name} — ${p.price}
                  </span>
                  <input
                    dir="ltr"
                    value={settings.payLinks[p.id] ?? ""}
                    onChange={(e) => update({ payLinks: { ...settings.payLinks, [p.id]: e.target.value } })}
                    placeholder="https://buy.stripe.com/..."
                    className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
              ))}
            </div>
          )}
        </section>

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
