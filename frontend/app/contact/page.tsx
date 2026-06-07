import type { Metadata } from "next";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: "تواصل معنا — تَوازُن للصحة",
};

export default function ContactPage() {
  return (
    <div className="section-padding">
      <div className="container-main max-w-2xl">
        <h1 className="text-4xl font-bold text-[#102033] mb-3">تواصل معنا</h1>
        <p className="text-[#667085] mb-10 leading-relaxed">
          عندك سؤال قبل الطلب؟ تواصل معنا عبر واتساب. فريقنا يشرح لك طريقة الاستعمال، العرض المناسب، وخطوات التوصيل.
        </p>

        <div className="space-y-5">
          <a
            href={`https://wa.me/${BRAND.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 card-base p-5 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-[#16A34A] rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0">
              💬
            </div>
            <div>
              <p className="font-bold text-[#102033]">واتساب</p>
              <p className="text-sm text-[#667085]">الرد خلال دقائق أيام الأسبوع</p>
            </div>
          </a>

          <div className="flex items-center gap-4 card-base p-5">
            <div className="w-12 h-12 bg-[#1E4A8C] rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0">
              ✉️
            </div>
            <div>
              <p className="font-bold text-[#102033]">البريد الإلكتروني</p>
              <p className="text-sm text-[#667085]">{BRAND.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 card-base p-5">
            <div className="w-12 h-12 bg-[#F8F5EF] rounded-full flex items-center justify-center text-2xl flex-shrink-0">
              🕐
            </div>
            <div>
              <p className="font-bold text-[#102033]">ساعات العمل</p>
              <p className="text-sm text-[#667085]">الإثنين – السبت: 9ص – 7م (توقيت المغرب)</p>
            </div>
          </div>
        </div>

        <div className="mt-10 bg-[#F8F5EF] rounded-2xl p-6">
          <h2 className="font-bold text-[#102033] mb-2">الدفع عند الاستلام</h2>
          <p className="text-sm text-[#667085] leading-relaxed">
            جميع طلباتنا تُدفع نقداً عند استلام المنتج. بعد تسجيل طلبك، سيتصل بك فريقنا لتأكيد العنوان والتفاصيل قبل الشحن.
          </p>
        </div>
      </div>
    </div>
  );
}
