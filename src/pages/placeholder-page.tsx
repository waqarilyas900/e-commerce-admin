import { useLocation } from "react-router-dom";
import { mainNavItems } from "@/config/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderPage() {
  const location = useLocation();
  const nav = mainNavItems.find((n) => n.url === location.pathname);
  const title = nav?.title ?? "Section";

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description="This section is not wired yet — use it for future admin tools."
      />
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>Reserved for upcoming features.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>When you add a new tool, route it here and replace this card with the real UI.</p>
        </CardContent>
      </Card>
    </div>
  );
}
