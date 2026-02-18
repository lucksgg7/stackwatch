import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin-login-form";

export default async function AdminLoginPage() {
  const authenticated = await isAdminAuthenticated();
  if (authenticated) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <AdminLoginForm />
    </main>
  );
}

