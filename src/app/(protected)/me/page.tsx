import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAuthenticatedProfile } from "@/lib/data/auth";
import { listEquipment, listEquipmentPermissions, listMyBookings, listUpcomingBookings } from "@/lib/data/equipment";
import { formatLocalDateTime } from "@/lib/utils/time";

function canBookEquipment(
  profile: { role: string; status: string },
  equipment: { id: string; requires_certification: boolean; status: string; is_bookable: boolean },
  permissionEquipmentIds: Set<string>,
) {
  if (equipment.status !== "normal" || !equipment.is_bookable) return false;
  if (profile.role === "admin" && profile.status === "active") return true;
  if (!equipment.requires_certification) return profile.status !== "disabled";
  return profile.status === "active" && permissionEquipmentIds.has(equipment.id);
}

export default async function MePage() {
  const { user, profile } = await requireAuthenticatedProfile();
  const [bookings, equipment, upcomingBookings, permissions] = await Promise.all([
    listMyBookings(user.id),
    listEquipment({ includeRetired: true }),
    listUpcomingBookings(),
    listEquipmentPermissions(user.id),
  ]);
  const permissionEquipmentIds = new Set(permissions.map((permission) => permission.equipment_id));
  const now = new Date();
  const firstFutureByEquipment = new Map<string, string>();
  const hasActiveCurrentBooking = new Set<string>();
  for (const booking of upcomingBookings) {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    if (start <= now && end > now) {
      hasActiveCurrentBooking.add(booking.equipment_id);
    }
    if (start > now && !firstFutureByEquipment.has(booking.equipment_id)) {
      firstFutureByEquipment.set(booking.equipment_id, booking.id);
    }
  }

  return (
    <main className="safe-page space-y-5">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">我的</h1>
        <p className="break-all text-sm text-slate-600">{profile.full_name} · {profile.email}</p>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={profile.role} />
          <StatusBadge value={profile.status} />
        </div>
      </section>

      <Card>
        <CardHeader><h2 className="font-semibold">设备使用权限</h2></CardHeader>
        <CardContent className="space-y-3">
          {equipment.map((item) => {
            const allowed = canBookEquipment(profile, item, permissionEquipmentIds);
            return (
              <Link
                key={item.id}
                href={`/equipment/${item.id}`}
                className="block rounded-md border border-slate-200 p-3 hover:border-teal-300"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-slate-600">{item.code} · {item.location}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.requires_certification ? "需要单独授权" : "无需授权"} · {item.is_bookable ? "开放预约" : "暂停预约"}
                    </p>
                  </div>
                  <span className={allowed ? "text-sm font-medium text-teal-700" : "text-sm font-medium text-slate-500"}>
                    {allowed ? "可预约" : "不可预约"}
                  </span>
                </div>
              </Link>
            );
          })}
          {equipment.length === 0 ? <p className="text-slate-600">暂无设备。</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">所有预约记录</h2></CardHeader>
        <CardContent className="space-y-3">
          {bookings.map((booking) => (
            <details key={booking.id} className="rounded-md border border-slate-200 p-3">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{booking.equipment.name}</p>
                    <p className="text-sm text-slate-600">
                      {formatLocalDateTime(booking.start_time)} - {formatLocalDateTime(booking.end_time)}
                    </p>
                    {booking.status === "confirmed" &&
                    new Date(booking.start_time) > now &&
                    firstFutureByEquipment.get(booking.equipment_id) === booking.id &&
                    !hasActiveCurrentBooking.has(booking.equipment_id) ? (
                      <p className="mt-1 text-sm font-medium text-teal-700">
                        设备当前空闲，可提前联系使用
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge value={booking.status} />
                </div>
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{booking.purpose}</p>
              {booking.cancel_reason ? (
                <p className="mt-1 text-sm text-slate-500">记录：{booking.cancel_reason}</p>
              ) : null}
            </details>
          ))}
          {bookings.length === 0 ? <p className="text-slate-600">暂无预约记录。</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
