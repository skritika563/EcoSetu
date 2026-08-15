/**
 * NotificationBell — authenticated-only notification dropdown.
 *
 * Mock feed for now (see hooks/useNotifications). Notification objects live in
 * data/notificationData.js, never inline here.
 */

import { Bell, CalendarCheck, CheckCheck, Megaphone, Sparkles, Store } from "lucide-react";

import { useNotifications } from "@/hooks/useNotifications";
import { formatRelativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Notification type → icon. Data only carries the string key. */
const TYPE_ICONS = {
  pickup: CalendarCheck,
  points: Sparkles,
  marketplace: Store,
  campaign: Megaphone,
};

const NotificationItem = ({ notification, onRead }) => {
  const Icon = TYPE_ICONS[notification.type] ?? Bell;

  return (
    <button
      type="button"
      onClick={() => onRead(notification.id)}
      className={cn(
        "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
        !notification.read && "bg-primary/[0.04]"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          notification.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm",
              notification.read ? "font-medium text-foreground" : "font-semibold text-foreground"
            )}
          >
            {notification.title}
          </span>
          {!notification.read && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {notification.description}
        </span>
        <span className="mt-1 block text-[11px] text-muted-foreground/70">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </span>
    </button>
  );
};

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const hasNotifications = notifications.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id="notification-bell"
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="font-heading text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 px-2 text-xs font-medium text-primary hover:text-primary"
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <Separator />

        {hasNotifications ? (
          <ScrollArea className="max-h-[22rem]">
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Bell className="h-4.5 w-4.5" />
            </span>
            <p className="text-sm font-medium text-foreground">You're all caught up</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Pickup updates, Eco Points and campaign news will show up here.
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
