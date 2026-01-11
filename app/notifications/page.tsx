"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Notification,
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const unsubscribe = subscribeToNotifications(
      user.uid,
      (fetchedNotifications) => {
        setNotifications(fetchedNotifications);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading, router]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }
    router.push(`/ticket/${notification.ticketId}`);
  };

  const handleMarkAllRead = async () => {
    if (user) {
      await markAllNotificationsAsRead(user.uid);
    }
  };

  const handleDeleteNotification = async (
    e: React.MouseEvent,
    notificationId: string
  ) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "notifications", notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "new_comment":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "vote_milestone":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "status_change":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case "mention":
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const formatTime = (timestamp: Notification["createdAt"]) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-muted/10">
        <div className="container mx-auto p-4 max-w-2xl space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="container mx-auto p-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="hover:bg-transparent hover:text-primary pl-0"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} unread notification
                  {unreadCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <Card className="border-none shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No notifications</p>
                <p className="text-sm">You&apos;re all caught up!</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                  !notification.isRead
                    ? "bg-primary/5 ring-1 ring-primary/20"
                    : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm leading-relaxed ${
                            !notification.isRead ? "font-medium" : ""
                          }`}
                        >
                          {notification.message}
                        </p>
                        {!notification.isRead && (
                          <Badge
                            variant="default"
                            className="shrink-0 text-[10px] h-5"
                          >
                            New
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) =>
                            handleDeleteNotification(e, notification.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
