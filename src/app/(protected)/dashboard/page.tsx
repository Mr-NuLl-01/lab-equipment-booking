import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAuthenticatedProfile } from "@/lib/data/auth";
import { listEquipment, listMyBookings } from "@/lib/data/equipment";
import { formatLocalDateTime } from "@/lib/utils/time";

export default async function DashboardPage() {
  const { user, profile } = await requireAuthenticatedProfile();
  const [bookings, equipment] = await Promise.all([
    listMyBookings(user.id),
    listEquipment(),
  ]);
  const upcoming = bookings
    .filter((booking) => booking.status === "confirmed" && new Date(booking.end_time) >= new Date())
    .slice(0, 3);
  const openEquipmentCount = equipment.filter((item) => item.status === "normal" && item.is_bookable).length;

  return (
    <main className="safe-page space-y-5">
      <section className="space-y-2">
        <p className="text-sm text-slate-600">{profile.full_name} · {profile.role}</p>
        <h1 className="text-2xl font-semibold">仪表盘</h1>
        <StatusBadge value={profile.status} />
      </section>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><h2 className="font-semibold">我的近期预约</h2></CardHeader>
          <CardContent className="space-y-3">
            {upcoming.map((booking) => (
              <div key={booking.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium">{booking.equipment.name}</p>
                <p className="text-sm text-slate-600">{formatLocalDateTime(booking.start_time)} - {formatLocalDateTime(booking.end_time)}</p>
              </div>
            ))}
            {upcoming.length === 0 ? <p className="text-slate-600">暂无即将到来的预约。</p> : null}
            <Button variant="secondary" className="w-full sm:w-auto"><Link href="/bookings">查看全部预约</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="font-semibold">开放预约设备</h2></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold text-teal-700">{openEquipmentCount}</p>
            <p className="text-sm text-slate-600">状态为 normal 且开放预约的设备；需要认证的设备还需管理员单独授权。</p>
            <Button className="w-full sm:w-auto"><Link href="/equipment">进入设备列表</Link></Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
