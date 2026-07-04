"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { extendBookingAction, finishBookingEarlyAction } from "@/lib/actions/bookings";

export function ActiveBookingControls({ bookingId }: { bookingId: string }) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3 rounded-md border border-teal-100 bg-teal-50 p-3">
      <form
        className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]"
        action={(formData) => {
          setMessage(undefined);
          startTransition(async () => {
            const result = await extendBookingAction(formData);
            setMessage(result?.error || "已延长预约");
          });
        }}
      >
        <input type="hidden" name="bookingId" value={bookingId} />
        <Input name="newEndTime" type="time" step={1800} required />
        <Button type="submit" disabled={pending} variant="secondary">
          延长使用
        </Button>
      </form>
      <form
        action={(formData) => {
          setMessage(undefined);
          startTransition(async () => {
            const result = await finishBookingEarlyAction(formData);
            setMessage(result?.error || "已提前结束");
          });
        }}
      >
        <input type="hidden" name="bookingId" value={bookingId} />
        <Button type="submit" disabled={pending} variant="danger" className="w-full sm:w-auto">
          提前结束
        </Button>
      </form>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
