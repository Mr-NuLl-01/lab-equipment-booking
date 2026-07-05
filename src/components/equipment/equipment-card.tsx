import Link from "next/link";
import { MapPin, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils/cn";
import type { Equipment } from "@/types/database";

export function EquipmentCard({ equipment, hasOpenIssue = false }: { equipment: Equipment; hasOpenIssue?: boolean }) {
  const canBook = equipment.status === "normal" && equipment.is_bookable;
  const isAlert = equipment.status === "maintenance" || hasOpenIssue;

  return (
    <Link href={`/equipment/${equipment.id}`}>
      <Card className={cn("h-full transition hover:border-teal-300 hover:shadow-md", isAlert ? "border-red-300 bg-red-50" : "")}>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", isAlert ? "text-red-700" : "text-slate-950")}>{equipment.name}</h2>
              <p className="text-sm text-slate-500">{equipment.code}</p>
            </div>
            <StatusBadge value={equipment.status} />
          </div>
          {isAlert ? (
            <p className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700">
              设备异常或维护中，禁止使用
            </p>
          ) : null}
          <p className="flex items-center gap-2 text-sm text-slate-700">
            <MapPin className="size-4" />
            {equipment.location}
          </p>
          <p className="flex items-center gap-2 text-sm text-slate-700">
            <Wrench className="size-4" />
            {canBook ? "可预约" : "当前不可预约"}
          </p>
          <p className="text-sm text-slate-600">
            {equipment.requires_certification ? "需要管理员单独授权后预约" : "注册后即可预约"}
          </p>
          {equipment.description ? (
            <p className="line-clamp-2 text-sm text-slate-600">{equipment.description}</p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
