import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, LoaderCircle, ShieldAlert } from "lucide-react";

import { issueCertificate } from "@/lib/billing.functions";
import { PLAN_LABEL, saveCertificate, type Certificate } from "@/lib/license";

export const Route = createFileRoute("/payment_/success")({
  validateSearch: (s: Record<string, unknown>) => ({ session_id: String(s["session_id"] ?? "") }),
  head: () => ({
    meta: [
      { title: "تفعيل شهادة الاشتراك — محرك تحليل الذهب" },
      { name: "description", content: "تفعيل شهادة اشتراك محرك تحليل الذهب XAU/USD فور إتمام الدفع." },
      { property: "og:title", content: "تفعيل شهادة الاشتراك" },
      { property: "og:description", content: "تصدر شهادة الاشتراك تلقائيًا وتفتح لوحة المخطط والتحليل الكاملة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { session_id } = Route.useSearch();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [cert, setCert] = useState<Certificate | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!session_id) {
        setState("error");
        setMsg("لا توجد جلسة دفع في الرابط.");
        return;
      }
      try {
        const res = await issueCertificate({ data: { sessionId: session_id } });
        if (!alive) return;
        saveCertificate(res.cert, res.payload as Certificate);
        setCert(res.payload as Certificate);
        setState("ok");
        setTimeout(() => navigate({ to: "/" }), 4000);
      } catch (e) {
        if (!alive) return;
        setState("error");
        setMsg(e instanceof Error ? e.message : "تعذر التحقق من الدفع");
      }
    })();
    return () => {
      alive = false;
    };
  }, [session_id, navigate]);

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="surface-panel glow-gold w-full max-w-lg p-8 text-center">
        {state === "loading" && (
          <>
            <LoaderCircle className="mx-auto animate-spin text-primary" size={34} />
            <h1 className="mt-4 text-xl font-extrabold text-foreground">جارٍ التحقق من الدفع وإصدار الشهادة…</h1>
          </>
        )}

        {state === "ok" && cert && (
          <>
            <BadgeCheck className="mx-auto text-success" size={40} />
            <h1 className="text-gold mt-3 text-2xl font-extrabold">تم تفعيل اشتراكك</h1>
            <p className="mt-1 text-sm text-muted-foreground">شهادة اشتراك موقّعة رقميًا — لوحة التحليل الكاملة مفتوحة الآن.</p>
            <div className="mt-6 space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-5 text-sm">
              <Row l="الباقة" v={PLAN_LABEL[cert.plan]} />
              <Row l="رقم الشهادة" v={cert.ref} />
              <Row l="المُصدرة لـ" v={cert.holder} />
              <Row l="تاريخ الإصدار" v={new Date(cert.issuedAt).toLocaleString("ar-EG")} />
              <Row l="صالحة حتى" v={new Date(cert.expiresAt).toLocaleString("ar-EG")} />
            </div>
            <Link
              to="/"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              فتح لوحة المخطط والتحليل
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <ShieldAlert className="mx-auto text-destructive" size={36} />
            <h1 className="mt-3 text-xl font-extrabold text-destructive">تعذر تفعيل الاشتراك</h1>
            <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
            <Link
              to="/payment"
              className="mt-6 inline-flex items-center justify-center rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-bold text-foreground"
            >
              العودة لصفحة الاشتراك
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{l}</span>
      <b className="text-foreground">{v}</b>
    </div>
  );
}
