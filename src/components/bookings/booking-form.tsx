"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/form";
import { createBookingAction, updateBookingAction } from "@/lib/actions/bookings";
import { combineLocalDateTime, formatLocalDate } from "@/lib/utils/time";

type BookingFormProps = {
  equipmentId: string;
  equipmentCode?: string;
  bookingId?: string;
  initialPurpose?: string;
  initialDate?: string;
  initialStart?: string;
  initialEnd?: string;
  bookedRanges?: BookedRange[];
  recentBookings?: {
    id: string;
    start_time: string;
    end_time: string;
    purpose: string;
    status: string;
    cancel_reason: string | null;
  }[];
};

type BookedRange = {
  start_time: string;
  end_time: string;
  kind?: "booking" | "maintenance";
  bookerName?: string;
  bookerEmail?: string;
  purpose?: string;
  note?: string | null;
};

const evaporationSources = [
  { id: 1, label: "有机源 1" },
  { id: 2, label: "有机源 2" },
  { id: 3, label: "有机源 3", defaultMaterial: "PO-T2T" },
  { id: 4, label: "有机源 4", defaultMaterial: "TPBi" },
  { id: 5, label: "有机源 5" },
  { id: 6, label: "有机源 6" },
  { id: 7, label: "金属源 7", defaultMaterial: "LiF" },
  { id: 8, label: "金属源 8", defaultMaterial: "Ag" },
  { id: 9, label: "金属源 9", defaultMaterial: "Al" },
];

