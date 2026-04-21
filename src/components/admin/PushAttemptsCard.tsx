import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertTriangle, MinusCircle } from "lucide-react";

interface PushAttempt {
  id: string;
  message_title: string | null;
  status: string;
  sent: number | null;
  failed: number | null;
  total: number | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

const statusMeta = (status: string) => {
  switch (status) {
    case "success":
      return { label: "Sent", icon: CheckCircle2, variant: "default" as const, className: "bg-emerald-600 hover:bg-emerald-600" };
    case "partial":
      return { label: "Partial", icon: AlertTriangle, variant: "secondary" as const, className: "" };
    case "error":
      return { label: "Failed", icon: XCircle, variant: "destructive" as const, className: "" };
    case "skipped":
      return { label: "Skipped", icon: MinusCircle, variant: "outline" as const, className: "" };
    default:
      return { label: "Pending", icon: Clock, variant: "outline" as const, className: "" };
  }
};

export function PushAttemptsCard() {
  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["push-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_attempts")
        .select("id, message_title, status, sent, failed, total, error, created_at, completed_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as PushAttempt[];
    },
    refetchInterval: 15_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent push attempts</CardTitle>
        <p className="text-xs text-muted-foreground">
          Last 10 push fan-outs to registered devices. Refreshes every 15 seconds.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : attempts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No push attempts yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {attempts.map((a) => {
              const meta = statusMeta(a.status);
              const Icon = meta.icon;
              return (
                <li key={a.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {a.message_title ?? "(untitled)"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                      {a.total !== null && (
                        <>
                          {" · "}
                          <span className="text-foreground">{a.sent ?? 0}</span> sent
                          {(a.failed ?? 0) > 0 && (
                            <>
                              {" · "}
                              <span className="text-destructive">{a.failed}</span> failed
                            </>
                          )}
                          {" · "}
                          {a.total} device{a.total === 1 ? "" : "s"}
                        </>
                      )}
                    </p>
                    {a.error && (
                      <p className="text-xs text-destructive mt-0.5 truncate" title={a.error}>
                        {a.error}
                      </p>
                    )}
                  </div>
                  <Badge variant={meta.variant} className={`${meta.className} gap-1 shrink-0`}>
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
