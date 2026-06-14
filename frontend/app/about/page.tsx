import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "من نحن — تَوازُن للصحة",
};

export default function AboutPage() {
  return (
    <div className="section-padding">
      <div className="container-main max-w-3xl">
        <h1 className="text-4xl font-bold text-[#102033] mb-6">من نحن</h1>

        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-bold text-[#1E4A8C] mb-3">قصتنا</h2>
            <p className="text-[#667085] leading-relaxed">
              بدأت تَوازُن من فكرة بسيطة: المغاربة يستحقون منتجات دعم صحي مفهومة، موثوقة، وواضحة.
              رأينا كيف يبحث الناس عن إجابات واضحة وحلول طبيعية موثوقة، فقررنا أن نبني علامة تجارية متخصصة تقدّم شفافية كاملة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E4A8C] mb-3">لماذا توازن السكر؟</h2>
            <p className="text-[#667085] leading-relaxed">
              اخترنا دعم وظيفة البنكرياس الطبيعية والمساعدة على توازن السكر في الدم لأنه موضوع كيهم بزاف ديال الأسر المغربية. لا ندّعي أننا نعالج أو نشفي —
              نحن نقدم دعماً غذائياً يومياً بمكوّنات مدروسة، بجانب نمط حياة صحي ومتابعة طبية منتظمة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E4A8C] mb-3">معاييرنا</h2>
            <ul className="space-y-3 text-[#667085]">
              {[
                "شفافية كاملة في المكوّنات والجرعات",
                "توثيق المورّدين وشهادات الجودة",
                "الدفع عند الاستلام دائماً — لا دفع مسبق",
                "دعم حقيقي على الهاتف والواتساب",
                "ضمان رضا 30 يوم بدون تعقيد",
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#16A34A] font-bold mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-[#EEF5FF] rounded-2xl p-6">
            <h2 className="text-xl font-bold text-[#1E4A8C] mb-3">وعدنا</h2>
            <p className="text-[#667085] leading-relaxed">
              لا معجزات مزيفة. لا رسوم خفية. لا دفع قبل الاستلام. فقط منتج جيد، شرح واضح، ودعم حقيقي.
            </p>
          </section>

          <div className="text-center pt-4">
            <Link href="/products/balance" className="btn-red inline-flex">
              اكتشف منتجنا الرئيسي
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
