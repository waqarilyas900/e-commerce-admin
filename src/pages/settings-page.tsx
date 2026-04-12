import { useEffect, useId, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/brand";
import {
  fetchStoreSettings,
  updateStoreSettings,
} from "@/lib/supabase/store-settings";
import { FlashMessage } from "@/components/dashboard/flash-message";
import { supabase } from "@/lib/supabase/client";

const STORAGE_KEY = "ecom-admin-panel-settings-v1";

type Settings = {
  displayName: string;
  notifyOrders: boolean;
  notifyInventory: boolean;
};

function load(): Settings {
  if (typeof window === "undefined") {
    return {
      displayName: APP_NAME,
      notifyOrders: true,
      notifyInventory: true,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        displayName: APP_NAME,
        notifyOrders: true,
        notifyInventory: true,
      };
    }
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : APP_NAME,
      notifyOrders: Boolean(parsed.notifyOrders ?? true),
      notifyInventory: Boolean(parsed.notifyInventory ?? true),
    };
  } catch {
    return {
      displayName: APP_NAME,
      notifyOrders: true,
      notifyInventory: true,
    };
  }
}

export function SettingsPage() {
  const dnId = useId();
  const storeNameId = useId();
  const supportEmailId = useId();
  const currencyId = useId();
  const [displayName, setDisplayName] = useState(APP_NAME);
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyInventory, setNotifyInventory] = useState(true);
  const [saved, setSaved] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("PKR");
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeSaved, setStoreSaved] = useState(false);
  const [storeErr, setStoreErr] = useState<string | null>(null);

  useEffect(() => {
    const s = load();
    setDisplayName(s.displayName);
    setNotifyOrders(s.notifyOrders);
    setNotifyInventory(s.notifyInventory);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setStoreLoading(false);
      return;
    }
    void fetchStoreSettings().then((row) => {
      if (row) {
        setStoreName(row.store_name);
        setSupportEmail(row.support_email);
        setDefaultCurrency(row.default_currency || "PKR");
      }
      setStoreLoading(false);
    });
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Settings = {
      displayName: displayName.trim() || APP_NAME,
      notifyOrders,
      notifyInventory,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  async function onSaveStore(e: FormEvent) {
    e.preventDefault();
    setStoreErr(null);
    const res = await updateStoreSettings({
      store_name: storeName.trim() || "Store",
      support_email: supportEmail.trim(),
      default_currency: defaultCurrency.trim().toUpperCase() || "PKR",
    });
    if (!res.ok) {
      setStoreErr(res.error ?? "Save failed.");
      return;
    }
    setStoreSaved(true);
    window.setTimeout(() => setStoreSaved(false), 2500);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Store configuration is saved to Supabase (store_settings). Workspace preferences stay in this browser."
      />

      {storeErr ? <FlashMessage variant="error">{storeErr}</FlashMessage> : null}

      <form onSubmit={onSaveStore} className="mx-auto w-full max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Store (database)</CardTitle>
            <CardDescription>
              Singleton row <code className="text-xs">public.store_settings</code> — used by checkout and catalog helpers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {storeLoading ? (
              <p className="text-sm text-muted-foreground">Loading store settings…</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor={storeNameId}>Store name</Label>
                  <Input
                    id={storeNameId}
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    autoComplete="organization"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={supportEmailId}>Support email</Label>
                  <Input
                    id={supportEmailId}
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={currencyId}>Default currency (ISO 4217)</Label>
                  <Input
                    id={currencyId}
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    placeholder="PKR"
                    className="max-w-[120px] font-mono uppercase"
                  />
                </div>
                <Button type="submit" size="sm">
                  Save store settings
                </Button>
                {storeSaved ? (
                  <span className="ml-2 text-sm text-muted-foreground" role="status">
                    Saved
                  </span>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </form>

      <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Shown in the window title and command palette hints.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={dnId}>Display name</Label>
              <Input
                id={dnId}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="organization"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Choose which alerts you want when in-app notifications are enabled.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={notifyOrders}
                onChange={(e) => setNotifyOrders(e.target.checked)}
              />
              Order events
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={notifyInventory}
                onChange={(e) => setNotifyInventory(e.target.checked)}
              />
              Low stock warnings
            </label>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit">Save settings</Button>
          {saved ? (
            <span className="text-sm text-muted-foreground" role="status">
              Saved
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
