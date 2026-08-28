/**
 * AdminNotifications — broadcast notifications to all users, specific roles, or specific users.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Send, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import useAdminNotifications from "@/hooks/useAdminNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/admin/EmptyState";

const AdminNotifications = () => {
  const { history, send } = useAdminNotifications();
  const notifications = history.data?.notifications ?? [];

  // Form state
  const [target, setTarget] = useState("all");
  const [targetRole, setTargetRole] = useState("household");
  const [targetUserId, setTargetUserId] = useState("");
  const [type, setType] = useState("campaign");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title || !description) {
      toast.error("Please fill in both a title and description.");
      return;
    }

    try {
      setSending(true);
      setSuccessMessage(null);
      const payload = {
        target,
        targetRole: target === "role" ? targetRole : undefined,
        targetUserId: target === "user" ? targetUserId : undefined,
        type,
        title,
        description,
      };

      const res = await send(payload);
      setSuccessMessage(`Notification successfully delivered to ${res.sentCount} user(s).`);
      toast.success(`Notification delivered to ${res.sentCount} user(s)`);
      setTitle("");
      setDescription("");
    } catch (err) {
      toast.error(err.message || "Failed to broadcast notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Platform Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Broadcast announcements, updates, and reminders to community members
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left: Compose Form (3 Cols) */}
        <div className="space-y-6 rounded-xl border border-border/60 bg-card p-6 shadow-sm lg:col-span-3">
          <h2 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Broadcast Message
          </h2>

          {successMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4">
            {/* Target selection */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Recipients</label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Active Users (Platform-Wide)</SelectItem>
                  <SelectItem value="role">Specific User Role</SelectItem>
                  <SelectItem value="user">Specific User ID</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Role if role selected */}
            {target === "role" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Target Role</label>
                <Select value={targetRole} onValueChange={setTargetRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="household">Households</SelectItem>
                    <SelectItem value="organization">Organizations (NGOs/Schools/Universities)</SelectItem>
                    <SelectItem value="collector">Scrap Collectors</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Target User ID if specific user */}
            {target === "user" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">User MongoDB ID</label>
                <Input
                  placeholder="e.g. 660f9a2b8e3a1..."
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="mt-1 font-mono text-sm"
                  required
                />
              </div>
            )}

            {/* Notification Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notification Category</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="campaign">Campaign / Drive Announcement</SelectItem>
                  <SelectItem value="pickup">Pickup Alert</SelectItem>
                  <SelectItem value="points">Eco Points / Rewards</SelectItem>
                  <SelectItem value="marketplace">Marketplace Update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input
                placeholder="e.g. E-Waste Collection Drive This Weekend!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Message Body</label>
              <Textarea
                placeholder="Write your broadcast message here…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? "Sending Notifications…" : "Send Broadcast"}
            </Button>
          </form>
        </div>

        {/* Right: Recent Broadcasts History (2 Cols) */}
        <div className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm lg:col-span-2">
          <h2 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Recent Sent Notifications
          </h2>

          {history.loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : history.error ? (
            <p className="text-xs text-red-600">{history.error}</p>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              description="Broadcasts you send will show up here."
            />
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-lg border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{n.title}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {n.type}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">{n.description}</p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                    <span>To: {n.user?.name || "User"}</span>
                    <span>{n.createdAt ? format(new Date(n.createdAt), "MMM d, p") : "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;
