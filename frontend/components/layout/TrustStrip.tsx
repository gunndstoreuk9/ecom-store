"use client";

export function TrustStrip() {
  const items = [
    "🇲🇦 الدفع عند الاستلام",
    "🇺🇸 مستورد من أمريكا",
    "✅ ضمان 30 يوم",
    "📦 توصيل لجميع مدن المغرب",
  ];

  return (
    <div className="overflow-hidden bg-[#1E4A8C] py-2 text-sm text-white">
      <div className="trust-ticker flex w-max whitespace-nowrap">
        {[0, 1].map((group) => (
          <div key={group} className="flex items-center gap-8 px-4">
            {items.map((item) => (
              <span key={`${group}-${item}`} className="inline-flex items-center gap-2">
                {item}
              </span>
            ))}
            <span className="opacity-40">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}
