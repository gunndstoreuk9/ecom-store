import type { Metadata } from "next";

export const metadata: Metadata = { title: "الشروط والأحكام — تَوازُن للصحة" };

export default function TermsPage() {
  return (
    <div className="section-padding">
      <div className="container-main max-w-3xl">
        <h1 className="text-3xl font-bold text-[#102033] mb-6">الشروط والأحكام</h1>
        <div className="space-y-5 text-[#667085] leading-relaxed">
          <p>باستخدامك لموقع تَوازُن للصحة، فإنك توافق على الشروط التالية.</p>
          <h2 className="text-xl font-bold text-[#102033]">الطلبات والدفع</h2>
          <p>جميع الطلبات تُدفع نقداً عند الاستلام. يحق لنا إلغاء الطلب إذا تعذّر التأكيد الهاتفي.</p>
          <h2 className="text-xl font-bold text-[#102033]">المنتجات</h2>
          <p>
            منتجاتنا مكملات غذائية وليست أدوية. النتائج تختلف من شخص لآخر. لا ندّعي أن منتجاتنا تعالج أو تشفي أي مرض.
          </p>
          <h2 className="text-xl font-bold text-[#102033]">الملكية الفكرية</h2>
          <p>جميع محتويات الموقع محمية بحقوق الملكية الفكرية لتَوازُن للصحة.</p>
        </div>
      </div>
    </div>
  );
}
