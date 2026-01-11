"use client";

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

// Notification types
export type NotificationType =
  | "new_comment"
  | "status_change"
  | "vote_milestone"
  | "mention";

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  ticketId: string;
  message: string;
  isRead: boolean;
  createdAt: Timestamp;
  // Optional metadata
  senderId?: string;
  senderName?: string;
}

// Create a new notification
export async function createNotification({
  recipientId,
  type,
  ticketId,
  message,
  senderId,
  senderName,
}: {
  recipientId: string;
  type: NotificationType;
  ticketId: string;
  message: string;
  senderId?: string;
  senderName?: string;
}): Promise<string | null> {
  // Don't notify yourself
  if (recipientId === senderId) {
    return null;
  }

  try {
    const docRef = await addDoc(collection(db, "notifications"), {
      recipientId,
      type,
      ticketId,
      message,
      isRead: false,
      createdAt: serverTimestamp(),
      senderId: senderId || null,
      senderName: senderName || null,
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

// Subscribe to user's notifications
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): () => void {
  const q = query(
    collection(db, "notifications"),
    where("recipientId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
    callback(notifications);
  });

  return unsubscribe;
}

// Mark a single notification as read
export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    await updateDoc(notificationRef, { isRead: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(
  userId: string
): Promise<void> {
  try {
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", userId),
      where("isRead", "==", false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((docSnapshot) => {
      batch.update(docSnapshot.ref, { isRead: true });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
}

// Helper: Create notification for new comment on a ticket
export async function notifyNewComment({
  ticketOwnerId,
  ticketId,
  commenterName,
  commenterId,
}: {
  ticketOwnerId: string;
  ticketId: string;
  commenterName: string;
  commenterId: string;
}): Promise<void> {
  await createNotification({
    recipientId: ticketOwnerId,
    type: "new_comment",
    ticketId,
    message: `${commenterName} commented on your ticket`,
    senderId: commenterId,
    senderName: commenterName,
  });
}

// Helper: Create notification for ticket status change
export async function notifyStatusChange({
  ticketOwnerId,
  ticketId,
  newStatus,
}: {
  ticketOwnerId: string;
  ticketId: string;
  newStatus: string;
}): Promise<void> {
  const statusMessages: Record<string, string> = {
    pending: "Your ticket is now pending review",
    "in-progress": "Your ticket is now being worked on",
    resolved: "Your ticket has been resolved",
    rejected: "Your ticket was rejected",
  };

  await createNotification({
    recipientId: ticketOwnerId,
    type: "status_change",
    ticketId,
    message:
      statusMessages[newStatus] || `Your ticket status changed to ${newStatus}`,
  });
}

// Helper: Create notification for vote milestones
export async function notifyVoteMilestone({
  ticketOwnerId,
  ticketId,
  voteCount,
}: {
  ticketOwnerId: string;
  ticketId: string;
  voteCount: number;
}): Promise<void> {
  // Only notify at specific milestones
  const milestones = [5, 10, 25, 50, 100];
  if (!milestones.includes(voteCount)) {
    return;
  }

  await createNotification({
    recipientId: ticketOwnerId,
    type: "vote_milestone",
    ticketId,
    message: `Your ticket reached ${voteCount} upvotes!`,
  });
}
