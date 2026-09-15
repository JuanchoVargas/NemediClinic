"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { post } from "@/lib/api";
import { setToken } from "@/lib/auth";
import type { LoginRequest, LoginResponse } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: LoginRequest = { email, password };
      const res = await post<LoginResponse>("/api/v1/auth/login", payload);
      if (!res?.token) {
        throw new Error("Respuesta de login inválida.");
      }
      setToken(res.token);
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "#1A3A5C" }}>
            NemediClinic
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{ outlineColor: "#1A3A5C" }}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md text-white font-medium text-sm transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "#1A3A5C" }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          {error && (
            <p className="text-sm text-red-600 text-center border border-red-200 bg-red-50 rounded-md py-2 px-3">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
