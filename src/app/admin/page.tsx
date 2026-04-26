import { cookies } from "next/headers";
import { AdminDashboard } from "@/components/features/admin/admin-dashboard";
import { AdminLoginForm } from "@/components/features/admin/admin-login-form";
import { Header } from "@/components/ui/header";
import {
  ADMIN_SESSION_COOKIE,
  getAdminAuthConfigError,
  getAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = getAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const isConfigured = isAdminAuthConfigured();

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      {!isConfigured ? (
        <div className="mx-auto max-w-xl px-4 py-10">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h1 className="text-xl font-semibold text-zinc-900">Авторизация админа не настроена</h1>
            <p className="mt-2 text-sm text-zinc-700">{getAdminAuthConfigError()}</p>
            <p className="mt-2 text-sm text-zinc-700">
              Добавьте значения в локальный env-файл и перезапустите dev-сервер.
            </p>
          </div>
        </div>
      ) : session ? (
        <AdminDashboard adminEmail={session.email} />
      ) : (
        <AdminLoginForm />
      )}
    </div>
  );
}
