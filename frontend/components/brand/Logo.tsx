import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-[#E5E7EB]">
        <Image
          src="/images/brand/tawazon-icon.png"
          alt="تَوازُن للصحة"
          fill
          sizes="40px"
          className="object-contain p-1"
          priority
        />
      </div>
      <div className="leading-tight">
        <div className="font-bold text-[#205081] text-base leading-none">تَوازُن للصحة</div>
      </div>
    </div>
  );
}
