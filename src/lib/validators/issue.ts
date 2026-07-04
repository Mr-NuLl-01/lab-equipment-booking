import { z } from "zod";

export const issueSchema = z.object({
  equipmentId: z.string().uuid(),
  issueType: z.enum(["malfunction", "consumable", "abnormal_use", "other"]),
  description: z.string().min(5, "请至少描述 5 个字").max(1000, "描述不能超过 1000 字"),
});
