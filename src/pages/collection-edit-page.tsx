import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlashMessage } from "@/components/dashboard/flash-message";
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
import {
  deleteCollectionRow,
  fetchCollectionById,
  saveCollection,
  type CollectionWritePayload,
} from "@/lib/supabase/catalog";
import { slugFromLabel } from "@/lib/slug";
import { uploadCollectionHeroImage } from "@/lib/supabase/storage";
import { supabase } from "@/lib/supabase/client";

export function CollectionEditPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();
  const isNew = collectionId === "new" || !collectionId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");

  useEffect(() => {
    if (isNew || !collectionId || !supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const row = await fetchCollectionById(collectionId);
      if (cancelled) return;
      if (!row) {
        setError("Collection not found.");
        setLoading(false);
        return;
      }
      setName(row.name);
      setDescription(row.description);
      setHeroImage(row.hero_image);
      setSortOrder(String(row.sort_order));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, collectionId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!supabase) {
      setError("Database connection is not configured.");
      return;
    }

    const sort = Number.parseInt(sortOrder, 10);
    if (Number.isNaN(sort)) {
      setError("Sort order must be a whole number.");
      return;
    }

    const slug = slugFromLabel(name);
    if (!slug) {
      setError(
        "Use a name with letters or numbers so we can build a URL (e.g. “Summer Tees”).",
      );
      return;
    }

    const payload: CollectionWritePayload = {
      slug,
      name: name.trim(),
      description: description.trim(),
      hero_image: heroImage.trim(),
      sort_order: sort,
    };

    setSaving(true);
    const result = await saveCollection(isNew ? null : collectionId ?? null, payload);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage("Saved.");
    if (isNew) {
      navigate(`/dashboard/collections/${result.id}`, { replace: true });
    }
  }

  async function onDelete() {
    if (isNew || !collectionId || !supabase) return;
    if (
      !window.confirm(
        "Delete this collection? Products will not be deleted — they are only unlinked from this collection.",
      )
    ) {
      return;
    }
    const err = await deleteCollectionRow(collectionId);
    if (err) {
      setError(err);
      return;
    }
    navigate("/dashboard/collections");
  }

  async function onHeroFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setMessage(null);
    setUploadingImage(true);
    const res = await uploadCollectionHeroImage(file);
    setUploadingImage(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setHeroImage(res.publicUrl);
    setMessage("Image uploaded — save the collection to keep changes.");
  }

  if (!supabase) {
    return (
      <p className="text-sm text-muted-foreground">
        Database connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        backLink={{ to: "/dashboard/collections", label: "Collections" }}
        title={isNew ? "New collection" : "Edit collection"}
        description="Group products for collection pages on the site — optional hero image and sort order."
      />

      {error ? <FlashMessage variant="error">{error}</FlashMessage> : null}
      {message ? <FlashMessage variant="success">{message}</FlashMessage> : null}

      <form onSubmit={(e) => void onSubmit(e)} className="mx-auto w-full max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>
              The storefront URL is generated automatically from the collection name.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="off"
                placeholder="Electronics drop"
              />
              <p className="text-xs text-muted-foreground">
                Storefront URL:{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8rem]">
                  /collections/{slugFromLabel(name) || "…"}
                </code>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-sort">Sort order</Label>
              <Input
                id="c-sort"
                className="max-w-xs"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                required
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-desc">Description</Label>
              <textarea
                id="c-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-hero-file">Hero image</Label>
              <p className="text-xs text-muted-foreground">
                Uploads are stored in your store media library under{" "}
                <code className="text-[0.75rem]">collections/hero/</code>. You can also paste an external image URL below.
              </p>
              <Input
                id="c-hero-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                disabled={uploadingImage}
                onChange={(e) => void onHeroFileChange(e)}
                className="cursor-pointer text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
              />
              {uploadingImage ? (
                <p className="text-xs text-muted-foreground">Uploading…</p>
              ) : null}
              {heroImage ? (
                <div className="mt-2 overflow-hidden rounded-md border border-border">
                  <img
                    src={heroImage}
                    alt=""
                    className="max-h-44 w-full object-cover"
                  />
                </div>
              ) : null}
              <Label htmlFor="c-hero" className="pt-2">
                Or image URL
              </Label>
              <Input
                id="c-hero"
                value={heroImage}
                onChange={(e) => setHeroImage(e.target.value)}
                placeholder="https://…"
                autoComplete="off"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving || uploadingImage}>
            {saving ? "Saving…" : "Save"}
          </Button>
          {!isNew ? (
            <Button type="button" variant="destructive" onClick={() => void onDelete()}>
              Delete collection
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
