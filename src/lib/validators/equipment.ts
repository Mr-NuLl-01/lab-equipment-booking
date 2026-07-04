import { z } from "zod";

export const equipmentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "设备名称至少 2 个字"),
  code: z.string().min(1, "请填写设备编号"),
  location: z.string().min(1, "请填写位置"),
  category: z.string().min(1, "请填写分类"),
  description: z.string().optional(),
  usageNotes: z.string().optional(),
  status: z.enum(["normal", "paused", "maintenance", "retired"]),
  isBookable: z.coerce.boolean(),
  requiresCertification: z.coerce.boolean(),
  minBookingMinutes: z.coerce.number().int().min(30),
  maxBookingMinutes: z.coerce.number().int().min(30).optional().or(z.literal("")),
});
