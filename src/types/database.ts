export type UserRole = "student" | "admin";
export type ProfileStatus = "pending" | "active" | "disabled";
export type EquipmentStatus = "normal" | "paused" | "maintenance" | "retired";
export type BookingStatus = "confirmed" | "cancelled" | "admin_cancelled" | "used";
export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";
export type IssueType = "malfunction" | "consumable" | "abnormal_use" | "other";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
};

export type Equipment = {
  id: string;
  name: string;
  code: string;
  location: string;
  category: string;
  description: string | null;
  usage_notes: string | null;
  status: EquipmentStatus;
  requires_certification: boolean;
  min_booking_minutes: number;
  max_booking_minutes: number | null;
  is_bookable: boolean;
  is_pinned: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  equipment_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: BookingStatus;
  cancel_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IssueReport = {
  id: string;
  equipment_id: string;
  user_id: string;
  issue_type: IssueType;
  description: string;
  status: IssueStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type MaintenanceTask = {
  id: string;
  equipment_id: string;
  task_type: "consumable" | "maintenance";
  name: string;
  description: string | null;
  interval_days: number;
  last_completed_at: string;
  next_due_at: string;
  assigned_role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MaintenanceWindow = {
  id: string;
  equipment_id: string;
  reason: string;
  start_time: string;
  end_time: string;
  status: "active" | "completed" | "cancelled";
  previous_equipment_status: EquipmentStatus | null;
  previous_is_bookable: boolean | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EquipmentPermission = {
  user_id: string;
  equipment_id: string;
  granted_by: string | null;
  granted_at: string;
};
