import { AdminNav } from "@/components/admin/admin-nav";
import { CancelBookingForm } from "@/components/bookings/cancel-booking-form";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/data/auth";
import { listAdminBookings, listEquipment } from "@/lib/data/equipment";
import { formatLocalDateTime } from "@/lib/utils/time";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ equipmentId?: string; date?: string; member?: string; status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [bookings, equipment] = await Promise.all([
    listAdminBookings(params),
    listEquipment({ includeRetired: true }),
  ]);

  return (
    <main className="safe-page space-y-5">
      <AdminNav />
      <h1 className="text-2xl font-semibold">预约管理</h1>
      <form className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-5">
        <select className="min-h-11 rounded-md border border-slate-300 px-3" name="equipmentId" defaultValue={params.equipmentId || ""}>
          <option value="">全部设备</option>
          {equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input className="min-h-11 rounded-md border border-slate-300 px-3" type="date" name="date" defaultValue={params.date || ""} />
        <input className="min-h-11 rounded-md border border-slate-300 px-3" name="member" placeholder="成员姓名/邮箱" defaultValue={params.member || ""} />
        <select className="min-h-11 rounded-md border border-slate-300 px-3" name="status" defaultValue={params.status || ""}>
          <option value="">全部状态</option>
          <option value="confirmed">confirmed</option>
          <option value="cancelled">cancelled</option>
          <option value="admin_cancelled">admin_cancelled</option>
        </select>
        <button className="min-h-11 rounded-md bg-teal-700 px-4 text-white">筛选</button>
      </form>
      <section className="space-y-3">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{booking.equipment.name}</h2>
                  <p className="text-sm text-slate-600">{formatLocalDateTime(booking.start_time)} - {formatLocalDateTime(booking.end_time)}</p>
                  <p className="text-sm text-slate-700">{booking.profile.full_name} · {booking.purpose}</p>
                </div>
                <StatusBadge value={booking.status} />
              </div>
              {booking.status === "confirmed" && new Date(booking.start_time) > new Date() ? (
                <CancelBookingForm bookingId={booking.id} />
              ) : null}
            </CardContent>
          </Card>
        ))}
        {bookings.length === 0 ? <p className="text-slate-600">暂无未来预约。</p> : null}
      </section>
    </main>
  );
}
