import { describe, expect, it } from "vitest";
import { hasTimeOverlap } from "@/lib/utils/booking-rules";
import { validateBookingTime } from "@/lib/validators/booking";

const at = (time: string) => new Date(`2026-07-04T${time}:00+08:00`);
const demoEquipmentId = "00000000-0000-4000-8000-000000000001";

describe("hasTimeOverlap", () => {
  it("detects partial overlaps", () => {
    expect(hasTimeOverlap(at("09:30"), at("10:30"), at("09:00"), at("10:00"))).toBe(true);
    expect(hasTimeOverlap(at("08:30"), at("09:30"), at("09:00"), at("10:00"))).toBe(true);
  });

  it("allows adjacent bookings", () => {
    expect(hasTimeOverlap(at("10:00"), at("11:00"), at("09:00"), at("10:00"))).toBe(false);
    expect(hasTimeOverlap(at("08:00"), at("09:00"), at("09:00"), at("10:00"))).toBe(false);
  });
});

describe("validateBookingTime", () => {
  it("allows an overnight booking within 24 hours", () => {
    const result = validateBookingTime({
      equipmentId: demoEquipmentId,
      date: "2099-07-05",
      startTime: "23:30",
      endTime: "00:30",
      purpose: "overnight use",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.end.getTime() - result.start.getTime()).toBe(60 * 60 * 1000);
    }
  });
});
