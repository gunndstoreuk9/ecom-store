const BADGES = [
  { icon: "🇺🇸", label: "مستورد من أمريكا" },
  { icon: "✅", label: "GMP مُعتمد" },
  { icon: "🌿", label: "Non-GMO" },
  { icon: "💚", label: "حلال (قيد الاعتماد)" },
  { icon: "🔒", label: "ضمان 30 يوم" },
  { icon: "📦", label: "الدفع عند الاستلام" },
];

export function TrustBadges() {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {BADGES.map((b) => (
        <div
          key={b.label}
          className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-4 py-2 text-sm font-medium text-[#102033] shadow-sm"
        >
          <span>{b.icon}</span>
          <span>{b.label}</span>
        </div>
      ))}
    </div>
  );
}
