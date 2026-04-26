import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { setAppBadge } from "@/lib/native";

interface Message {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

const LAST_SEEN_KEY = "festival_messages_last_seen";

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const MessagesBell = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    const stored = localStorage.getItem(LAST_SEEN_KEY);
    return stored ? Number(stored) : 0;
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Message[];
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // Realtime: when an admin adds/edits/deletes a row, refresh the list immediately.
  useEffect(() => {
    const channel = supabase
      .channel("messages-public")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["messages"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const unreadCount = messages.filter(
    (m) => new Date(m.created_at).getTime() > lastSeen,
  ).length;

  // Mirror unread count to the native iOS / Android app icon badge.
  useEffect(() => {
    void setAppBadge(unreadCount);
  }, [unreadCount]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && messages.length > 0) {
      const newest = new Date(messages[0].created_at).getTime();
      localStorage.setItem(LAST_SEEN_KEY, String(newest));
      setLastSeen(newest);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
          className="relative bg-card/80 backdrop-blur-sm hover:bg-card shadow-md"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b">
          <h3 className="font-heading text-lg">Announcements</h3>
        </div>
        <ScrollArea className="max-h-96">
          {messages.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No messages yet. Check back soon!
            </p>
          ) : (
            <ul className="divide-y">
              {messages.map((m) => (
                <li key={m.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm leading-tight">{m.title}</h4>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatWhen(m.created_at)}
                    </span>
                  </div>
                  {m.body && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {m.body}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default MessagesBell;
