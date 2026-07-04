import Link from "next/link";
import { ActiveBookingControls } from "@/components/bookings/active-booking-controls";
import { CancelBookingForm } from "@/components/bookings/cancel-booking-form";
import { UsageReportForm } from "@/components/bookings/usage-report-form";
import { IssueForm } from "@/components/equipment/issue-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAuthenticatedProfile } from "@/lib/data/auth";
import { listEquipment, listMyBookings, listMyIssueReports } from "@/lib/data/equipment";
import { formatLocalDateTime } from "@/lib/utils/time";

export default async function BookingsPage() {
  const { user } = await requireAuthenticatedProfile();
  const [bookings, issues, equipment] = await Promise.all([
    listMyBookings(user.id),
    listMyIssueReports(user.id),
    listEquipment(),
  ]);
  const now = new Date();
  const upcoming = bookings.filter(
    (booking) => booking.status === "confirmed" && new Date(booking.end_time) >= now,
  );
  const cancelled = bookings.filter((booking) => ["cancelled", "admin_cancelled"].includes(booking.status));
  const history = bookings.filter(
    (booking) =>
      booking.status === "used" ||
      (booking.status === "confirmed" && new Date(booking.end_time) < now),
  );

  const renderBookings = (items: typeof bookings) => (
    <section className="space-y-3">
      {items.map((booking) => (
        <Card key={booking.id}>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{booking.equipment.name}</h2>
                <p className="text-sm text-slate-600">{formatLocalDateTime(booking.start_time)} - {formatLocalDateTime(booking.end_time)}</p>
                <p className="mt-1 text-sm text-slate-700">{booking.purpose}</p>
              </div>
              <StatusBadge value={booking.status} />
            </div>
            {booking.status === "confirmed" && new Date(booking.start_time) > new Date() ? (
              <div className="space-y-2">
                <Button variant="secondary" className="w-full sm:w-auto">
                  <Link href={`/bookings/${booking.id}/edit`}>修改预约</Link>
                </Button>
                <CancelBookingForm bookingId={booking.id} />
              </div>
            ) : null}
            {booking.status === "confirmed" && new Date(booking.start_time) <= new Date() ? (
              <ActiveBookingControls bookingId={booking.id} />
            ) : null}
            {booking.status === "confirmed" && new Date(booking.start_time) <= new Date() ? (
              <details>
                <summary className="cursor-pointer text-sm font-medium text-teal-700">记录使用情况</summary>
                <div className="mt-2">
                  <UsageReportForm bookingId={booking.id} />
                </div>
              </details>
            ) : null}
            {booking.status === "used" && booking.cancel_reason ? (
              <p className="rounded-md bg-slate-50 p-2 text-sm text-slate-600">使用记录：{booking.cancel_reason}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
      {items.length === 0 ? <p className="text-slate-600">暂无记录。</p> : null}
    </section>
  );

  return (
    <main className="safe-page space-y-5">
      <h1 className="text-2xl font-semibold">我的预约</h1>
      <h2 className="text-lg font-semibold">即将到来</h2>
      {renderBookings(upcoming)}
      <h2 className="text-lg font-semibold">已取消</h2>
      {renderBookings(cancelled)}
      <h2 className="text-lg font-semibold">历史预约</h2>
      {renderBookings(history)}

      <Card>
        <CardHeader><h2 className="font-semibold">提交设备异常反馈</h2></CardHeader>
        <CardContent>
          <IssueForm equipmentOptions={equipment} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">我的异常反馈</h2></CardHeader>
        <CardContent className="space-y-3">
          {issues.map((issue) => (
            <div key={issue.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{issue.equipment.name}</p>
                <StatusBadge value={issue.status} />
              </div>
              <p className="mt-1 text-sm text-slate-700">{issue.description}</p>
              {issue.admin_note ? <p className="mt-1 text-sm text-slate-500">管理员备注：{issue.admin_note}</p> : null}
            </div>
          ))}
          {issues.length === 0 ? <p className="text-slate-600">暂无异常反馈。</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