export function BookingForm({
  equipmentId,
  equipmentCode,
  bookingId,
  initialPurpose = "蒸镀器件",
  initialDate,
  initialStart = "09:00",
  initialEnd = "10:00",
  bookedRanges = [],
  recentBookings = [],
}: BookingFormProps) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [selectedSources, setSelectedSources] = useState<number[]>([4, 7, 9]);
  const [step, setStep] = useState<1 | 2>(1);
  const today = useMemo(() => formatLocalDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(initialDate || today);
  const [selectedStart, setSelectedStart] = useState(initialStart);
  const [selectedEnd, setSelectedEnd] = useState(initialEnd);
  const [hasSelectedSlot, setHasSelectedSlot] = useState(Boolean(bookingId || initialDate));
  const action = bookingId ? updateBookingAction : createBookingAction;
  const showEvaporationSources = equipmentCode?.startsWith("EVAP");
  const hourSlots = useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => {
        const totalStartMinutes = index * 30;
        const totalEndMinutes = totalStartMinutes + 30;
        const startHour = Math.floor(totalStartMinutes / 60);
        const startMinute = totalStartMinutes % 60;
        const endHour = Math.floor(totalEndMinutes / 60) % 24;
        const endMinute = totalEndMinutes % 60;
        const start = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`;
        const end = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
        return {
          start,
          end,
          startMinutes: totalStartMinutes,
          endMinutes: totalEndMinutes,
          label: `${startHour}:${String(startMinute).padStart(2, "0")}-${totalEndMinutes >= 24 * 60 ? "次日 " : ""}${endHour}:${String(endMinute).padStart(2, "0")}`,
        };
      }),
    [],
  );

  function buildSourceSummary(formData: FormData) {
    if (!showEvaporationSources) return "";
    const lines = selectedSources.map((sourceId) => {
      const source = evaporationSources.find((item) => item.id === sourceId);
      const material = String(formData.get(`sourceMaterial-${sourceId}`) || "").trim();
      return `${sourceId}号${source?.label.includes("金属") ? "金属源" : "有机源"}：${material || "未填写材料"}`;
    });
    return lines.length > 0 ? `蒸镀源：${lines.join("；")}` : "";
  }

  function dateFromDayMinutes(minutes: number) {
    const value = combineLocalDateTime(selectedDate, "00:00");
    value.setMinutes(value.getMinutes() + minutes);
    return value;
  }

  function getBookedRangeForSlot(startMinutes: number, endMinutes: number) {
    const slotStart = dateFromDayMinutes(startMinutes);
    const slotEnd = dateFromDayMinutes(endMinutes);
    const overlappingRanges = bookedRanges.filter((booking) => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
    return overlappingRanges.find((booking) => booking.kind === "maintenance") || overlappingRanges[0] || null;
  }

  function isSlotBooked(startMinutes: number, endMinutes: number) {
    return Boolean(getBookedRangeForSlot(startMinutes, endMinutes));
  }

  function describeBookedRange(range: BookedRange) {
    const start = new Date(range.start_time).toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const end = new Date(range.end_time).toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (range.kind === "maintenance") {
      return [`该时段为维护时间`, `${start} - ${end}`, range.note ? `原因：${range.note}` : ""]
        .filter(Boolean)
        .join("\n");
    }

    return [
      `该时段已被预约`,
      `${start} - ${end}`,
      range.bookerName ? `预约人：${range.bookerName}` : "",
      range.bookerEmail ? `邮箱：${range.bookerEmail}` : "",
      range.purpose ? `用途：${range.purpose}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function isMyConfirmedSlot(startMinutes: number, endMinutes: number) {
    const slotStart = dateFromDayMinutes(startMinutes);
    const slotEnd = dateFromDayMinutes(endMinutes);
    return recentBookings.some((booking) => {
      if (booking.status !== "confirmed") return false;
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
  }

  function toMinutes(value: string) {
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  }

  function isSlotSelected(start: string, end: string) {
    let startMinute = toMinutes(start);
    let endMinute = toMinutes(end);
    const selectedStartMinute = toMinutes(selectedStart);
    let selectedEndMinute = toMinutes(selectedEnd);
    if (selectedEndMinute <= selectedStartMinute) selectedEndMinute += 24 * 60;
    if (startMinute < selectedStartMinute) {
      startMinute += 24 * 60;
      endMinute += 24 * 60;
    }
    if (endMinute <= startMinute) endMinute += 24 * 60;
    return startMinute >= selectedStartMinute && endMinute <= selectedEndMinute;
  }

  function getRelativeSlotMinutes(start: string, end: string) {
    const selectedStartMinute = toMinutes(selectedStart);
    let startMinute = toMinutes(start);
    let endMinute = toMinutes(end);
    if (startMinute < selectedStartMinute) {
      startMinute += 24 * 60;
      endMinute += 24 * 60;
    }
    if (endMinute <= startMinute) endMinute += 24 * 60;
    return { startMinute, endMinute };
  }

  function rangeHasBookedSlot(start: string, end: string) {
    const startMinute = toMinutes(start);
    let endMinute = toMinutes(end);
    if (endMinute <= startMinute) endMinute += 24 * 60;
    return hourSlots.some(
      (slot) => {
        let slotStart = slot.startMinutes;
        let slotEnd = slot.endMinutes;
        if (slotStart < startMinute) {
          slotStart += 24 * 60;
          slotEnd += 24 * 60;
        }
        return slotStart >= startMinute && slotEnd <= endMinute && isSlotBooked(slotStart, slotEnd);
      },
    );
  }

  function selectSlot(start: string, end: string) {
    setError(undefined);
    if (!hasSelectedSlot) {
      setSelectedStart(start);
      setSelectedEnd(end);
      setHasSelectedSlot(true);
      return;
    }

    if (isSlotSelected(start, end)) {
      const selectedStartMinute = toMinutes(selectedStart);
      let selectedEndMinute = toMinutes(selectedEnd);
      if (selectedEndMinute <= selectedStartMinute) selectedEndMinute += 24 * 60;
      const clicked = getRelativeSlotMinutes(start, end);

      if (clicked.startMinute === selectedStartMinute) {
        setHasSelectedSlot(false);
        return;
      }

      if (clicked.endMinute === selectedEndMinute) {
        setSelectedEnd(start);
        return;
      }

      setSelectedStart(start);
      return;
    }

    const clickedStart = toMinutes(start);
    const currentStart = toMinutes(selectedStart);
    const nextStart = clickedStart < currentStart ? start : selectedStart;
    const nextEnd = clickedStart < currentStart ? selectedEnd : end;

    if (rangeHasBookedSlot(nextStart, nextEnd)) {
      setError("选择区间包含已预约时段，请避开灰色时段");
      return;
    }

    setSelectedStart(nextStart);
    setSelectedEnd(nextEnd);
  }

  function shiftDate(days: number) {
    const current = combineLocalDateTime(selectedDate, "00:00");
    current.setDate(current.getDate() + days);
    const next = formatLocalDate(current);
    if (next >= today) setSelectedDate(next);
  }

  function confirmTimeSelection() {
    setError(undefined);
    if (!hasSelectedSlot) {
      setError("请选择预约时间");
      return;
    }
    if (combineLocalDateTime(selectedDate, selectedStart) < new Date()) {
      setError("不能预约过去时间");
      return;
    }
    if (rangeHasBookedSlot(selectedStart, selectedEnd)) {
      setError("选择区间包含已预约时段，请避开灰色时段");
      return;
    }
    setStep(2);
  }

  function hasAdjacentOwnBooking() {
    if (bookingId) return false;
    const start = combineLocalDateTime(selectedDate, selectedStart);
    const end = combineLocalDateTime(selectedDate, selectedEnd);
    if (end <= start) end.setDate(end.getDate() + 1);
    return recentBookings.some((booking) => {
      if (booking.status !== "confirmed") return false;
      return new Date(booking.end_time).getTime() === start.getTime() || new Date(booking.start_time).getTime() === end.getTime();
    });
  }

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        setError(undefined);
        if (hasAdjacentOwnBooking()) {
          const shouldMerge = window.confirm("检测到你已有相邻预约，是否合并为一个连续预约？");
          if (shouldMerge) formData.set("mergeAdjacent", "1");
        }
        formData.set("sourceSummary", buildSourceSummary(formData));
        startTransition(async () => {
          const result = await action(formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <input type="hidden" name="equipmentId" value={equipmentId} />
      <input type="hidden" name="sourceSummary" value="" />
      <input type="hidden" name="date" value={selectedDate} />
      <input type="hidden" name="startTime" value={selectedStart} />
      <input type="hidden" name="endTime" value={selectedEnd} />
      <input type="hidden" name="mergeAdjacent" value="0" />
      {bookingId ? <input type="hidden" name="bookingId" value={bookingId} /> : null}
      {step === 1 ? (
        <div className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-center text-lg font-semibold text-sky-600">选择预约时间</h3>
            <div className="grid grid-cols-[72px_1fr_72px] items-center gap-2">
              <button
                type="button"
                className="min-h-11 rounded-md text-sky-600 disabled:text-slate-300"
                disabled={selectedDate <= today}
                onClick={() => shiftDate(-1)}
              >
                前一天
              </button>
              <Input
                aria-label="预约日期"
                type="date"
                min={today}
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
              <button
                type="button"
                className="min-h-11 rounded-md text-sky-600"
                onClick={() => shiftDate(1)}
              >
                后一天
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 min-[430px]:grid-cols-4">
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-sm border border-slate-300 bg-white" />
                空闲
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-sm bg-slate-400" />
                不可预约
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-sm bg-red-600" />
                维护中
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-sm bg-lime-300" />
                已选中
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-sm bg-emerald-700" />
                我的预约
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-center text-sm min-[430px]:grid-cols-3 sm:grid-cols-4">
              {hourSlots.map((slot) => {
                const bookedRange = getBookedRangeForSlot(slot.startMinutes, slot.endMinutes);
                const booked = Boolean(bookedRange);
                const maintenanceBlocked = bookedRange?.kind === "maintenance";
                const myBooked = isMyConfirmedSlot(slot.startMinutes, slot.endMinutes);
                const selected = hasSelectedSlot && isSlotSelected(slot.start, slot.end);
                const bookedLabel =
                  maintenanceBlocked
                    ? "维护中"
                    : bookedRange?.bookerName || "已约";
                return (
                  <button
                    key={slot.start}
                    type="button"
                    aria-disabled={booked}
                    title={bookedRange ? describeBookedRange(bookedRange) : undefined}
                    onClick={() => {
                      if (bookedRange) {
                        window.alert(describeBookedRange(bookedRange));
                        return;
                      }
                      selectSlot(slot.start, slot.end);
                    }}
                    className={[
                      "min-h-10 rounded-md border border-slate-200 px-1.5 py-2 text-sm",
                      myBooked && !maintenanceBlocked ? "bg-emerald-700 text-white" : "",
                      maintenanceBlocked ? "border-red-600 bg-red-600 text-white" : "",
                      booked && !myBooked && !maintenanceBlocked ? "bg-slate-400 text-white" : "",
                      selected && !booked ? "bg-lime-300 text-slate-900" : "",
                      !booked && !selected ? "bg-white text-blue-700" : "",
                    ].join(" ")}
                  >
                    <span className="block">{slot.label}</span>
                    {myBooked ? <span className="block text-xs">我的</span> : null}
                    {booked && !myBooked ? <span className="block truncate text-xs">{bookedLabel}</span> : null}
                  </button>
                );
              })}
            </div>
            {hasSelectedSlot ? (
              <p className="text-center text-sm text-slate-600">
                已选：{selectedStart} - {toMinutes(selectedEnd) <= toMinutes(selectedStart) ? "次日 " : ""}{selectedEnd}；点击起点取消，点击区间内时段可调整范围
              </p>
            ) : (
              <p className="text-center text-sm text-slate-600">请选择一个半小时时段；再次点击可扩展为连续预约。</p>
            )}
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <h3 className="font-semibold">我的近期预约</h3>
            <div className="mt-3 space-y-2">
              {recentBookings.map((booking) => (
                <details key={booking.id} className="rounded-md border border-slate-200 p-2">
                  <summary className="cursor-pointer list-none text-sm font-medium">
                    {new Date(booking.start_time).toLocaleString("zh-CN", {
                      timeZone: "Asia/Shanghai",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    <span className="ml-2 text-xs text-slate-500">{booking.status}</span>
                  </summary>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{booking.purpose}</p>
                  {booking.cancel_reason ? (
                    <p className="mt-1 text-xs text-slate-500">{booking.cancel_reason}</p>
                  ) : null}
                </details>
              ))}
              {recentBookings.length === 0 ? <p className="text-sm text-slate-600">暂无该设备预约记录。</p> : null}
            </div>
          </div>
          <Button type="button" onClick={confirmTimeSelection} className="w-full">
            确认预约时间
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            已选时间：{selectedDate} {selectedStart} - {toMinutes(selectedEnd) <= toMinutes(selectedStart) ? "次日 " : ""}{selectedEnd}
          </div>
          <div>
            <Label htmlFor="purpose">用途</Label>
            <Textarea id="purpose" name="purpose" defaultValue={initialPurpose} placeholder="例如：蒸镀器件" required />
          </div>
          {showEvaporationSources ? (
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">蒸镀源</p>
                <p className="mt-1 text-xs text-slate-600">
                  默认选择 4/7/9 号源。3 号默认 PO-T2T，4 号默认 TPBi，7 号默认 LiF，8 号默认 Ag，9 号默认 Al；其他源请填写材料。
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {evaporationSources.map((source) => {
                  const checked = selectedSources.includes(source.id);
                  return (
                    <div key={source.id} className="rounded-md border border-slate-200 bg-white p-3">
                      <label className="flex min-h-9 items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setSelectedSources((current) =>
                              event.target.checked
                                ? [...current, source.id].sort((a, b) => a - b)
                                : current.filter((id) => id !== source.id),
                            );
                          }}
                        />
                        {source.label}
                      </label>
                      {checked ? (
                        <Input
                          name={`sourceMaterial-${source.id}`}
                          defaultValue={source.defaultMaterial || ""}
                          placeholder="填写材料"
                          required={!source.defaultMaterial}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              上一步
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "提交中..." : bookingId ? "保存修改" : "提交预约"}
            </Button>
          </div>
        </div>
      )}
      <FieldError message={error} />
    </form>
  );
}
