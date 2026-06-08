import Image from "next/image";

type ProductImageSlotTone = "blue" | "sand" | "green" | "gold";

interface ProductImageSlotProps {
  label: string;
  filename: string;
  note?: string;
  tone?: ProductImageSlotTone;
  compact?: boolean;
  showImage?: boolean;
  imageFit?: "contain" | "cover";
  className?: string;
}

export function ProductImageSlot({
  label,
  filename,
  note,
  tone = "blue",
  compact = false,
  showImage = false,
  imageFit = "contain",
  className = "",
}: ProductImageSlotProps) {
  const toneClass = {
    blue: "from-[#1E4A8C] to-[#173B70] text-white",
    sand: "from-[#F8F5EF] to-white text-[#102033]",
    green: "from-[#ECFDF3] to-white text-[#102033]",
    gold: "from-[#FFF7E0] to-white text-[#102033]",
  }[tone];

  if (showImage) {
    return (
      <div
        className={`relative overflow-hidden rounded-[32px] bg-white shadow-2xl ${
          compact ? "min-h-[220px]" : "min-h-[320px]"
        } ${className}`}
      >
        <Image
          src={`/images/product-page/${filename}`}
          alt={label}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className={imageFit === "cover" ? "object-cover" : "object-contain p-4"}
          priority={false}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[32px] bg-gradient-to-br ${toneClass} shadow-2xl ${
        compact ? "min-h-[220px]" : "min-h-[320px]"
      } ${className}`}
    >
      <div className="absolute inset-4 rounded-[26px] border border-white/30" />
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="absolute -bottom-14 right-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
      <div
        className={`relative z-10 flex h-full flex-col items-center justify-center p-6 text-center ${
          compact ? "min-h-[220px]" : "min-h-[320px]"
        }`}
      >
        <div
          className={`mb-4 flex items-center justify-center rounded-3xl bg-white/20 shadow-lg ${
            compact ? "h-16 w-16 text-2xl" : "h-24 w-24 text-5xl"
          }`}
        >
          صورة
        </div>
        <p className={compact ? "text-sm font-bold" : "text-lg font-bold"}>{label}</p>
        {note && <p className="mt-2 max-w-sm text-xs opacity-80">{note}</p>}
        <p className="mt-4 rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-semibold" dir="ltr">
          /images/product-page/{filename}
        </p>
      </div>
    </div>
  );
}
