"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import { equipmentSchema } from "@/lib/validators/equipment";

export async function updateMemberAction(formData: FormData) {
  const { user } = await requireAdmin();
  const id = String(formData.get("id"));
  const role = String(formData.get("role"));
  const status = String(formData.get("status"));
  const permissionEquipmentIds = formData.getAll("equipmentPermission").map(String);

  if (!["student", "admin"].includes(role)) return { error: "无效角色" };
  if (!["pending", "active", "disabled"].includes(status)) return { error: "无效状态" };
  if (id === user.id && (status === "disabled" || role !== "admin")) {
    return { error: "不能禁用自己或移除自己的管理员权限" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, status })
    .eq("id", id);
  if (error) return { error: "更新成员失败：" + error.message };

  if (formData.get("permissionsIncluded") === "1") {
    const { error: deleteError } = await supabase
      .from("equipment_permissions")
      .delete()
      .eq("user_id", id);
    if (deleteError) {
      if (deleteError.message.includes("equipment_permissions")) {
        revalidatePath("/admin/members");
        return { error: "成员状态已更新，但设备权限表不存在。请先重新执行 supabase/schema.sql。" };
      }
      return { error: "更新设备权限失败：" + deleteError.message };
    }

    if (permissionEquipmentIds.length > 0) {
      const { error: insertError } = await supabase.from("equipment_permissions").insert(
        permissionEquipmentIds.map((equipmentId) => ({
          user_id: id,
          equipment_id: equipmentId,
          granted_by: user.id,
        })),
      );
      if (insertError) return { error: "保存设备权限失败：" + insertError.message };
    }
  }

  revalidatePath("/admin/members");
  revalidatePath("/me");
  return { ok: true };
}

export async function upsertEquipmentAction(formData: FormData) {
  await requireAdmin();
  const raw = {
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    code: formData.get("code"),
    location: formData.get("location"),
    category: formData.get("category"),
    description: formData.get("description") || "",
    usageNotes: formData.get("usageNotes") || "",
    status: formData.get("status"),
    isBookable: formData.get("isBookable") === "on",
    requiresCertification: formData.get("requiresCertification") === "on",
    minBookingMinutes: formData.get("minBookingMinutes"),
    maxBookingMinutes: formData.get("maxBookingMinutes") || "",
  };
  const parsed = equipmentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const payload = {
    name: parsed.data.name,
    code: parsed.data.code,
    location: parsed.data.location,
    category: parsed.data.category,
    description: parsed.data.description,
    usage_notes: parsed.data.usageNotes,
    status: parsed.data.status,
    is_bookable: parsed.data.isBookable,
    requires_certification: parsed.data.requiresCertification,
    min_booking_minutes: parsed.data.minBookingMinutes,
    max_booking_minutes:
      parsed.data.maxBookingMinutes === "" ? null : parsed.data.maxBookingMinutes,
  };

  const request = parsed.data.id
    ? supabase.from("equipment").update(payload).eq("id", parsed.data.id)
    : supabase.from("equipment").insert(payload);

  const { error } = await request;
  if (error) return { error: "保存设备失败：" + error.message };
  revalidatePath("/admin/equipment");
  revalidatePath("/");
  return { ok: true };
}

export async function removeEquipmentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return { error: "缺少设备 ID" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("equipment")
    .update({ status: "retired", is_bookable: false })
    .eq("id", id);
  if (error) return { error: "移除设备失败：" + error.message };
  revalidatePath("/admin/equipment");
  revalidatePath("/equipment");
  return { ok: true };
}

