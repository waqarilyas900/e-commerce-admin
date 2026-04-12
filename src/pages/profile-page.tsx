import { useEffect, useId, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlashMessage } from "@/components/dashboard/flash-message";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase/client";

export function ProfilePage() {
  const { user } = useAuth();
  const emailId = useId();
  const nameId = useId();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    const meta = user.user_metadata as Record<string, unknown>;
    const n =
      typeof meta.full_name === "string"
        ? meta.full_name
        : [meta.first_name, meta.last_name].filter(Boolean).join(" ");
    setFullName(typeof n === "string" ? n : "");
    setLoading(false);
  }, [user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!supabase) {
      setError("Database connection is not configured.");
      return;
    }
    setSaving(true);
    const { error: upErr } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim() },
    });
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setMessage("Profile updated.");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile"
        description="Your admin profile uses the same sign-in as the storefront. Email changes are managed in your authentication provider settings."
      />

      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Display name is stored on the auth user record.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            {error ? <FlashMessage variant="error">{error}</FlashMessage> : null}
            {message ? <FlashMessage variant="success">{message}</FlashMessage> : null}
            <div className="space-y-2">
              <Label htmlFor={emailId}>Email</Label>
              <Input id={emailId} type="email" value={email} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={nameId}>Full name</Label>
              <Input
                id={nameId}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
