"use client";

import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LEAD_COLUMNS,
  type LeadColumnId,
  saveVisibleColumns,
} from "@/lib/leads/columns";

type Props = {
  visible: LeadColumnId[];
  onChange: (cols: LeadColumnId[]) => void;
};

export function ColumnPicker({ visible, onChange }: Props) {
  function toggle(id: LeadColumnId, checked: boolean) {
    const next = checked
      ? [...visible, id]
      : visible.filter((c) => c !== id);
    if (next.length === 0) return;
    onChange(next);
    saveVisibleColumns(next);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="size-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Visible columns</p>
        {LEAD_COLUMNS.map((col) => (
          <label key={col.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={visible.includes(col.id)}
              onCheckedChange={(v) => toggle(col.id, !!v)}
            />
            {col.label}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}
