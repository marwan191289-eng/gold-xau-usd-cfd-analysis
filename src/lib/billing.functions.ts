import { createServerFn } from "@tanstack/react-start";

export type PlanKey = "starter" | "pro" | "elite";

export const PLAN_PRICES: Record<PlanKey, { amount: number; name: string }> = {
  starter: { amount: 200, name: "الباقة الأساسية — محرك تحليل الذهب" },
  pro: { amount: 500, name: "الباقة الاحترافية — محرك تحليل الذهب" },
  elite: { amount: 800, name: "باقة النخبة — محرك تحليل الذهب" },
};

const isPlan = (v: unknown): v is PlanKey => v === "starter" || v === "pro" || v === "elite";

async function stripe(path: string, init?: { method?: string; body?: URLSearchParams }) {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("لم يتم إعداد مفتاح الدفع بعد");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    ...(init?.body ? { body: init.body } : {}),
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(json?.error?.message ?? "تعذر الاتصال ببوابة الدفع");
  return json;
}

/** هل إعداد الدفع جاهز؟ */
export const paymentsReady = createServerFn({ method: "GET" }).handler(async () => ({
  ready: Boolean(process.env["STRIPE_SECRET_KEY"]),
}));

/** إنشاء جلسة دفع Stripe Checkout وإرجاع رابطها. */
export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: { plan: string; origin: string; email?: string }) => {
    if (!isPlan(input.plan)) throw new Error("باقة غير معروفة");
    if (!/^https?:\/\//.test(input.origin)) throw new Error("عنوان غير صالح");
    return { plan: input.plan, origin: input.origin, email: input.email?.slice(0, 120) ?? "" };
  })
  .handler(async ({ data }) => {
    const plan = PLAN_PRICES[data.plan];
    const body = new URLSearchParams({
      mode: "payment",
      success_url: `${data.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/payment`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(plan.amount * 100),
      "line_items[0][price_data][product_data][name]": plan.name,
      "metadata[plan]": data.plan,
    });
    if (data.email) body.set("customer_email", data.email);
    const session = await stripe("checkout/sessions", { method: "POST", body });
    return { url: session.url as string };
  });

/** التحقق من الدفع وإصدار شهادة اشتراك موقّعة. */
export const issueCertificate = createServerFn({ method: "POST" })
  .inputValidator((input: { sessionId: string }) => {
    if (!input?.sessionId || input.sessionId.length > 200) throw new Error("جلسة دفع غير صالحة");
    return { sessionId: input.sessionId };
  })
  .handler(async ({ data }) => {
    const session = await stripe(`checkout/sessions/${encodeURIComponent(data.sessionId)}`);
    if (session.payment_status !== "paid") throw new Error("لم يكتمل الدفع بعد");
    const plan = isPlan(session.metadata?.plan) ? (session.metadata.plan as PlanKey) : "pro";
    const { signCertificate } = await import("./license.server");
    const now = Date.now();
    const payload = {
      plan,
      ref: String(session.id).slice(-12).toUpperCase(),
      issuedAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
      holder: String(session.customer_details?.email ?? session.customer_email ?? "عميل"),
    };
    return { cert: await signCertificate(payload), payload };
  });

/** التحقق من شهادة محفوظة لدى المستخدم. */
export const verifyCertificate = createServerFn({ method: "POST" })
  .inputValidator((input: { cert: string }) => {
    if (!input?.cert || input.cert.length > 2000) throw new Error("شهادة غير صالحة");
    return { cert: input.cert };
  })
  .handler(async ({ data }) => {
    const { readCertificate } = await import("./license.server");
    const payload = await readCertificate(data.cert);
    return { valid: Boolean(payload), payload };
  });
