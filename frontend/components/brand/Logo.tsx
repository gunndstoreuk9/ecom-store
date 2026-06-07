export function Logo() {
  return (
    <div className="flex items-center gap-3">
      {/* Monogram circle */}
      <div className="w-9 h-9 rounded-full bg-[#1E4A8C] flex items-center justify-center flex-shrink-0 shadow-sm">
        <span className="text-white font-bold text-lg leading-none">ت</span>
      </div>
      <div className="leading-tight">
        <div className="font-bold text-[#102033] text-base leading-none">تَوازُن للصحة</div>
        <div className="text-[10px] text-[#667085] tracking-wide">Tawazon Health</div>
      </div>
    </div>
  );
}
