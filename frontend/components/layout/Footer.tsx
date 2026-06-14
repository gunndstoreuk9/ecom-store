import Link from "next/link";
import { BRAND } from "@/config/brand";

export function Footer() {
  return (
    <footer className="bg-[#102033] text-white pt-12 pb-6">
      <div className="container-main">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="text-xl font-bold mb-2">تَوازُن للصحة</div>
            <p className="text-gray-400 text-sm leading-relaxed">
              متخصصون في دعم وظيفة البنكرياس الطبيعية والمساعدة على توازن السكر في الدم بمكوّنات مدروسة.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-300">المتجر</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/products/balance" className="hover:text-white transition-colors">المنتج الرئيسي</Link></li>
              <li><Link href="/collections" className="hover:text-white transition-colors">العروض</Link></li>
              <li><Link href="/collections" className="hover:text-white transition-colors">كل المنتجات</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-300">الدعم</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/contact" className="hover:text-white transition-colors">تواصل معنا</Link></li>
              <li>
                <a
                  href={`https://wa.me/${BRAND.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  واتساب
                </a>
              </li>
              <li><Link href="/return-policy" className="hover:text-white transition-colors">سياسة الاسترجاع</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">سياسة الخصوصية</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">الشروط والأحكام</Link></li>
            </ul>
          </div>

          {/* Trust */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-300">الثقة</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>✅ الدفع عند الاستلام</li>
              <li>🔒 ضمان رضا 30 يوم</li>
              <li>🇺🇸 مستورد من أمريكا</li>
              <li>📞 دعم على الهاتف والواتساب</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6 text-center text-xs text-gray-500 leading-relaxed">
          <p>© {new Date().getFullYear()} {BRAND.nameEn} · {BRAND.domain}</p>
        </div>
      </div>
    </footer>
  );
}
