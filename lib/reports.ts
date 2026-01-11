import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  Timestamp,
  FieldValue,
} from "firebase/firestore";

export type ReportType = "comment" | "ticket_image" | "ticket";
export type ReportStatus = "pending" | "reviewed" | "dismissed";

export interface Report {
  id?: string;
  reporterId: string;
  reporterName: string;
  type: ReportType;
  reason: string;
  status: ReportStatus;
  ticketId?: string;
  // For ticket reports
  ticketTitle?: string;
  ticketDescription?: string;
  ticketAuthorId?: string;
  // For comment reports
  commentId?: string;
  commentText?: string;
  commentAuthorId?: string;
  commentAuthorName?: string;
  // For image reports
  imageUrl?: string;
  ticketImageIndex?: number;
  // Timestamps
  createdAt: Timestamp | FieldValue;
  reviewedAt?: Timestamp | FieldValue;
  reviewedBy?: string;
}

// ... existing reportComment function ...

export async function reportTicket({
  reporterId,
  reporterName,
  ticketId,
  ticketTitle,
  ticketDescription,
  ticketAuthorId,
  reason,
}: {
  reporterId: string;
  reporterName: string;
  ticketId: string;
  ticketTitle?: string;
  ticketDescription: string;
  ticketAuthorId: string;
  reason: string;
}): Promise<void> {
  // Check if user already reported this ticket
  const existingReports = await getDocs(
    query(
      collection(db, "reports"),
      where("reporterId", "==", reporterId),
      where("ticketId", "==", ticketId),
      where("type", "==", "ticket")
    )
  );

  if (!existingReports.empty) {
    throw new Error("You have already reported this ticket");
  }

  await addDoc(collection(db, "reports"), {
    reporterId,
    reporterName,
    type: "ticket" as ReportType,
    ticketId,
    ticketTitle,
    ticketDescription,
    ticketAuthorId,
    reason,
    status: "pending" as ReportStatus,
    createdAt: serverTimestamp(),
  });
}

// ... existing reportTicketImage function ...

export async function reportComment({
  reporterId,
  reporterName,
  ticketId,
  commentId,
  commentText,
  commentAuthorId,
  commentAuthorName,
  reason,
}: {
  reporterId: string;
  reporterName: string;
  ticketId: string;
  commentId: string;
  commentText: string;
  commentAuthorId: string;
  commentAuthorName: string;
  reason: string;
}): Promise<void> {
  // Check if user already reported this comment
  const existingReports = await getDocs(
    query(
      collection(db, "reports"),
      where("reporterId", "==", reporterId),
      where("commentId", "==", commentId),
      where("type", "==", "comment")
    )
  );

  if (!existingReports.empty) {
    throw new Error("You have already reported this comment");
  }

  await addDoc(collection(db, "reports"), {
    reporterId,
    reporterName,
    type: "comment" as ReportType,
    ticketId,
    commentId,
    commentText,
    commentAuthorId,
    commentAuthorName,
    reason,
    status: "pending" as ReportStatus,
    createdAt: serverTimestamp(),
  });
}

export async function reportTicketImage({
  reporterId,
  reporterName,
  ticketId,
  imageUrl,
  imageIndex,
  reason,
}: {
  reporterId: string;
  reporterName: string;
  ticketId: string;
  imageUrl: string;
  imageIndex: number;
  reason: string;
}): Promise<void> {
  // Check if user already reported this image
  const existingReports = await getDocs(
    query(
      collection(db, "reports"),
      where("reporterId", "==", reporterId),
      where("ticketId", "==", ticketId),
      where("imageUrl", "==", imageUrl),
      where("type", "==", "ticket_image")
    )
  );

  if (!existingReports.empty) {
    throw new Error("You have already reported this image");
  }

  await addDoc(collection(db, "reports"), {
    reporterId,
    reporterName,
    type: "ticket_image" as ReportType,
    ticketId,
    imageUrl,
    ticketImageIndex: imageIndex,
    reason,
    status: "pending" as ReportStatus,
    createdAt: serverTimestamp(),
  });
}
