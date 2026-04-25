import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExternalLink, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductDescriptionEditor } from "@/components/dashboard/product-description-editor";
import {
  deletePolicyPage,
  fetchPolicyPageById,
  insertPolicyPage,
  updatePolicyPage,
} from "@/lib/supabase/policy-pages-admin";
import { supabase } from "@/lib/supabase/client";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { AdminStandardDialogContent } from "@/components/ui/admin-standard-dialog";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function storefrontOrigin(): string {
  const raw = import.meta.env.VITE_STOREFRONT_ORIGIN?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function PolicyEditPage() {
  const { policyId } = useParams<{ policyId: string }>();
  const navigate = useNavigate();
  const isNew = policyId === "new" || !policyId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [html, setHtml] = useState("<p></p>");

  const origin = storefrontOrigin();
  const previewUrl =
    slug.trim() && SLUG_RE.test(slug.trim())
      ? `${origin}/${encodeURIComponent(slug.trim().toLowerCase())}`
      : null;

  useEffect(() => {
    if (isNew || !policyId || !supabase) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const row = await fetchPolicyPageById(policyId);
      if (cancelled) return;
      if (!row) {
        toast.error("Footer item not found.");
        setLoading(false);
        navigate("/dashboard/policies", { replace: true });
        return;
      }
      setSlug(row.slug);
      setTitle(row.title);
      setSortOrder(String(row.sort_order));
      setHtml(row.content_html?.trim() ? row.content_html : "<p></p>");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, policyId, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      toast.error("Database connection is not configured.");
      return;
    }

    const slugNorm = slug.trim().toLowerCase();
    const titleTrim = title.trim();
    if (!titleTrim) {
      toast.error("Title is required.");
      return;
    }
    if (!slugNorm || !SLUG_RE.test(slugNorm)) {
      toast.error("Use a URL slug with lowercase letters, numbers, and hyphens only (e.g. privacy-policy).");
      return;
    }

    const sort = Number.parseInt(sortOrder, 10);
    if (Number.isNaN(sort)) {
      toast.error("Sort order must be a whole number.");
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const res = await insertPolicyPage({
          slug: slugNorm,
          title: titleTrim,
          content_html: html.trim() || "<p></p>",
          sort_order: sort,
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Footer item created.");
        navigate(`/dashboard/policies/${res.id}`, { replace: true });
        return;
      }
      if (!policyId) return;
      const res = await updatePolicyPage(policyId, {
        slug: slugNorm,
        title: titleTrim,
        content_html: html.trim() || "<p></p>",
        sort_order: sort,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Save failed.");
        return;
      }
      toast.success("Footer item saved.");
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDelete() {
    if (!policyId || isNew || !supabase) return;
    setDeleting(true);
    try {
      const res = await deletePolicyPage(policyId);
      if (!res.ok) {
        toast.error(res.error ?? "Delete failed.");
        return;
      }
      toast.success("Footer item deleted.");
      navigate("/dashboard/policies", { replace: true });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
      <PageHeader
        title={isNew ? "New footer item" : "Edit footer item"}
        description="This page content opens on the storefront when customers click the footer item. Slug becomes /your-slug."
        actions={
          previewUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View on storefront
              </a>
            </Button>
          ) : null
        }
      />

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Footer item details</CardTitle>
            <CardDescription>Title and slug define the footer link and page URL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="policy-title">Footer item title</Label>
              <Input
                id="policy-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Shipping Policy"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-slug">Footer item slug</Label>
              <Input
                id="policy-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="e.g. privacy"
                required
                className="font-mono text-sm"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Live URL:{" "}
                <code className="rounded bg-muted px-1">
                  /{slug.trim() || "…"}
                </code>
                {previewUrl ? (
                  <>
                    {" "}
                    — full:{" "}
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      open
                    </a>
                  </>
                ) : null}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-sort">Sort order</Label>
              <Input
                id="policy-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="max-w-[120px]"
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first in the footer item list.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Footer page content</CardTitle>
            <CardDescription>
              Use headings and lists for a professional footer content page. Content is sanitized on the
              storefront.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label className="mb-2 block text-sm font-medium">Body</Label>
            <ProductDescriptionEditor
              id="policy-body"
              value={html}
              onChange={setHtml}
              placeholder="Write your policy here. Use headings (H2, H3) for sections, lists for bullet points, and links where needed."
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving}>
                        {saving ? "Saving…" : isNew ? "Create item" : "Save changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard/policies")}>
            Back to list
          </Button>
          {!isNew && policyId ? (
            <>
              <Button
                type="button"
                variant="destructive"
                className="ml-auto"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AdminStandardDialogContent
                  title="Delete this footer item?"
                  subtitle="The live URL will return 404 and this item will be removed from the storefront footer."
                  footer={
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={deleting}
                        onClick={() => void onConfirmDelete()}
                      >
                        {deleting ? "Deleting…" : "Delete"}
                      </Button>
                    </DialogFooter>
                  }
                />
              </Dialog>
            </>
          ) : null}
        </div>
      </form>
    </div>
  );
}
