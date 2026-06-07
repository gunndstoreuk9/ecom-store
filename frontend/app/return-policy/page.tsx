import type { Metadata } from "next";

export const metadata: Metadata = { title: "سياسة الاسترجاع — تَوازُن للصحة" };

export default function ReturnPolicyPage() {
  return (
    <div className="section-padding">
      <div className="container-main max-w-3xl">
        <h1 className="text-3xl font-bold text-[#102033] mb-6">سياسة الاسترجاع</h1>
        <div className="space-y-5 text-[#667085] leading-relaxed">
          <div className="bg-[#EEF5FF] rounded-2xl p-5">
            <p className="font-bold text-[#1E4A8C] text-lg mb-1">ضمان الرضا 30 يوم</p>
            <p>إذا لم تكن راضياً عن تجربتك، تواصل معنا خلال 30 يوماً من تاريخ الاستلام.</p>
          </div>
          <h2 className="text-xl font-bold text-[#102033]">شروط الاسترجاع</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>يجب التواصل خلال 30 يوماً من تاريخ الاستلام.</li>
            <li>المنتج يجب أن يكون مستخدماً جزئياً فقط.</li>
            <li>يتم التواصل عبر واتساب أو البريد الإلكتروني لترتيب الإرجاع.</li>
            <li>يُعاد المبلغ كاملاً أو يُستبدل المنتج حسب الحالة.</li>
          </ul>
          <h2 className="text-xl font-bold text-[#102033]">الاستثناءات</h2>
          <p>المنتج المفتوح بالكامل والمستهلك بأكثر من 80% غير مؤهل للإرجاع.</p>
        </div>
      </div>
    </div>
  );
}
