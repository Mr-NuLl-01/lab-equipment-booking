import { BookingForm } from "@/components/bookings/booking-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireAuthenticatedProfile } from "@/lib/data/auth";
import { getBooking } from "@/lib/data/equipment";
import { formatLocalDate } from "@/lib/utils/time";

function toTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile } = await requireAuthenticatedProfile();
  const booking = await getBooking(id);
  if (profile.role !== "admin" && booking.user_id !== user.id) {
    return <main className="safe-page"><p>无权访问该预约。</p></main>;
  }

  return (
    <main className="safe-page">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">修改预约</h1>
          <p className="text-sm text-slate-600">{booking.equipment.name}</p>
        </CardHeader>
        <CardContent>
          <BookingForm
            equipmentId={booking.equipment_id}
            equipmentCode={booking.equipment.code}
            bookingId={booking.id}
            initialPurpose={booking.purpose}
            initialDate={formatLocalDate(new Date(booking.start_time))}
            initialStart={toTime(booking.start_time)}
            initialEnd={toTime(booking.end_time)}
          />
        </CardContent>
      </Card>
    </main>
  );
}
