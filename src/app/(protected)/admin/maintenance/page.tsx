import { AdminNav } from "@/components/admin/admin-nav";
import {
  CompleteMaintenanceForm,
  CompleteMaintenanceWindowForm,
  MaintenanceTaskForm,
  MaintenanceWindowForm,
} from "@/components/admin/maintenance-forms";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/data/auth";
import { listEquipment, listMaintenanceTasks, listMaintenanceWindows } from "@/lib/data/equipment";
import { formatLocalDateTime } from "@/lib/utils/time";

function daysUntil(value: string) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
}

export default async function AdminMaintenancePage() {
  await requireAdmin();
  const [equipment, tasks, windows] = await Promise.all([
    listEquipment({ includeRetired: true }),
    listMaintenanceTasks(),
    listMaintenanceWindows(),
  ]);

  return (
    <main className="safe-page space-y-5">
      <AdminNav />
      <section>
        <h1 className="text-2xl font-semibold">设备维护提醒</h1>
        <p className="mt-1 text-sm text-slate-600">
          管理员可添加晶振检查、蒸镀机清理等周期提醒，完成维护后手动重置计时。
        </p>
        {tasks.length === 0 ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            如果这是第一次打开维护页面，请先在 Supabase SQL Editor 重新执行新版 supabase/schema.sql，创建 maintenance_tasks 表。
          </p>
        ) : null}
      </section>

      <Card>
        <CardHeader><h2 className="font-semibold">新增维护提醒</h2></CardHeader>
        <CardContent><MaintenanceTaskForm equipment={equipment} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">单独维护窗口</h2>
          <p className="mt-1 text-sm text-slate-600">
            创建后该时间段禁止新预约，重叠的已确认预约会被管理员取消。提前完成维护时，仍能完成的被取消预约会自动尝试恢复。
          </p>
        </CardHeader>
        <CardContent><MaintenanceWindowForm equipment={equipment} /></CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">维护窗口记录</h2>
        {windows.map((window) => (
          <Card key={window.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{window.equipment.name}</h3>
                  <p className="text-sm text-slate-600">
                    {window.equipment.code} · {formatLocalDateTime(window.start_time)} - {formatLocalDateTime(window.end_time)}
                  </p>
                </div>
                <StatusBadge value={window.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">原因：{window.reason}</p>
              {window.completed_at ? (
                <p className="text-sm text-slate-600">完成时间：{formatLocalDateTime(window.completed_at)}</p>
              ) : null}
              {window.status === "active" ? <CompleteMaintenanceWindowForm window={window} /> : null}
            </CardContent>
          </Card>
        ))}
        {windows.length === 0 ? <p className="text-slate-600">暂无维护窗口。</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">周期提醒</h2>
        {tasks.map((task) => {
          const remaining = daysUntil(task.next_due_at);
          const status = !task.is_active ? "closed" : remaining <= 0 ? "open" : remaining <= 3 ? "in_progress" : "resolved";
          return (
            <Card key={task.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{task.name}</h2>
                    <p className="text-sm text-slate-600">
                      {task.equipment.name}（{task.equipment.code}）· {task.task_type === "consumable" ? "耗材提醒" : "定期维护提醒"} · 每 {task.interval_days} 天
                    </p>
                  </div>
                  <StatusBadge value={status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                  <p>上次完成：{formatLocalDateTime(task.last_completed_at)}</p>
                  <p>下次提醒：{formatLocalDateTime(task.next_due_at)}</p>
                  <p className={remaining <= 0 ? "font-medium text-red-700" : "text-slate-700"}>
                    {remaining <= 0 ? `已逾期 ${Math.abs(remaining)} 天` : `剩余 ${remaining} 天`}
                  </p>
                </div>
                {task.description ? <p className="text-sm text-slate-600">{task.description}</p> : null}
                <CompleteMaintenanceForm taskId={task.id} />
                <details className="rounded-md border border-slate-200 p-3">
                  <summary className="cursor-pointer text-sm font-medium">编辑维护项</summary>
                  <div className="mt-3">
                    <MaintenanceTaskForm equipment={equipment} task={task} />
                  </div>
                </details>
              </CardContent>
            </Card>
          );
        })}
        {tasks.length === 0 ? <p className="text-slate-600">暂无维护提醒。</p> : null}
      </section>
    </main>
  );
}
