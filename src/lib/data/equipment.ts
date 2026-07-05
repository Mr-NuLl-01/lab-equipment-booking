import { createClient } from "@/lib/supabase/server";
import type {
  Booking,
  Equipment,
  EquipmentPermission,
  IssueReport,
  MaintenanceTask,
  MaintenanceWindow,
  Profile,
} from "@/types/database";

export async function listEquipment(options?: { includeRetired?: boolean }) {
  const supabase = await createClient();
  let query = supabase
    .from("equipment")
    .select("*")
    .order("name");

  if (!options?.includeRetired) query = query.neq("status", "retired");
  const { data, error } = await query.returns<Equipment[]>();
  if (error) throw new Error(error.message);
  return data.sort((a, b) => {
    const aPinned = a.is_pinned ?? false;
    const bPinned = b.is_pinned ?? false;
    const aOrder = a.sort_order ?? 1000;
    const bOrder = b.sort_order ?? 1000;
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name, "zh-CN");
  });
}

export async function listAlertEquipmentIds() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issue_reports")
    .select("equipment_id")
    .in("status", ["open", "in_progress"]);

  if (error) throw new Error(error.message);
  return new Set((data || []).map((item) => item.equipment_id as string));
}

export async function getEquipment(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("id", id)
    .single<Equipment>();

  if (error) throw new Error(error.message);
  return data;
}

export async function listUpcomingBookings(equipmentId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("*, equipment:equipment_id(name, code), profile:user_id(full_name, email)")
    .eq("status", "confirmed")
    .gte("end_time", new Date().toISOString())
    .order("start_time");

  if (equipmentId) query = query.eq("equipment_id", equipmentId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function listAdminBookings(filters?: {
  equipmentId?: string;
  status?: string;
  member?: string;
  date?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("*, equipment:equipment_id(name, code), profile:user_id(full_name, email)")
    .order("start_time", { ascending: false });

  if (filters?.equipmentId) query = query.eq("equipment_id", filters.equipmentId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.date) {
    const start = new Date(`${filters.date}T00:00:00+08:00`);
    const end = new Date(`${filters.date}T23:59:59+08:00`);
    query = query.gte("start_time", start.toISOString()).lte("start_time", end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const member = filters?.member?.trim().toLowerCase();
  if (!member) return data;
  return data.filter((booking) => {
    const profile = booking.profile as { full_name?: string; email?: string } | null;
    return (
      profile?.full_name?.toLowerCase().includes(member) ||
      profile?.email?.toLowerCase().includes(member)
    );
  });
}

export async function listMyBookings(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, equipment:equipment_id(name, code, location)")
    .eq("user_id", userId)
    .order("start_time", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getBooking(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, equipment:equipment_id(name, code, location)")
    .eq("id", id)
    .single<Booking & { equipment: Pick<Equipment, "name" | "code" | "location"> }>();

  if (error) throw new Error(error.message);
  return data;
}

export async function listAdminMembers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Profile[]>();

  if (error) throw new Error(error.message);
  return data;
}

export async function listEquipmentPermissions(userId?: string) {
  const supabase = await createClient();
  let query = supabase.from("equipment_permissions").select("*");
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.returns<EquipmentPermission[]>();
  if (error) {
    if (error.message.includes("equipment_permissions")) return [];
    throw new Error(error.message);
  }
  return data;
}

export async function listIssueReports(filters?: {
  equipmentId?: string;
  status?: string;
  issueType?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("issue_reports")
    .select("*, equipment:equipment_id(name, code), profile:user_id(full_name, email)")
    .order("created_at", { ascending: false });

  if (filters?.equipmentId) query = query.eq("equipment_id", filters.equipmentId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.issueType) query = query.eq("issue_type", filters.issueType);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function listMyIssueReports(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issue_reports")
    .select("*, equipment:equipment_id(name, code)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<(IssueReport & { equipment: Pick<Equipment, "name" | "code"> })[]>();

  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminOverview() {
  const supabase = await createClient();
  const today = new Date();
  const date = today.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const start = new Date(`${date}T00:00:00+08:00`);
  const end = new Date(`${date}T23:59:59+08:00`);

  const [equipment, pendingMembers, todayBookings, openIssues, dueMaintenance] = await Promise.all([
    supabase.from("equipment").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .gte("start_time", start.toISOString())
      .lte("start_time", end.toISOString()),
    supabase
      .from("issue_reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    supabase
      .from("maintenance_tasks")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .lte("next_due_at", new Date().toISOString()),
  ]);

  return {
    equipmentCount: equipment.count || 0,
    pendingMemberCount: pendingMembers.count || 0,
    todayBookingCount: todayBookings.count || 0,
    openIssueCount: openIssues.count || 0,
    dueMaintenanceCount: dueMaintenance.count || 0,
  };
}

export async function listMaintenanceTasks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_tasks")
    .select("*, equipment:equipment_id(name, code, location)")
    .order("next_due_at", { ascending: true })
    .returns<
      (MaintenanceTask & {
        equipment: Pick<Equipment, "name" | "code" | "location">;
      })[]
    >();

  if (error) {
    if (error.message.includes("maintenance_tasks")) {
      return [];
    }
    throw new Error(error.message);
  }
  return data;
}

export async function listMaintenanceWindows() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_windows")
    .select("*, equipment:equipment_id(name, code, location)")
    .order("start_time", { ascending: false })
    .returns<
      (MaintenanceWindow & {
        equipment: Pick<Equipment, "name" | "code" | "location">;
      })[]
    >();

  if (error) {
    if (error.message.includes("maintenance_windows")) return [];
    throw new Error(error.message);
  }
  return data;
}

export async function listActiveMaintenanceWindows(equipmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_windows")
    .select("start_time,end_time,reason")
    .eq("equipment_id", equipmentId)
    .eq("status", "active")
    .gt("end_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  if (error) {
    if (error.message.includes("maintenance_windows")) return [];
    throw new Error(error.message);
  }
  return data;
}
