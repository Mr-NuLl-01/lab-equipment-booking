import { BookingForm } from "@/components/bookings/booking-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAuthenticatedProfile } from "@/lib/data/auth";
import {
  getEquipment,
  listActiveMaintenanceWindows,
  listEquipmentPermissions,
  listMyBookings,
  listUpcomingBookings,
} from "@/lib/data/equipment";

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile } = await requireAuthenticatedProfile();
  const equipment = await getEquipment(id);
  const [bookings, myBookings, permissions, maintenanceWindows] = await Promise.all([
    listUpcomingBookings(id),
    listMyBookings(user.id),
    listEquipmentPermissions(user.id),
    listActiveMaintenanceWindows(id),
  ]);
  const myEquipmentBookings = myBookings
    .filter((booking) => booking.equipment_id === id)
    .slice(0, 6);
  const canBook = equipment.status === "normal" && equipment.is_bookable;
  const hasEquipmentPermission = permissions.some((permission) => permission.equipment_id === id);
  const certificationBlocked =
    equipment.requires_certification &&
    profile.role !== "admin" &&
    (profile.status !== "active" || !hasEquipmentPermission);

  return (
    <main className="safe-page space-y-4">
      <section className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{equipment.name}</h1>
            <p className="text-sm text-slate-600">{equipment.code} · {equipment.location}</p>
            <p className="mt-1 text-sm text-slate-600">
              {equipment.requires_certification ? "需要管理员单独授权后预约" : "注册后即可预约"}
            </p>
          </div>
          <StatusBadge value={equipment.status} />
        </div>
        {equipment.description ? <p className="text-slate-700">{equipment.description}</p> : null}
        {equipment.usage_notes ? (
          <p className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
            {equipment.usage_notes}
          </p>
        ) : null}
      </section>

      <Card>
        <CardHeader><h2 className="font-semibold">立即预约</h2></CardHeader>
        <CardContent>
          {!canBook ? <p className="text-slate-600">该设备当前不可预约。</p> : null}
          {canBook && certificationBlocked ? (
            <p className="text-slate-600">该设备需要账号 active 且获得管理员单独授权后才能预约。你仍可查看设备信息和近期预约。</p>
          ) : null}
          {canBook && !certificationBlocked ? (
            <BookingForm
              equipmentId={equipment.id}
              equipmentCode={equipment.code}
              bookedRanges={bookings.map((booking) => ({
                start_time: booking.start_time,
                end_time: booking.end_time,
              })).concat(maintenanceWindows.map((window) => ({
                start_time: window.start_time,
                end_time: window.end_time,
              })))}
              recentBookings={myEquipmentBookings.map((booking) => ({
                id: booking.id,
                start_time: booking.start_time,
                end_time: booking.end_time,
                purpose: booking.purpose,
                status: booking.status,
                cancel_reason: booking.cancel_reason,
              }))}
            />
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
