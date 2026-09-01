import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ADMIN_LIST_CARD_CLASS, ADMIN_LIST_CARD_HEADER_CLASS } from "@/components/dashboard/admin-list-shell";
import { getStorefrontOrigin } from "@/lib/storefront-api";

type FeedHealth = {
  ok: boolean;
  status: number;
  rowCount: number;
  checkedAt: string;
  error?: string;
};

export function CatalogFeedHealth() {
  const [health, setHealth] = useState<FeedHealth | null>(null);
  const [loading, setLoading] = useState(false);

  async function check() {
    setLoading(true);
    try {
      const origin = getStorefrontOrigin();
      const url = `${origin}/feeds/google-merchant.txt`;
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const rowCount = Math.max(0, lines.length - 1);
      setHealth({
        ok: res.ok,
        status: res.status,
        rowCount,
        checkedAt: new Date().toISOString(),
      });
    } catch (e) {
      setHealth({
        ok: false,
        status: 0,
        rowCount: 0,
        checkedAt: new Date().toISOString(),
        error: e instanceof Error ? e.message : "Feed check failed",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void check();
    });
  }, []);

  const feedUrl = (() => {
    try {
      return `${getStorefrontOrigin()}/feeds/google-merchant.txt`;
    } catch {
      return null;
    }
  })();

  return (
    <Card className={ADMIN_LIST_CARD_CLASS}>
      <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Meta / Google catalog feed</CardTitle>
            <CardDescription>Live health check of your storefront product feed.</CardDescription>
          </div>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => void check()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-5 text-sm">
        {!health ? (
          <p className="text-muted-foreground">Checking feed…</p>
        ) : health.error ? (
          <p className="text-destructive">{health.error}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={health.ok ? "success" : "destructive"}>
                {health.ok ? "Feed OK" : `HTTP ${health.status}`}
              </Badge>
              <span className="text-muted-foreground">{health.rowCount} product rows</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Last checked {new Date(health.checkedAt).toLocaleString()}
            </p>
          </>
        )}
        {feedUrl ? (
          <Button variant="link" className="h-auto p-0 text-xs" asChild>
            <a href={feedUrl} target="_blank" rel="noopener noreferrer">
              Open feed URL
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
