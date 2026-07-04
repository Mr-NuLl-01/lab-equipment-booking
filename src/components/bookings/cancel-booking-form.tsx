"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { cancelBookingAction } from "@/lib/actions/bookings";

export function CancelBookingForm({ bookingId }: { bookingId: string }) {
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      action={(formData) => {
        setMessage(undefined);
        startTransition(async () => {
          const result = await cancelBookingAction(formData);
          setMessage(result?.error || "已取消");
        });
      }}
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <Input name="reason" placeholder="取消原因（可选）" />
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "处理中..." : "取消"}
      </Button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
