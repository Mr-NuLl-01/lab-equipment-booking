"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedProfile } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import { issueSchema } from "@/lib/validators/issue";

export async function createIssueAction(formData: FormData) {
  const { user } = await requireAuthenticatedProfile();
  const parsed = issueSchema.safeParse({
    equipmentId: formData.get("equipmentId"),
    issueType: formData.get("issueType"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("issue_reports").insert({
    equipment_id: parsed.data.equipmentId,
    user_id: user.id,
    issue_type: parsed.data.issueType,
    description: parsed.data.description,
  });
  if (error) return { error: "提交失败：" + error.message };
  revalidatePath(`/equipment/${parsed.data.equipmentId}`);
  return { ok: true };
}
