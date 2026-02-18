import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin-login-form";

export default async function AdminLoginPage() {
  const authenticated = await isAdminAuthenticated();
  if (authenticated) redirect("/admin");

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        backgroundImage:
          "radial-gradient(circle at 12% 8%, rgba(255, 232, 139, 0.7) 0%, transparent 35%), radial-gradient(circle at 88% 6%, rgba(255, 190, 60, 0.35) 0%, transparent 30%), linear-gradient(180deg, #fff9de 0%, #ffeeb5 100%)"
      }}
    >
      <AdminLoginForm />
    </main>
  );
}

