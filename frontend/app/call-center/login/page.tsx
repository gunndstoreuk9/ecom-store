"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Phone } from "lucide-react";
import { agentLogin, ApiError } from "@/lib/api";

const SESSION_KEY = "cc_agent_session";

export default function CallCenterLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const session = JSON.parse(raw);
        if (session?.token) {
          router.replace("/call-center/work");
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const session = await agentLogin(username.trim(), password.trim());
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      router.push("/call-center/work");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / Brand */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-900">
            <Phone className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">مركز الاتصال</h1>
          <p className="text-slate-400 text-sm">سجّلي دخولك للوصول لطلباتك</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded-2xl p-6 space-y-4 shadow-2xl"
        >
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              required
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-mono text-sm"
              dir="ltr"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-900/30 border border-rose-700/50 rounded-xl p-3 text-rose-300 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-xl py-3.5 font-semibold transition shadow-lg shadow-indigo-900/50"
          >
            {loading ? "جاري تسجيل الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
