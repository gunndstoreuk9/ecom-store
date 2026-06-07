"use client";

export function TrustStrip() {
  return (
    <div className="bg-[#1E4A8C] text-white text-sm py-2 overflow-x-auto">
      <div className="container-main">
        <div className="flex items-center justify-center gap-6 whitespace-nowrap min-w-max mx-auto px-2">
          <span>🇲🇦 الدفع عند الاستلام</span>
          <span className="opacity-40">·</span>
          <span>🇺🇸 مستورد من أمريكا</span>
          <span className="opacity-40">·</span>
          <span>✅ ضمان 30 يوم</span>
          <span className="opacity-40">·</span>
          <span>📦 توصيل لجميع مدن المغرب</span>
        </div>
      </div>
    </div>
  );
}
