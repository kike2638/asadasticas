"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Droplets, ArrowRight, Loader2, Waves } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Credenciales inválidas");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Error al conectar con el servidor");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient droplets */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-24 -left-20 w-72 h-72 rounded-full bg-[rgba(34,211,238,0.12)] blur-[90px]" />
        <div className="absolute -bottom-16 -right-16 w-96 h-96 rounded-full bg-[rgba(59,130,246,0.15)] blur-[110px]" />
        <Droplets className="absolute top-16 right-[12%] w-6 h-6 text-[rgba(34,211,238,0.25)] animate-float" />
        <Droplets className="absolute bottom-40 left-[10%] w-4 h-4 text-[rgba(56,189,248,0.2)] animate-float" />
      </div>

      <div className="relative z-10 w-full max-w-[400px] px-6 animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[var(--brand-grad)] shadow-[0_12px_40px_rgba(34,211,238,0.35)] mb-6">
            <Droplets className="w-8 h-8 text-[#042635]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            ASADAS ERP
          </h1>
          <p className="text-sm text-secondary mt-2">
            Plataforma de gestión de agua potable
          </p>
        </div>

        {/* Card */}
        <div className="glass p-7">
          <div className="flex items-center gap-2 mb-7">
            <Waves className="w-5 h-5 text-[var(--brand)]" />
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Iniciar sesión
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 rounded-lg border border-[rgba(251,113,133,0.3)] bg-[rgba(251,113,133,0.08)] px-3.5 py-2.5 text-sm text-[var(--rose)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--rose)] shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-[13px] font-medium text-secondary mb-1.5"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-modern"
                placeholder="admin@asadas-erp.cr"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-secondary mb-1.5"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input-modern"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Ingresar al sistema
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[rgba(96,165,250,0.12)]">
            <p className="text-xs text-muted text-center leading-relaxed">
              Credenciales de prueba:
              <br />
              <span className="text-secondary">admin@asadas-erp.cr</span> /{" "}
              <span className="text-secondary">admin123</span>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted mt-8">
          © 2026 ASADAS ERP · Sistema de Administración de Agua
        </p>
      </div>

      {/* Wave */}
      <svg
        className="absolute bottom-0 left-0 w-full h-24 opacity-40 pointer-events-none"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,64 C240,120 480,8 720,40 C960,72 1200,104 1440,48 L1440,120 L0,120 Z"
          fill="rgba(34,211,238,0.14)"
        />
        <path
          d="M0,88 C288,48 528,120 768,88 C1008,56 1248,96 1440,72 L1440,120 L0,120 Z"
          fill="rgba(56,189,248,0.1)"
        />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}