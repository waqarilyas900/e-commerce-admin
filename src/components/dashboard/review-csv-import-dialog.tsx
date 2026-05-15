import { useCallback, useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { AdminStandardDialogContent } from "@/components/ui/admin-standard-dialog";
import { Label } from "@/components/ui/label";
import {
  parseCsvRows,
  parseReviewCsvDataRows,
  REVIEWS_CSV_MAX_ROWS,
  REVIEWS_CSV_TEMPLATE,
  type CsvRowParseResult,
  type ParsedCsvReviewRow,
} from "@/lib/reviews-csv-import";
import { supabase } from "@/lib/supabase/client";
import {
  createReviewAsAdmin,
  fetchProductSlugIdMapAdmin,
} from "@/lib/supabase/reviews-admin";
import { revalidateStorefrontAfterReviewsChange } from "@/lib/revalidate-after-reviews";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
};

function downloadTemplate() {
  const blob = new Blob([REVIEWS_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reviews-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ReviewCsvImportDialog({ open, onOpenChange, onImported }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResults, setParseResults] = useState<CsvRowParseResult[] | null>(null);
  const [importing, setImporting] = useState(false);

  const reset = useCallback(() => {
    setFileName(null);
    setParseResults(null);
    setImporting(false);
  }, []);

  useEffect(() => {
    if (!open) queueMicrotask(reset);
  }, [open, reset]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }
    setFileName(file.name);
    setParseResults(null);
    try {
      const text = await file.text();
      const grid = parseCsvRows(text);
      if (grid.length < 2) {
        toast.error("CSV needs a header row and at least one data row.");
        return;
      }
      const [header, ...dataRows] = grid;
      const slugMap = await fetchProductSlugIdMapAdmin(5000);
      const results = parseReviewCsvDataRows(header, dataRows, slugMap);
      setParseResults(results);
      const ok = results.filter((r) => r.ok).length;
      const bad = results.filter((r) => !r.ok).length;
      if (ok === 0 && bad > 0) {
        toast.error("No valid rows. Fix errors and try again.");
      } else {
        toast.message(`Parsed ${String(ok)} valid row(s), ${String(bad)} error(s).`);
      }
    } catch {
      toast.error("Could not read that file.");
      setFileName(null);
    }
  }

  async function runImport() {
    if (!parseResults || !supabase) return;
    const rows = parseResults.filter((r): r is { ok: true; row: ParsedCsvReviewRow } => r.ok);
    if (rows.length === 0) {
      toast.error("Nothing to import.");
      return;
    }
    setImporting(true);
    let created = 0;
    let failed = 0;
    for (const { row } of rows) {
      const res =
        row.user_id != null
          ? await createReviewAsAdmin({
              product_id: row.product_id,
              user_id: row.user_id,
              rating: row.rating,
              title: row.title,
              body: row.body,
              status: row.status,
              media: row.media.length > 0 ? row.media : null,
            })
          : await createReviewAsAdmin({
              product_id: row.product_id,
              attributed_display_name: row.attributed_display_name ?? "",
              attributed_display_email: row.attributed_display_email,
              rating: row.rating,
              title: row.title,
              body: row.body,
              status: row.status,
              media: row.media.length > 0 ? row.media : null,
            });
      if (res.ok) created++;
      else failed++;
    }
    setImporting(false);
    if (created > 0) {
      revalidateStorefrontAfterReviewsChange();
    }
    if (failed > 0) {
      toast.warning(`Imported ${String(created)} review(s). ${String(failed)} failed (e.g. duplicate product per user).`, {
        description: "Check the reviews list and CSV for duplicates.",
      });
    } else {
      toast.success(`Imported ${String(created)} review(s).`);
    }
    reset();
    onOpenChange(false);
    onImported();
  }

  const okCount = parseResults?.filter((r) => r.ok).length ?? 0;
  const errors = parseResults?.filter((r) => !r.ok) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <AdminStandardDialogContent
        title="Import reviews from CSV"
        subtitle={`Up to ${String(REVIEWS_CSV_MAX_ROWS)} rows per file. Use product_slug or product_id; registered rows need user_id; otherwise use reviewer_name (or name) for display-only reviews.`}
        footer={
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
            <Button type="button" variant="secondary" onClick={() => downloadTemplate()}>
              Download template
            </Button>
            <Button type="button" disabled={importing || okCount === 0} onClick={() => void runImport()}>
              {importing ? "Importing…" : `Import ${String(okCount)} review(s)`}
            </Button>
          </DialogFooter>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reviews-csv-file">CSV file</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" asChild>
                <label htmlFor="reviews-csv-file" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Choose file
                </label>
              </Button>
              <input
                id="reviews-csv-file"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => void onPickFile(e)}
              />
              {fileName ? <span className="text-sm text-muted-foreground">{fileName}</span> : null}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Columns (header names, case-insensitive)</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                <strong>product_slug</strong> or <strong>product_id</strong> (one required)
              </li>
              <li>
                <strong>user_id</strong> — if set, review is for that customer (must not duplicate product per user)
              </li>
              <li>
                If <strong>user_id</strong> is empty: <strong>reviewer_name</strong>, <strong>name</strong>, or{" "}
                <strong>display_name</strong> (display-only review)
              </li>
              <li>Optional: reviewer_email / email</li>
              <li>
                <strong>rating</strong> (1–5), <strong>title</strong>, <strong>review</strong> or <strong>body</strong>
              </li>
              <li>
                Optional: <strong>status</strong> (pending | approved | rejected; default approved)
              </li>
              <li>
                Optional: <strong>media_urls</strong> — public https URLs, separated by | or ;
              </li>
            </ul>
          </div>

          {parseResults && parseResults.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {okCount} ready to import
                {errors.length > 0 ? ` · ${String(errors.length)} issue(s)` : ""}
              </p>
              {errors.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
                  {errors.map((e, i) => (
                    <p key={i} className="py-0.5">
                      Line {e.lineNumber}: {"error" in e ? e.error : ""}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </AdminStandardDialogContent>
    </Dialog>
  );
}