export async function updateIssueAction(formData: FormData) {
  await requireAdmin();
  const issueId = String(formData.get("issueId"));
  const status = String(formData.get("status"));
  const adminNote = String(formData.get("adminNote") || "");
  const markMaintenance = formData.get("markMaintenance") === "on";
  const equipmentId = String(formData.get("equipmentId"));

  if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
    return { error: "无效反馈状态" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("issue_reports")
    .update({
      status,
      admin_note: adminNote || null,
      resolved_at: ["resolved", "closed"].includes(status) ? new Date().toISOString() : null,
    })
    .eq("id", issueId);
  if (error) return { error: "更新反馈失败：" + error.message };

  if (markMaintenance) {
    const { error: equipmentError } = await supabase
      .from("equipment")
      .update({ status: "maintenance", is_bookable: false })
      .eq("id", equipmentId);
    if (equipmentError) return { error: "设备状态更新失败：" + equipmentError.message };
  }

  revalidatePath("/admin/issues");
  revalidatePath(`/equipment/${equipmentId}`);
  return { ok: true };
}

export async function upsertMaintenanceTaskAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const equipmentId = String(formData.get("equipmentId") || "");
  const name = String(formData.get("name") || "").trim();
  const taskType = String(formData.get("taskType") || "maintenance");
  const description = String(formData.get("description") || "").trim();
  const intervalDays = Number(formData.get("intervalDays"));
  const lastCompletedAt = String(formData.get("lastCompletedAt") || "");
  const isActive = formData.get("isActive") === "on";

  if (!equipmentId) return { error: "请选择设备" };
  if (!["consumable", "maintenance"].includes(taskType)) return { error: "无效提醒类型" };
  if (name.length < 2) return { error: "维护项名称至少 2 个字" };
  if (!Number.isInteger(intervalDays) || intervalDays < 1) return { error: "提醒间隔至少 1 天" };
  if (!lastCompletedAt) return { error: "请选择上次完成日期" };

  const last = new Date(`${lastCompletedAt}T00:00:00+08:00`);
  const next = new Date(last);
  next.setDate(next.getDate() + intervalDays);

  const supabase = await createClient();
  const payload = {
    equipment_id: equipmentId,
    task_type: taskType,
    name,
    description: description || null,
    interval_days: intervalDays,
    last_completed_at: last.toISOString(),
    next_due_at: next.toISOString(),
    is_active: isActive,
  };
  const request = id
    ? supabase.from("maintenance_tasks").update(payload).eq("id", id)
    : supabase.from("maintenance_tasks").insert(payload);
  const { error } = await request;
  if (error) return { error: "保存维护提醒失败：" + error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/maintenance");
  return { ok: true };
}

export async function completeMaintenanceTaskAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const completedAtRaw = String(formData.get("completedAt") || "");
  if (!id) return { error: "缺少维护项 ID" };
  if (!completedAtRaw) return { error: "请选择完成日期" };

  const supabase = await createClient();
  const { data: task, error: taskError } = await supabase
    .from("maintenance_tasks")
    .select("interval_days")
    .eq("id", id)
    .single<{ interval_days: number }>();
  if (taskError) return { error: "读取维护项失败：" + taskError.message };

  const completedAt = new Date(`${completedAtRaw}T00:00:00+08:00`);
  const next = new Date(completedAt);
  next.setDate(next.getDate() + task.interval_days);

  const { error } = await supabase
    .from("maintenance_tasks")
    .update({
      last_completed_at: completedAt.toISOString(),
      next_due_at: next.toISOString(),
    })
    .eq("id", id);
  if (error) return { error: "重置计时失败：" + error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/maintenance");
  return { ok: true };
}

export async function createMaintenanceWindowAction(formData: FormData) {
  const { user } = await requireAdmin();
  const equipmentId = String(formData.get("equipmentId") || "");
  const startDate = String(formData.get("startDate") || "");
  const startTime = String(formData.get("startTime") || "");
  const endDate = String(formData.get("endDate") || "");
  const endTime = String(formData.get("endTime") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!equipmentId) return { error: "请选择设备" };
  if (!startDate || !startTime || !endDate || !endTime) return { error: "请选择维护时间" };
  if (reason.length < 2) return { error: "请填写维护原因" };

  const start = new Date(`${startDate}T${startTime}:00+08:00`);
  const end = new Date(`${endDate}T${endTime}:00+08:00`);
  if (end <= start) return { error: "结束时间必须晚于开始时间" };

  const supabase = await createClient();
  const { data: windowRow, error: windowError } = await supabase
    .from("maintenance_windows")
    .insert({
      equipment_id: equipmentId,
      reason,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();
  if (windowError) return { error: "创建维护窗口失败：" + windowError.message };

  const marker = `维护窗口:${windowRow.id}:${reason}`;
  const { error: bookingError } = await supabase
    .from("bookings")
    .update({
      status: "admin_cancelled",
      cancel_reason: marker,
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString(),
    })
    .eq("equipment_id", equipmentId)
    .eq("status", "confirmed")
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString());
  if (bookingError) return { error: "维护窗口已创建，但取消预约失败：" + bookingError.message };

  revalidatePath("/admin/maintenance");
  revalidatePath("/admin/bookings");
  revalidatePath("/bookings");
  revalidatePath("/me");
  revalidatePath(`/equipment/${equipmentId}`);
  return { ok: true };
}

export async function completeMaintenanceWindowAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const completedAtRaw = String(formData.get("completedAt") || "");
  if (!id) return { error: "缺少维护窗口 ID" };
  if (!completedAtRaw) return { error: "请选择完成时间" };
  const completedAt = new Date(
    completedAtRaw.includes("+") || completedAtRaw.endsWith("Z")
      ? completedAtRaw
      : `${completedAtRaw}:00+08:00`,
  );

  const supabase = await createClient();
  const { data: windowRow, error: windowError } = await supabase
    .from("maintenance_windows")
    .select("equipment_id")
    .eq("id", id)
    .single<{ equipment_id: string }>();
  if (windowError) return { error: "读取维护窗口失败：" + windowError.message };

  const { error } = await supabase
    .from("maintenance_windows")
    .update({ status: "completed", completed_at: completedAt.toISOString() })
    .eq("id", id);
  if (error) return { error: "结束维护失败：" + error.message };

  const { data: cancelledBookings } = await supabase
    .from("bookings")
    .select("id,start_time,end_time")
    .eq("equipment_id", windowRow.equipment_id)
    .eq("status", "admin_cancelled")
    .like("cancel_reason", `维护窗口:${id}:%`)
    .gte("start_time", completedAt.toISOString());

  for (const booking of cancelledBookings || []) {
    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id")
      .eq("equipment_id", windowRow.equipment_id)
      .eq("status", "confirmed")
      .neq("id", booking.id)
      .lt("start_time", booking.end_time)
      .gt("end_time", booking.start_time)
      .limit(1);
    if (conflicts && conflicts.length === 0) {
      await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          cancel_reason: null,
          cancelled_by: null,
          cancelled_at: null,
        })
        .eq("id", booking.id);
    }
  }

  revalidatePath("/admin/maintenance");
  revalidatePath("/admin/bookings");
  revalidatePath("/bookings");
  revalidatePath("/me");
  revalidatePath(`/equipment/${windowRow.equipment_id}`);
  return { ok: true };
}
