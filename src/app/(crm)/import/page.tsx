"use client";

import { useState } from "react";
import { IMPORTABLE_FIELDS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Preview = {
  columns: string[];
  preview: {
    new: { rowIndex: number; businessName: string }[];
    updated: { rowIndex: number; businessName: string; matchReason?: string }[];
    invalid: { rowIndex: number }[];
  };
  totalRows: number;
};

function autoMap(columns: string[]) {
  const map: Record<string, string> = {};
  const aliases: Record<string, string[]> = {
    businessName: ["business", "business_name", "company", "name"],
    phone: ["phone", "mobile", "contact_number"],
    email: ["email", "contact_email"],
    city: ["city", "location_city"],
    state: ["state", "region"],
    website: ["website", "url", "domain"],
    leadScore: ["score", "lead_score", "leadscore"],
    industry: ["industry", "category", "sector"],
    detectedProblem: ["problem", "detected_problem", "issue"],
    suggestedService: ["service", "suggested_service"],
  };
  for (const col of columns) {
    const key = col.trim();
    const norm = key.toLowerCase().replace(/\s+/g, "_");
    for (const [field, names] of Object.entries(aliases)) {
      if (names.includes(norm) || norm === field.toLowerCase()) {
        map[key] = field;
        break;
      }
    }
  }
  return map;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"upload" | "map" | "done">("upload");

  async function runPreview() {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("mode", "preview");
    const res = await fetch("/api/leads/import", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Import failed");
      return;
    }
    const map = autoMap(data.columns);
    setColumnMap(map);
    setPreview(data);
    setStep("map");
  }

  async function commitImport() {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("mode", "commit");
    form.append("columnMap", JSON.stringify(columnMap));
    const res = await fetch("/api/leads/import", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Import failed");
      return;
    }
    setPreview(data);
    setStep("done");
    toast.success("Import completed");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Import leads</h1>
        <p className="text-sm text-muted-foreground">
          Upload CSV or XLSX → map columns → preview duplicates → import with intelligent upsert
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>1. Upload file</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button disabled={!file} onClick={runPreview}>Read columns & preview</Button>
        </CardContent>
      </Card>

      {step !== "upload" && preview && (
        <Card>
          <CardHeader><CardTitle>2. Map columns</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {preview.columns.map((col) => (
              <div key={col} className="grid grid-cols-2 items-center gap-2 text-sm">
                <span className="truncate font-medium">{col}</span>
                <Select
                  value={columnMap[col] ?? "_skip"}
                  onValueChange={(v) =>
                    setColumnMap((m) => ({ ...m, [col]: v === "_skip" ? "" : v }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Skip" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_skip">Skip</SelectItem>
                    {IMPORTABLE_FIELDS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button onClick={commitImport}>Validate & import</Button>
          </CardContent>
        </Card>
      )}

      {preview && (
        <Card>
          <CardHeader><CardTitle>Preview summary</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-4">
            <p>New: <strong>{preview.preview.new.length}</strong></p>
            <p>Updates: <strong>{preview.preview.updated.length}</strong></p>
            <p>Invalid: <strong>{preview.preview.invalid.length}</strong></p>
            <p>Total rows: <strong>{preview.totalRows}</strong></p>
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <p className="text-sm text-muted-foreground">
          CRM fields (status, follow-ups, notes) were preserved on matched leads.
        </p>
      )}
    </div>
  );
}
