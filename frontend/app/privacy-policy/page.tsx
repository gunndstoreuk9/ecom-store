import type { Metadata } from "next";

export const metadata: Metadata = { title: "سياسة الخصوصية — تَوازُن للصحة" };

export default function PrivacyPage() {
  return (
    <div className="section-padding">
      <div className="container-main max-w-3xl prose prose-sm">
        <h1 className="text-3xl font-bold text-[#102033] mb-6">سياسة الخصوصية</h1>
        <p className="text-[#667085] leading-relaxed mb-4">
          نحن في تَوازُن للصحة نحترم خصوصية بياناتك. لا نشارك معلوماتك الشخصية مع أطراف ثالثة لأغراض تجارية.
        </p>
        <h2 className="text-xl font-bold text-[#102033] mt-6 mb-3">البيانات التي نجمعها</h2>
        <ul className="list-disc list-inside text-[#667085] space-y-2">
          <li>الاسم ورقم الهاتف لتنفيذ الطلب.</li>
          <li>بيانات الزيارة (عبر بكسل Meta/TikTok/Google للإعلانات).</li>
        </ul>
        <h2 className="text-xl font-bold text-[#102033] mt-6 mb-3">الاستخدام</h2>
        <p className="text-[#667085] leading-relaxed">
          نستخدم بياناتك حصراً لتأكيد وتوصيل طلبك، والتواصل معك بشأن الطلب، وتحسين تجربة الإعلانات.
        </p>
        <h2 className="text-xl font-bold text-[#102033] mt-6 mb-3">حقوقك</h2>
        <p className="text-[#667085]">
          يحق لك طلب حذف بياناتك في أي وقت عبر التواصل معنا على البريد الإلكتروني.
        </p>
      </div>
    </div>
  );
}
