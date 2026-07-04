import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(6, "密码至少 6 位"),
});

export const registerSchema = loginSchema.extend({
  fullName: z.string().min(2, "请填写姓名"),
});
