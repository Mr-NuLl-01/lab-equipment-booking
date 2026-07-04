"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthenticatedProfile } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import { bookingSchema, validateBookingTime } from "@/lib/validators/booking";
import type { Profile } from "@/types/database";

async function ensureNoConflict(
  equipmentId: string,
  startIso: string,
  endIso: string,
  ignoreBookingId?: string | string[],
) {
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("id")
    .eq("equipment_id", equipmentId)
    .eq("status", "confirmed")
    .lt("start_time", endIso)
    .gt("end_time", startIso)
    .limit(1);

  const ignoredIds = Array.isArray(ignoreBookingId) ? ignoreBookingId : ignoreBookingId ? [ignoreBookingId] : [];
  for (const id of ignoredIds) query = query.neq("id", id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data.length === 0;
}

async function ensureNoMaintenanceWindow(equipmentId: string, startIso: string, endIso: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_windows")
    .select("id")
    .eq("equipment_id", equipmentId)
    .eq("status", "active")
    .lt("start_time", endIso)
    .gt("end_time", startIso)
    .limit(1);

  if (error) {
    if (error.message.includes("maintenance_windows")) return true;
    throw new Error(error.message);
  }
  return data.length === 0;
}

function formatBookingDatabaseError(message: string) {
  if (message.includes("bookings_check") || message.includes("violates check constraint")) {
    return "预约失败：数据库仍保留旧的时间约束。请在 Supabase SQL Editor 重新执行最新版 supabase/schema.sql，或删除 bookings 表中限制跨天的 check 约束。";
  }
  if (message.includes("bookings_no_confirmed_overlap")) {
    return "预约失败：该设备在所选时间段已有预约，请选择其他时间。";
  }
  return "预约失败：" + message;
}

function formatUpdateBookingDatabaseError(message: string) {
  if (message.includes("bookings_check") || message.includes("violates check constraint")) {
    return "修改失败：数据库仍保留旧的时间约束。请在 Supabase SQL Editor 重新执行最新版 supabase/schema.sql，或删除 bookings 表中限制跨天的 check 约束。";
  }
  if (message.includes("bookings_no_confirmed_overlap")) {
    return "修改失败：该设备在所选时间段已有预约，请选择其他时间。";
  }
  return "修改失败：" + message;
}

export async function createBookingAction(formData: FormData) {
  const { user, profile } = await requireAuthenticatedProfile();

  const parsed = bookingSchema.safeParse({
    equipmentId: formData.get("equipmentId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    purpose: formData.get("purpose"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const time = validateBookingTime(parsed.data);
  if (!time.ok) return { error: time.message };

  const supabase = await createClient();
  const { data: equipment, error: equipmentError } = await supabase
    .from("equipment")
    .select("status,is_bookable,requires_certification,max_booking_minutes")
    .eq("id", parsed.data.equipmentId)
    .single();
  if (equipmentError) return { error: equipmentError.message };
  if (equipment.status !== "normal" || !equipment.is_bookable) {
    return { error: "该设备当前不可预约" };
  }
  if (!(await canProfileBookEquipment(profile, equipment.requires_certification, parsed.data.equipmentId))) {
    return { error: "该设备需要管理员单独授权后才能预约" };
  }

  const startIso = time.start.toISOString();
  const endIso = time.end.toISOString();
  const minutes = (time.end.getTime() - time.start.getTime()) / 60000;
  if (equipment.max_booking_minutes && minutes > equipment.max_booking_minutes) {
    return { error: `单次预约不能超过 ${equipment.max_booking_minutes} 分钟` };
  }

  const noConflict = await ensureNoConflict(parsed.data.equipmentId, startIso, endIso);
  if (!noConflict) return { error: "该时间段已被预约，请选择其他时间" };
  const noMaintenance = await ensureNoMaintenanceWindow(parsed.data.equipmentId, startIso, endIso);
  if (!noMaintenance) return { error: "该时间段为设备维护时间，不能预约" };
  const sourceSummary = String(formData.get("sourceSummary") || "").trim();
  const purpose = sourceSummary
    ? `${parsed.data.purpose.trim()}\n${sourceSummary}`
    : parsed.data.purpose.trim();
  const shouldMergeAdjacent = formData.get("mergeAdjacent") === "1";

  if (shouldMergeAdjacent) {
    const { data: adjacentBookings, error: adjacentError } = await supabase
      .from("bookings")
      .select("id,start_time,end_time,purpose")
      .eq("equipment_id", parsed.data.equipmentId)
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .or(`end_time.eq.${startIso},start_time.eq.${endIso}`);
    if (adjacentError) return { error: "读取相邻预约失败：" + adjacentError.message };

    if (adjacentBookings && adjacentBookings.length > 0) {
      const mergedStart = new Date(
        Math.min(time.start.getTime(), ...adjacentBookings.map((booking) => new Date(booking.start_time).getTime())),
      );
      const mergedEnd = new Date(
        Math.max(time.end.getTime(), ...adjacentBookings.map((booking) => new Date(booking.end_time).getTime())),
      );
      const adjacentIds = adjacentBookings.map((booking) => booking.id);
      const noMergedConflict = await ensureNoConflict(
        parsed.data.equipmentId,
        mergedStart.toISOString(),
        mergedEnd.toISOString(),
        adjacentIds,
      );
      if (!noMergedConflict) return { error: "合并后的时间段已有其他预约，不能合并" };
      const noMergedMaintenance = await ensureNoMaintenanceWindow(
        parsed.data.equipmentId,
        mergedStart.toISOString(),
        mergedEnd.toISOString(),
      );
      if (!noMergedMaintenance) return { error: "合并后的时间段包含维护窗口，不能合并" };

      const primary = adjacentBookings[0];
      const extraIds = adjacentIds.filter((id) => id !== primary.id);
      if (extraIds.length > 0) {
        const { error: cancelExtraError } = await supabase
          .from("bookings")
          .update({
            status: "cancelled",
            cancel_reason: `已合并到预约 ${primary.id}`,
            cancelled_by: user.id,
            cancelled_at: new Date().toISOString(),
          })
          .in("id", extraIds);
        if (cancelExtraError) return { error: "合并预约失败：" + cancelExtraError.message };
      }

      const mergedPurpose = primary.purpose.includes(purpose) ? primary.purpose : `${primary.purpose}\n${purpose}`;
      const { error: mergeError } = await supabase
        .from("bookings")
        .update({
          start_time: mergedStart.toISOString(),
          end_time: mergedEnd.toISOString(),
          purpose: mergedPurpose,
        })
        .eq("id", primary.id);
      if (mergeError) return { error: "合并预约失败：" + mergeError.message };
      revalidatePath("/");
      redirect("/bookings");
    }
  }

  const { error } = await supabase.from("bookings").insert({
    equipment_id: parsed.data.equipmentId,
    user_id: user.id,
    start_time: startIso,
    end_time: endIso,
    purpose,
  });

  if (error) return { error: formatBookingDatabaseError(error.message) };
  revalidatePath("/");
  redirect("/bookings");
}

export async function updateBookingAction(formData: FormData) {
  const { user, profile } = await requireAuthenticatedProfile();
  const bookingId = String(formData.get("bookingId"));
  const parsed = bookingSchema.safeParse({
    equipmentId: formData.get("equipmentId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    purpose: formData.get("purpose"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const time = validateBookingTime(parsed.data);
  if (!time.ok) return { error: time.message };

  const supabase = await createClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("user_id,status,start_time")
    .eq("id", bookingId)
    .single();
  if (bookingError) return { error: bookingError.message };
  if (booking.status !== "confirmed") return { error: "只能修改已确认预约" };
  if (new Date(booking.start_time) < new Date()) return { error: "不能修改已开始或过去的预约" };
  if (profile.role !== "admin" && booking.user_id !== user.id) return { error: "无权修改该预约" };

  const { data: equipment, error: equipmentError } = await supabase
    .from("equipment")
    .select("status,is_bookable,requires_certification")
    .eq("id", parsed.data.equipmentId)
    .single();
  if (equipmentError) return { error: equipmentError.message };
  if (equipment.status !== "normal" || !equipment.is_bookable) {
    return { error: "该设备当前不可预约" };
  }
  if (!(await canProfileBookEquipment(profile, equipment.requires_certification, parsed.data.equipmentId))) {
    return { error: "该设备需要管理员单独授权后才能预约" };
  }

  const startIso = time.start.toISOString();
  const endIso = time.end.toISOString();
  const noConflict = await ensureNoConflict(parsed.data.equipmentId, startIso, endIso, bookingId);
  if (!noConflict) return { error: "该时间段已被预约，请选择其他时间" };
  const noMaintenance = await ensureNoMaintenanceWindow(parsed.data.equipmentId, startIso, endIso);
  if (!noMaintenance) return { error: "该时间段为设备维护时间，不能预约" };
  const sourceSummary = String(formData.get("sourceSummary") || "").trim();
  const purpose = sourceSummary
    ? `${parsed.data.purpose.trim()}\n${sourceSummary}`
    : parsed.data.purpose.trim();

  const { error } = await supabase
    .from("bookings")
    .update({
      start_time: startIso,
      end_time: endIso,
      purpose,
    })
    .eq("id", bookingId);
  if (error) return { error: formatUpdateBookingDatabaseError(error.message) };
  revalidatePath("/bookings");
  redirect("/bookings");
}

export async function cancelBookingAction(formData: FormData) {
  const { user, profile } = await requireAuthenticatedProfile();
  const bookingId = String(formData.get("bookingId"));
  const reason = String(formData.get("reason") || "");

  const supabase = await createClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("user_id,status,start_time")
    .eq("id", bookingId)
    .single();
  if (bookingError) return { error: bookingError.message };
  if (booking.status !== "confirmed") return { error: "该预约已经取消" };
  if (new Date(booking.start_time) < new Date()) return { error: "不能取消已开始或过去的预约" };
  if (profile.role !== "admin" && booking.user_id !== user.id) return { error: "无权取消该预约" };

  const { error } = await supabase
    .from("bookings")
    .update({
      status: profile.role === "admin" ? "admin_cancelled" : "cancelled",
      cancel_reason: reason || null,
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  if (error) return { error: "取消失败：" + error.message };
  revalidatePath("/bookings");
  revalidatePath("/admin/bookings");
  return { ok: true };
}

export async function markBookingUsedAction(formData: FormData) {
  const { user, profile } = await requireAuthenticatedProfile();
  const bookingId = String(formData.get("bookingId") || "");
  const condition = String(formData.get("condition") || "");
  const description = String(formData.get("description") || "").trim();

  if (!["good", "fault"].includes(condition)) return { error: "请选择设备状态" };
  if (condition === "fault" && description.length < 5) {
    return { error: "故障说明至少 5 个字" };
  }

  const supabase = await createClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("user_id,status,start_time,equipment_id")
    .eq("id", bookingId)
    .single();
  if (bookingError) return { error: bookingError.message };
  if (booking.status !== "confirmed") return { error: "只能记录已确认预约的使用情况" };
  if (new Date(booking.start_time) > new Date()) return { error: "预约尚未开始，不能记录使用情况" };
  if (profile.role !== "admin" && booking.user_id !== user.id) return { error: "无权记录该预约" };

  if (condition === "fault") {
    const { error: issueError } = await supabase.from("issue_reports").insert({
      equipment_id: booking.equipment_id,
      user_id: user.id,
      issue_type: "malfunction",
      description,
    });
    if (issueError) return { error: "提交异常失败：" + issueError.message };
  }

  const reason = condition === "good" ? "设备状态良好" : `使用后发现故障：${description}`;
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "used",
      cancel_reason: reason,
    })
    .eq("id", bookingId);
  if (error) return { error: "记录使用情况失败：" + error.message };
  revalidatePath("/bookings");
  revalidatePath("/admin/issues");
  return { ok: true };
}

export async function extendBookingAction(formData: FormData) {
  const { user, profile } = await requireAuthenticatedProfile();
  const bookingId = String(formData.get("bookingId") || "");
  const newEndTime = String(formData.get("newEndTime") || "");
  if (!bookingId || !newEndTime) return { error: "请选择新的结束时间" };

  const supabase = await createClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,user_id,status,start_time,end_time,equipment_id")
    .eq("id", bookingId)
    .single();
  if (bookingError) return { error: bookingError.message };
  if (booking.status !== "confirmed") return { error: "只能延长已确认预约" };
  const now = new Date();
  if (new Date(booking.start_time) > now || new Date(booking.end_time) <= now) {
    return { error: "只能在使用期间延长预约" };
  }
  if (profile.role !== "admin" && booking.user_id !== user.id) return { error: "无权操作该预约" };

  const date = new Date(booking.start_time).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const newEnd = new Date(`${date}T${newEndTime}:00+08:00`);
  if (newEnd <= new Date(booking.end_time)) return { error: "新的结束时间必须晚于当前结束时间" };

  const noConflict = await ensureNoConflict(booking.equipment_id, booking.start_time, newEnd.toISOString(), booking.id);
  if (!noConflict) return { error: "延长时间段已有其他预约，不能延长" };
  const noMaintenance = await ensureNoMaintenanceWindow(booking.equipment_id, booking.start_time, newEnd.toISOString());
  if (!noMaintenance) return { error: "延长时间段包含维护窗口，不能延长" };

  const { error } = await supabase
    .from("bookings")
    .update({ end_time: newEnd.toISOString() })
    .eq("id", bookingId);
  if (error) return { error: "延长预约失败：" + error.message };
  revalidatePath("/bookings");
  revalidatePath("/me");
  return { ok: true };
}

export async function finishBookingEarlyAction(formData: FormData) {
  const { user, profile } = await requireAuthenticatedProfile();
  const bookingId = String(formData.get("bookingId") || "");
  const supabase = await createClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("user_id,status,start_time,end_time")
    .eq("id", bookingId)
    .single();
  if (bookingError) return { error: bookingError.message };
  if (booking.status !== "confirmed") return { error: "只能提前结束已确认预约" };
  const now = new Date();
  if (new Date(booking.start_time) > now || new Date(booking.end_time) <= now) {
    return { error: "只能在使用期间提前结束" };
  }
  if (profile.role !== "admin" && booking.user_id !== user.id) return { error: "无权操作该预约" };

  const { error } = await supabase
    .from("bookings")
    .update({ status: "used", cancel_reason: "已提前结束使用" })
    .eq("id", bookingId);
  if (error) return { error: "提前结束失败：" + error.message };
  revalidatePath("/bookings");
  revalidatePath("/me");
  return { ok: true };
}

async function canProfileBookEquipment(
  profile: Pick<Profile, "id" | "role" | "status">,
  requiresCertification: boolean,
  equipmentId: string,
) {
  if (profile.role === "admin" && profile.status === "active") return true;
  if (!requiresCertification) return true;
  if (profile.status !== "active") return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment_permissions")
    .select("equipment_id")
    .eq("user_id", profile.id)
    .eq("equipment_id", equipmentId)
    .limit(1);
  if (error) {
    if (error.message.includes("equipment_permissions")) return false;
    throw new Error(error.message);
  }
  return data.length > 0;
}
