import { AdminNav } from "@/components/admin/admin-nav";
import { MemberForm } from "@/components/admin/member-form";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/data/auth";
import { listAdminMembers, listEquipment, listEquipmentPermissions } from "@/lib/data/equipment";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [allMembers, equipment, permissions] = await Promise.all([
    listAdminMembers(),
    listEquipment({ includeRetired: true }),
    listEquipmentPermissions(),
  ]);
  const permissionsByUser = new Map<string, string[]>();
  for (const permission of permissions) {
    const current = permissionsByUser.get(permission.user_id) || [];
    current.push(permission.equipment_id);
    permissionsByUser.set(permission.user_id, current);
  }
  const members = allMembers.filter((member) => {
    const q = params.q?.trim().toLowerCase();
    const statusOk = !params.status || member.status === params.status;
    const qOk =
      !q ||
      member.full_name.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q);
    return statusOk && qOk;
  });

  return (
    <main className="safe-page space-y-5">
      <AdminNav />
      <h1 className="text-2xl font-semibold">成员管理</h1>
      <form className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px_auto]">
        <input className="min-h-11 rounded-md border border-slate-300 px-3" name="q" placeholder="搜索姓名或邮箱" defaultValue={params.q || ""} />
        <select className="min-h-11 rounded-md border border-slate-300 px-3" name="status" defaultValue={params.status || ""}>
          <option value="">全部状态</option>
          <option value="pending">pending</option>
          <option value="active">active</option>
          <option value="disabled">disabled</option>
        </select>
        <button className="min-h-11 rounded-md bg-teal-700 px-4 text-white">筛选</button>
      </form>
      <section className="space-y-3">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{member.full_name}</h2>
                  <p className="break-all text-sm text-slate-600">{member.email}</p>
                  <p className="text-xs text-slate-500">注册时间：{new Date(member.created_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</p>
                </div>
                <div className="flex gap-2"><StatusBadge value={member.role} /><StatusBadge value={member.status} /></div>
              </div>
              <MemberForm
                member={member}
                equipment={equipment}
                permissionEquipmentIds={permissionsByUser.get(member.id) || []}
              />
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
