import { RegisterForm } from "@/components/auth/auth-forms";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="safe-page flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-semibold">注册账号</h1>
          <p className="mt-1 text-sm text-slate-600">注册后默认为待认证学生</p>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </main>
  );
}
