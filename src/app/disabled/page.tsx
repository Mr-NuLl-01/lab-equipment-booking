import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DisabledPage() {
  return (
    <main className="safe-page flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-4">
          <h1 className="text-2xl font-semibold">账号已被禁用</h1>
          <p className="text-slate-600">请联系课题组管理员处理账号状态。</p>
          <form action={logoutAction}>
            <Button type="submit" variant="secondary">退出登录</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
