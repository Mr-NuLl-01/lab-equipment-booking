import { AdminNav } from "@/components/admin/admin-nav";
import { IssueAdminForm } from "@/components/admin/issue-admin-form";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/data/auth";
import { listEquipment, listIssueReports } from "@/lib/data/equipment";

export default async function AdminIssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ equipmentId?: string; status?: string; issueType?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [issues, equipment] = await Promise.all([
    listIssueReports(params),
    listEquipment({ includeRetired: true }),
  ]);

  return (
    <main className="safe-page space-y-5">
      <AdminNav />
      <h1 className="text-2xl font-semibold">异常反馈</h1>
      <form className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
        <select className="min-h-11 rounded-md border border-slate-300 px-3" name="equipmentId" defaultValue={params.equipmentId || ""}>
          <option value="">全部设备</option>
          {equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="min-h-11 rounded-md border border-slate-300 px-3" name="status" defaultValue={params.status || ""}>
          <option value="">全部状态</option>
          <option value="open">open</option>
          <option value="in_progress">in_progress</option>
          <option value="resolved">resolved</option>
          <option value="closed">closed</option>
        </select>
        <select className="min-h-11 rounded-md border border-slate-300 px-3" name="issueType" defaultValue={params.issueType || ""}>
          <option value="">全部类型</option>
          <option value="malfunction">malfunction</option>
          <option value="consumable">consumable</option>
          <option value="abnormal_use">abnormal_use</option>
          <option value="other">other</option>
        </select>
        <button className="min-h-11 rounded-md bg-teal-700 px-4 text-white">筛选</button>
      </form>
      <section className="space-y-3">
        {issues.map((issue) => (
          <Card key={issue.id}>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{issue.equipment.name}</h2>
                  <p className="text-sm text-slate-600">{issue.profile.full_name} · {issue.issue_type}</p>
                </div>
                <StatusBadge value={issue.status} />
              </div>
              <p className="text-sm text-slate-700">{issue.description}</p>
              {issue.admin_note ? <p className="text-sm text-slate-500">备注：{issue.admin_note}</p> : null}
              <IssueAdminForm issueId={issue.id} equipmentId={issue.equipment_id} />
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
