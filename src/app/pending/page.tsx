import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function PendingPage() {
  return (
    <main className="safe-page flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-4">
          <h1 className="text-2xl font-semibold">账号状态说明</h1>
          <p className="text-slate-600">注册后可以直接进入设备列表。未认证账号可以预约不需要认证的设备；需要认证的设备要等管理员激活账号后才能预约。</p>
          <Link
            href="/equipment"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white sm:w-auto"
          >
            查看设备
          </Link>
          <form action={logoutAction}>
            <Button type="submit" variant="secondary">退出登录</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
