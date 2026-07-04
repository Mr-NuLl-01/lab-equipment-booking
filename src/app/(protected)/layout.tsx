import Link from "next/link";
import { CalendarDays, LayoutDashboard, LogOut, User, Wrench } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { requireAuthenticatedProfile } from "@/lib/data/auth";
import { Button } from "@/components/ui/button";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAuthenticatedProfile();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="safe-page flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-lg font-semibold">课题组设备预约</Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link className="inline-flex min-h-10 items-center gap-1 rounded-md px-3 hover:bg-slate-100" href="/equipment">
              <Wrench className="size-4" /> 设备
            </Link>
            <Link className="inline-flex min-h-10 items-center gap-1 rounded-md px-3 hover:bg-slate-100" href="/bookings">
              <CalendarDays className="size-4" /> 我的预约
            </Link>
            <Link className="inline-flex min-h-10 items-center gap-1 rounded-md px-3 hover:bg-slate-100" href="/me">
              <User className="size-4" /> 我的
            </Link>
            {profile.role === "admin" ? (
              <Link className="inline-flex min-h-10 items-center gap-1 rounded-md px-3 hover:bg-slate-100" href="/admin/equipment">
                <LayoutDashboard className="size-4" /> 管理
              </Link>
            ) : null}
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" className="min-h-10 px-3">
                <LogOut className="size-4" /> 退出
              </Button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
