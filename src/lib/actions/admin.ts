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
    isPinned: formData.get("isPinned") === "on",
    sortOrder: formData.get("sortOrder") || 1000,
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
    is_pinned: parsed.data.isPinned,
    sort_order: parsed.data.sortOrder,
    min_booking_minutes: parsed.data.minBookingMinutes,
    max_booking_minutes:
      parsed.data.maxBookingMinutes === "" ? null : parsed.data.maxBookingMinutes,
  };

  const request = parsed.data.id
    ? supabase.from("equipment").update(payload).eq("id", parsed.data.id)
    : supabase.from("equipment").insert(payload);

  const { error } = await request;
  if (error) {
    if (error.message.includes("is_pinned") || error.message.includes("sort_order")) {
      return { error: "保存设备失败：设备排序字段尚未添加，请先执行新版 supabase/schema.sql" };
    }
    return { error: "保存设备失败：" + error.message };
  }
  revalidatePath("/admin/equipment");
  revalidatePath("/");
  return { ok: true };
}

export async function updateEquipmentMaintenanceLinksAction(formData: FormData) {
  const { user } = await requireAdmin();
  const sourceEquipmentId = String(formData.get("sourceEquipmentId") || "");
  const linkedEquipmentIds = formData
    .getAll("linkedEquipmentId")
    .map(String)
    .filter((id) => id && id !== sourceEquipmentId);

  if (!sourceEquipmentId) return { error: "缺少设备 ID" };

  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("equipment_maintenance_links")
    .delete()
    .eq("source_equipment_id", sourceEquipmentId);

  if (deleteError) {
    if (deleteError.message.includes("equipment_maintenance_links")) {
      return { error: "设备联动表不存在。请先在 Supabase SQL Editor 执行新版 supabase/schema.sql。" };
    }
    return { error: "清空原联动关系失败：" + deleteError.message };
  }

  if (linkedEquipmentIds.length > 0) {
    const { error: insertError } = await supabase.from("equipment_maintenance_links").insert(
      linkedEquipmentIds.map((linkedEquipmentId) => ({
        source_equipment_id: sourceEquipmentId,
        linked_equipment_id: linkedEquipmentId,
        created_by: user.id,
      })),
    );
    if (insertError) return { error: "保存联动关系失败：" + insertError.message };
  }

  revalidatePath("/admin/equipment");
  revalidatePath("/admin/maintenance");
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
  const { data: equipment, error: equipmentError } = await supabase
    .from("equipment")
    .select("id,name,code,status,is_bookable")
    .eq("id", equipmentId)
    .single<{
      id: string;
      name: string;
      code: string;
      status: "normal" | "paused" | "maintenance" | "retired";
      is_bookable: boolean;
    }>();
  if (equipmentError) return { error: "读取设备状态失败：" + equipmentError.message };

  const linkLookup = await supabase
    .from("equipment_maintenance_links")
    .select("linked_equipment_id")
    .eq("source_equipment_id", equipmentId);

  if (linkLookup.error && !linkLookup.error.message.includes("equipment_maintenance_links")) {
    return { error: "读取设备联动关系失败：" + linkLookup.error.message };
  }

  const linkedEquipmentIds = linkLookup.error
    ? []
    : (linkLookup.data || []).map((item) => item.linked_equipment_id as string);
  const affectedEquipmentIds = [...new Set([equipmentId, ...linkedEquipmentIds])];

  const { data: affectedEquipment, error: affectedEquipmentError } = await supabase
    .from("equipment")
    .select("id,name,code,status,is_bookable")
    .in("id", affectedEquipmentIds)
    .returns<
      {
        id: string;
        name: string;
        code: string;
        status: "normal" | "paused" | "maintenance" | "retired";
        is_bookable: boolean;
      }[]
    >();
  if (affectedEquipmentError) return { error: "读取联动设备失败：" + affectedEquipmentError.message };

  const affectedById = new Map((affectedEquipment || []).map((item) => [item.id, item]));
  const createdWindowEquipmentIds: string[] = [];

  for (const affectedId of affectedEquipmentIds) {
    const affected = affectedById.get(affectedId);
    if (!affected) continue;
    const windowReason =
      affectedId === equipmentId
        ? reason
        : `联动维护（${equipment.name} ${equipment.code}）：${reason}`;

    let windowInsert = await supabase
      .from("maintenance_windows")
      .insert({
        equipment_id: affectedId,
        reason: windowReason,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        previous_equipment_status: affected.status,
        previous_is_bookable: affected.is_bookable,
        created_by: user.id,
      })
      .select("id")
      .single<{ id: string }>();

    if (
      windowInsert.error &&
      (windowInsert.error.message.includes("previous_equipment_status") ||
        windowInsert.error.message.includes("previous_is_bookable"))
    ) {
      windowInsert = await supabase
        .from("maintenance_windows")
        .insert({
          equipment_id: affectedId,
          reason: windowReason,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          created_by: user.id,
        })
        .select("id")
        .single<{ id: string }>();
    }

    const { data: windowRow, error: windowError } = windowInsert;
    if (windowError) return { error: `创建 ${affected.name} 维护窗口失败：${windowError.message}` };

    const marker = `维护窗口:${windowRow.id}:${windowReason}`;
    const { error: bookingError } = await supabase
      .from("bookings")
      .update({
        status: "admin_cancelled",
        cancel_reason: marker,
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
      })
      .eq("equipment_id", affectedId)
      .eq("status", "confirmed")
      .lt("start_time", end.toISOString())
      .gt("end_time", start.toISOString());
    if (bookingError) return { error: `${affected.name} 维护窗口已创建，但取消预约失败：${bookingError.message}` };
    createdWindowEquipmentIds.push(affectedId);
  }

  revalidatePath("/admin/maintenance");
  revalidatePath("/admin/bookings");
  revalidatePath("/bookings");
  revalidatePath("/me");
  revalidatePath("/equipment");
  createdWindowEquipmentIds.forEach((id) => revalidatePath(`/equipment/${id}`));
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
  type MaintenanceWindowRestoreInfo = {
    equipment_id: string;
    previous_equipment_status: "normal" | "paused" | "maintenance" | "retired" | null;
    previous_is_bookable: boolean | null;
  };

  const windowLookup = await supabase
    .from("maintenance_windows")
    .select("equipment_id,previous_equipment_status,previous_is_bookable")
    .eq("id", id)
    .single<MaintenanceWindowRestoreInfo>();

  let windowRow = windowLookup.data;
  let windowError = windowLookup.error;

  if (
    windowError &&
    (windowError.message.includes("previous_equipment_status") ||
      windowError.message.includes("previous_is_bookable"))
  ) {
    const fallback = await supabase
      .from("maintenance_windows")
      .select("equipment_id")
      .eq("id", id)
      .single<{ equipment_id: string }>();
    windowRow = fallback.data
      ? {
          equipment_id: fallback.data.equipment_id,
          previous_equipment_status: null,
          previous_is_bookable: null,
        }
      : null;
    windowError = fallback.error;
  }

  if (windowError) return { error: "读取维护窗口失败：" + windowError.message };
  if (!windowRow) return { error: "维护窗口不存在" };

  const { error } = await supabase
    .from("maintenance_windows")
    .update({ status: "completed", completed_at: completedAt.toISOString() })
    .eq("id", id);
  if (error) return { error: "结束维护失败：" + error.message };

  const { data: activeWindows } = await supabase
    .from("maintenance_windows")
    .select("id")
    .eq("equipment_id", windowRow.equipment_id)
    .eq("status", "active")
    .neq("id", id)
    .limit(1);

  if (!activeWindows || activeWindows.length === 0) {
    await supabase
      .from("equipment")
      .update({
        status: windowRow.previous_equipment_status || "normal",
        is_bookable: windowRow.previous_is_bookable ?? true,
      })
      .eq("id", windowRow.equipment_id);
  }

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
  revalidatePath("/equipment");
  revalidatePath(`/equipment/${windowRow.equipment_id}`);
  return { ok: true };
}
