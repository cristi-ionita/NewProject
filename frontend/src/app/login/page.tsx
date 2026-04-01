"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin, userLogin } from "@/services/auth.api";
import {
  getAdminToken,
  getMechanicSession,
  getUserSession,
  saveAdminToken,
  saveMechanicSession,
  saveUserSession,
} from "@/lib/auth";
import { KeyRound } from "lucide-react";

function extractErrorMessage(error: unknown) {
  const err = error as {
    response?: {
      status?: number;
      data?: {
        detail?: unknown;
        message?: unknown;
      };
    };
    message?: string;
  };

  const detail = err?.response?.data?.detail;
  const message = err?.response?.data?.message;
  const status = err?.response?.status;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          const msg = (item as { msg?: unknown }).msg;
          return typeof msg === "string" ? msg : "";
        }
        return "";
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(", ");
    }
  }

  if (detail && typeof detail === "object" && "msg" in detail) {
    const msg = (detail as { msg?: unknown }).msg;
    if (typeof msg === "string" && msg.trim()) {
      return msg;
    }
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (status === 401) return "Credentials are incorrect.";
  if (status === 403) return "Access denied.";
  if (status === 404) return "User not found.";
  if (status === 422) return "Invalid input. Check the fields and try again.";

  if (typeof err?.message === "string" && err.message.trim()) {
    return err.message;
  }

  return "Unexpected error. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const isAdminMode = useMemo(
    () => identifier.trim().toLowerCase() === "admin",
    [identifier]
  );

  useEffect(() => {
    const adminToken = getAdminToken();
    const mechanicSession = getMechanicSession();
    const userSession = getUserSession();

    if (adminToken) {
      router.replace("/admin/dashboard");
      return;
    }

    if (mechanicSession) {
      router.replace("/mechanic/dashboard");
      return;
    }

    if (userSession) {
      router.replace("/app/profile");
      return;
    }

    setCheckingSession(false);
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isAdminMode) {
        const data = await adminLogin({ password: secret.trim() });
        saveAdminToken(data.token);
        router.replace("/admin/dashboard");
        return;
      }

      const data = await userLogin({
        identifier: identifier.trim(),
        pin: secret.trim(),
      });

      if (data.role === "mechanic") {
        saveMechanicSession({
          user_id: data.user_id,
          full_name: data.full_name,
          unique_code: data.unique_code,
          role: data.role,
        });
        router.replace("/mechanic/dashboard");
        return;
      }

      saveUserSession({
        user_id: data.user_id,
        full_name: data.full_name,
        shift_number: data.shift_number ?? null,
        unique_code: data.unique_code,
      });

      router.replace("/app/profile");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef3f8]">
        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Checking session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef3f8] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
      >
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <KeyRound className="h-6 w-6" />
          </div>

          <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-950">
            Login
          </h1>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="User"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          />

          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={isAdminMode ? "Password" : "PIN"}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          />

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !identifier || !secret}
            className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </div>
      </form>
    </main>
  );
}