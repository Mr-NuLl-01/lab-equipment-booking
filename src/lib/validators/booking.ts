import { z } from "zod";
import { combineLocalDateTime, isThirtyMinuteAligned } from "@/lib/utils/time";

export const bookingSchema = z.object({
  equipmentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  purpose: z.string().min(2, "请填写预约用途").max(300, "用途不能超过 300 字"),
});

type BookingTimeValidation =
  | { ok: true; start: Date; end: Date }
  | { ok: false; message: string };

export function validateBookingTime(input: z.infer<typeof bookingSchema>) {
  const start = combineLocalDateTime(input.date, input.startTime);
  const end = combineLocalDateTime(input.date, input.endTime);
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  if (!isThirtyMinuteAligned(start) || !isThirtyMinuteAligned(end)) {
    return { ok: false, message: "预约时间必须对齐到 30 分钟" } satisfies BookingTimeValidation;
  }
  if (start < new Date()) {
    return { ok: false, message: "不能预约过去时间" } satisfies BookingTimeValidation;
  }
  if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) {
    return { ok: false, message: "单次预约不能超过 24 小时" } satisfies BookingTimeValidation;
  }
  return { ok: true, start, end } satisfies BookingTimeValidation;
}
