import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/data/auth";
import { getAdminOverview } from "@/lib/data/equipment";

export default async function AdminPage() {
  await requireAdmin();
  const overview = await getAdminOverview();
  const items = [
    ["设备数量", overview.equipmentCount, "/admin/equipment"],
    ["待认证成员", overview.pendingMemberCount, "/admin/members"],
    ["今日预约", overview.todayBookingCount, "/admin/bookings"],
    ["待处理异常", overview.openIssueCount, "/admin/issues"],
    ["到期维护", overview.dueMaintenanceCount, "/admin/maintenance"],
  ];

  return (
    <main className="safe-page space-y-5">
      <AdminNav />
      <h1 className="text-2xl font-semibold">管理后台概览</h1>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([label, value, href]) => (
          <Link key={label} href={String(href)}>
            <Card className="transition hover:border-teal-300">
              <CardHeader><p className="text-sm text-slate-600">{label}</p></CardHeader>
              <CardContent><p className="text-3xl font-semibold text-teal-700">{value}</p></CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}
