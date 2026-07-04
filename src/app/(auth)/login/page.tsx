import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/auth-forms";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/data/auth";

export default async function LoginPage() {
  const { user, profile } = await getCurrentProfile();
  if (user && profile?.status === "disabled") redirect("/disabled");
  if (user && profile?.role === "admin") redirect("/admin");
  if (user) redirect("/equipment");

  return (
    <main className="safe-page flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-semibold">设备预约登录</h1>
          <p className="mt-1 text-sm text-slate-600">使用课题组邮箱和密码登录</p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
