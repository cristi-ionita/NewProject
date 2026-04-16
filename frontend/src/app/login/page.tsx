"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";

import { adminLogin, mechanicLogin, userLogin } from "@/services/auth.api";
import {
  clearAllSessions,
  getAdminToken,
  getMechanicSession,
  getUserSession,
  saveAdminToken,
  saveMechanicSession,
  saveUserSession,
} from "@/lib/auth";
import { isApiClientError } from "@/lib/axios";
import { useI18n } from "@/lib/i18n/use-i18n";

type Role = "admin" | "employee" | "mechanic" | null;

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useI18n();

  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<Role>(null);
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const text = useMemo(() => {
    if (locale === "de") {
      return {
        login: "Anmelden",
        user: "Benutzer",
        password: "Passwort",
        pin: "PIN",
        back: "Zurück",
        fill: "Bitte fülle alle Felder aus.",
        invalid: "Ungültige Anmeldedaten.",
        error: "Fehler. Bitte versuche es erneut.",
        checking: "Sitzung wird geprüft...",
        admin: "Admin",
        employee: "Mitarbeiter",
        mechanic: "Mechaniker",
      };
    }

    if (locale === "en") {
      return {
        login: "Login",
        user: "User",
        password: "Password",
        pin: "PIN",
        back: "Back",
        fill: "Please fill in all fields.",
        invalid: "Invalid credentials.",
        error: "Error. Try again.",
        checking: "Checking session...",
        admin: "Admin",
        employee: "Employee",
        mechanic: "Mechanic",
      };
    }

    return {
      login: "Login",
      user: "Utilizator",
      password: "Parolă",
      pin: "PIN",
      back: "Înapoi",
      fill: "Completează toate câmpurile.",
      invalid: "Date incorecte.",
      error: "Eroare. Încearcă din nou.",
      checking: "Se verifică sesiunea...",
      admin: "Admin",
      employee: "Angajat",
      mechanic: "Mecanic",
    };
  }, [locale]);

  const normalizedIdentifier = identifier.trim();
  const normalizedSecret = secret.trim();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (getAdminToken()) {
      router.replace("/admin/dashboard");
      return;
    }

    if (getMechanicSession()) {
      router.replace("/mechanic/dashboard");
      return;
    }

    if (getUserSession()) {
      setChecking(false);
      return;
    }

    setChecking(false);
  }, [mounted, router]);

  function resetForm() {
    setIdentifier("");
    setSecret("");
    setShowSecret(false);
    setError("");
  }

  function handleBack() {
    if (loading) return;
    setRole(null);
    resetForm();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      (role === "admin" && !normalizedSecret) ||
      (role !== "admin" && (!normalizedIdentifier || !normalizedSecret))
    ) {
      setError(text.fill);
      return;
    }

    setLoading(true);
    setError("");

    try {
      clearAllSessions();

      if (role === "admin") {
        const response = await adminLogin({
          password: normalizedSecret,
        });

        saveAdminToken(response.token);
        router.replace("/admin/dashboard");
        return;
      }

      if (role === "mechanic") {
        const response = await mechanicLogin({
          identifier: normalizedIdentifier,
          pin: normalizedSecret,
        });

        saveMechanicSession({
          user_id: response.user_id,
          full_name: response.full_name,
          unique_code: response.unique_code,
          role: "mechanic",
        });

        router.replace("/mechanic/dashboard");
        return;
      }

      const response = await userLogin({
        identifier: normalizedIdentifier,
        pin: normalizedSecret,
      });

      saveUserSession({
        user_id: response.user_id,
        full_name: response.full_name,
        shift_number: response.shift_number ?? null,
        unique_code: response.unique_code,
      });

      router.replace("/app/profile");
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message || text.invalid);
      } else {
        setError(text.error);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!mounted || checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#334155_0%,#1e293b_42%,#0f172a_100%)] px-4">
        <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <p className="text-sm font-medium text-slate-200">{text.checking}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#334155_0%,#1e293b_42%,#0f172a_100%)] px-4 py-8">
      <div className="w-full max-w-4xl">
        <div className="mb-10 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 bg-white/10 text-white shadow-[0_14px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
            <KeyRound className="h-7 w-7" />
          </div>

          <h1 className="mt-4 text-[32px] font-semibold tracking-tight text-white">
            {text.login}
          </h1>
        </div>

        {role === null ? (
          <div className="grid gap-4 md:grid-cols-3">
            <RoleCard
              icon={<ShieldCheck className="h-6 w-6" />}
              label={text.admin}
              onClick={() => setRole("admin")}
            />
            <RoleCard
              icon={<UserRound className="h-6 w-6" />}
              label={text.employee}
              onClick={() => setRole("employee")}
            />
            <RoleCard
              icon={<Wrench className="h-6 w-6" />}
              label={text.mechanic}
              onClick={() => setRole("mechanic")}
            />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-sm rounded-[28px] border border-white/10 bg-gradient-to-b from-white to-slate-50 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl"
          >
            <div className="mb-5 flex items-center justify-end">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(0,0,0,0.25)] transition-all duration-200 hover:bg-slate-800 hover:shadow-[0_10px_24px_rgba(0,0,0,0.35)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {text.back}
              </button>
            </div>

            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center rounded-full bg-slate-900/90 px-4 py-1.5 text-xs font-medium tracking-wide text-white shadow-sm">
                {role === "admin"
                  ? text.admin
                  : role === "mechanic"
                  ? text.mechanic
                  : text.employee}
              </div>
            </div>

            {role !== "admin" ? (
              <input
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={text.user}
                autoComplete="username"
                className="mb-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              />
            ) : null}

            <div className="relative mb-3">
              <input
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder={role === "admin" ? text.password : text.pin}
                autoComplete={
                  role === "admin" ? "current-password" : "one-time-code"
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              />

              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
              >
                {showSecret ? (
                  <EyeOff className="h-4.5 w-4.5" />
                ) : (
                  <Eye className="h-4.5 w-4.5" />
                )}
              </button>
            </div>

            {error ? (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={
                loading ||
                (role === "admin"
                  ? !normalizedSecret
                  : !normalizedIdentifier || !normalizedSecret)
              }
              className="w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "..." : text.login}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function RoleCard({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-40 flex-col items-center justify-center gap-3 rounded-[28px] border border-white/10 bg-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1.5 hover:bg-white/14 hover:shadow-[0_20px_50px_rgba(0,0,0,0.26)]"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-black text-white transition-all duration-300 group-hover:scale-110 group-hover:rotate-1">
        {icon}
      </div>

      <span className="text-[15px] font-semibold tracking-tight text-white">
        {label}
      </span>
    </button>
  );
}