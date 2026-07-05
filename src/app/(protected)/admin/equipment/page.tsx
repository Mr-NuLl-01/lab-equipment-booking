import { AdminNav } from "@/components/admin/admin-nav";
import { EquipmentForm, RemoveEquipmentForm } from "@/components/admin/equipment-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/data/auth";
import { listEquipment } from "@/lib/data/equipment";

export default async function AdminEquipmentPage() {
  await requireAdmin();
  const equipment = await listEquipment();

  return (
    <main className="safe-page space-y-5">
      <AdminNav />
      <Card>
        <CardHeader><h1 className="text-xl font-semibold">新增设备</h1></CardHeader>
        <CardContent><EquipmentForm /></CardContent>
      </Card>
      <section className="space-y-3">
        {equipment.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{item.name}</h2>
                  <p className="text-sm text-slate-600">{item.code} · {item.location}</p>
                </div>
                <StatusBadge value={item.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <EquipmentForm equipment={item} />
              {item.status !== "retired" ? <RemoveEquipmentForm equipment={item} /> : null}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
