"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  X,
  Trash2,
  MessageSquare,
  Image as ImageIcon,
  Flag,
  Eye,
  ExternalLink,
  Clock,
  User,
  FileText,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Report, ReportStatus } from "@/lib/reports";

interface ReportWithId extends Report {
  id: string;
}

export default function ModerationPanel() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<ReportWithId[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [activeTab, setActiveTab] = useState<ReportStatus | "all">("pending");
  const [selectedReport, setSelectedReport] = useState<ReportWithId | null>(
    null
  );
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"delete" | "dismiss" | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
        return;
      }

      const checkAdminRole = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().role === "admin") {
            setIsAdmin(true);
          } else {
            router.push("/");
          }
        } catch (error) {
          console.error("Error checking admin role:", error);
          router.push("/");
        } finally {
          setCheckingRole(false);
        }
      };

      checkAdminRole();
    }
  }, [user, loading, router]);

  // Fetch all reports
  useEffect(() => {
    if (isAdmin) {
      const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedReports = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ReportWithId[];
        setReports(fetchedReports);
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const getFilteredReports = () => {
    if (activeTab === "all") return reports;
    return reports.filter((r) => r.status === activeTab);
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            className="bg-amber-500/10 text-amber-600 border-amber-200"
            variant="outline"
          >
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case "reviewed":
        return (
          <Badge
            className="bg-green-500/10 text-green-600 border-green-200"
            variant="outline"
          >
            <Check className="h-3 w-3 mr-1" /> Reviewed
          </Badge>
        );
      case "dismissed":
        return (
          <Badge
            className="bg-gray-500/10 text-gray-600 border-gray-200"
            variant="outline"
          >
            <X className="h-3 w-3 mr-1" /> Dismissed
          </Badge>
        );
    }
  };

  const openActionDialog = (
    report: ReportWithId,
    action: "delete" | "dismiss"
  ) => {
    setSelectedReport(report);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const handleDeleteContent = async () => {
    if (!selectedReport || !user) return;
    setIsProcessing(true);

    try {
      if (
        selectedReport.type === "comment" &&
        selectedReport.ticketId &&
        selectedReport.commentId
      ) {
        // Delete the comment
        await deleteDoc(
          doc(
            db,
            "tickets",
            selectedReport.ticketId,
            "comments",
            selectedReport.commentId
          )
        );
      } else if (
        selectedReport.type === "ticket_image" &&
        selectedReport.ticketId &&
        selectedReport.imageUrl
      ) {
        // Remove the image from the ticket's imageUrls array
        const ticketRef = doc(db, "tickets", selectedReport.ticketId);
        const ticketSnap = await getDoc(ticketRef);
        if (ticketSnap.exists()) {
          const ticketData = ticketSnap.data();
          const updatedImageUrls = ticketData.imageUrls.filter(
            (url: string) => url !== selectedReport.imageUrl
          );
          await updateDoc(ticketRef, { imageUrls: updatedImageUrls });
        }
      } else if (selectedReport.type === "ticket" && selectedReport.ticketId) {
        // Delete the entire ticket
        await deleteDoc(doc(db, "tickets", selectedReport.ticketId));
      }

      // Mark report as reviewed
      await updateDoc(doc(db, "reports", selectedReport.id), {
        status: "reviewed",
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
      });

      setActionDialogOpen(false);
      setSelectedReport(null);
    } catch (error) {
      console.error("Error deleting content:", error);
      alert("Failed to delete content. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismissReport = async () => {
    if (!selectedReport || !user) return;
    setIsProcessing(true);

    try {
      await updateDoc(doc(db, "reports", selectedReport.id), {
        status: "dismissed",
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
      });

      setActionDialogOpen(false);
      setSelectedReport(null);
    } catch (error) {
      console.error("Error dismissing report:", error);
      alert("Failed to dismiss report. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return "Unknown";
    return timestamp.toDate().toLocaleString();
  };

  const filteredReports = getFilteredReports();
  const pendingCount = reports.filter((r) => r.status === "pending").length;

  if (loading || checkingRole) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-muted/20 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/admin")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Flag className="h-8 w-8 text-destructive" />
                Moderation Panel
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Review and manage reported content
              </p>
            </div>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              {pendingCount} Pending
            </Badge>
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ReportStatus | "all")}
        >
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" /> Pending
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="gap-2">
              <Check className="h-4 w-4" /> Reviewed
            </TabsTrigger>
            <TabsTrigger value="dismissed" className="gap-2">
              <X className="h-4 w-4" /> Dismissed
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Reports List */}
        {filteredReports.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Check className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No reports to show</h3>
                <p className="text-muted-foreground">
                  {activeTab === "pending"
                    ? "All reports have been reviewed! 🎉"
                    : `No ${activeTab} reports found.`}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Type Indicator */}
                  <div
                    className={`w-full md:w-2 shrink-0 ${
                      report.type === "comment"
                        ? "bg-blue-500"
                        : report.type === "ticket"
                        ? "bg-orange-500"
                        : "bg-purple-500"
                    }`}
                  />

                  {/* Image preview for ticket_image reports */}
                  {report.type === "ticket_image" && report.imageUrl && (
                    <div className="w-full md:w-48 h-32 md:h-auto bg-muted shrink-0">
                      <img
                        src={report.imageUrl}
                        alt="Reported content"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 p-6 flex flex-col justify-between gap-4">
                    <div>
                      {/* Header row */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          {report.type === "comment" ? (
                            <Badge variant="outline" className="bg-blue-50">
                              <MessageSquare className="h-3 w-3 mr-1" /> Comment
                            </Badge>
                          ) : report.type === "ticket" ? (
                            <Badge variant="outline" className="bg-orange-50">
                              <FileText className="h-3 w-3 mr-1" /> Ticket
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-purple-50">
                              <ImageIcon className="h-3 w-3 mr-1" /> Image
                            </Badge>
                          )}
                          {getStatusBadge(report.status)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(report.createdAt)}
                        </span>
                      </div>

                      {/* Reason */}
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-1">
                          Report Reason
                        </h4>
                        <p className="text-foreground bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
                          {report.reason}
                        </p>
                      </div>

                      {/* Content preview for comments */}
                      {report.type === "comment" && report.commentText && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-1">
                            Reported Comment
                          </h4>
                          <p className="text-sm bg-muted/50 rounded-md px-3 py-2 border italic">
                            &ldquo;{report.commentText}&rdquo;
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            By {report.commentAuthorName || "Unknown user"}
                          </p>
                        </div>
                      )}

                      {/* Content preview for tickets */}
                      {report.type === "ticket" && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-1">
                            Reported Ticket
                          </h4>
                          <div className="bg-muted/50 rounded-md px-3 py-2 border">
                            <p className="font-medium text-sm">
                              {report.ticketTitle || "Incident Report"}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {report.ticketDescription}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Reporter info */}
                      <div className="text-xs text-muted-foreground flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Reported by {report.reporterName}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {report.status === "pending" && (
                      <div className="flex flex-wrap gap-2 pt-4 border-t mt-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openActionDialog(report, "delete")}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Content
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(report, "dismiss")}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Dismiss Report
                        </Button>
                        {report.ticketId && (
                          <Link
                            href={`/ticket/${report.ticketId}`}
                            className="ml-auto"
                          >
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4 mr-2" />
                              View in Context
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}

                    {report.status !== "pending" && report.reviewedAt && (
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        {report.status === "reviewed"
                          ? "Content deleted"
                          : "Report dismissed"}{" "}
                        on {formatDate(report.reviewedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "delete"
                ? "Delete Reported Content?"
                : "Dismiss Report?"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "delete"
                ? `This will permanently delete the reported ${
                    selectedReport?.type === "comment"
                      ? "comment"
                      : selectedReport?.type === "ticket"
                      ? "ticket"
                      : "image"
                  }. This action cannot be undone.`
                : "This will mark the report as dismissed. The reported content will remain visible."}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && actionType === "delete" && (
            <div className="my-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Content to be deleted:</p>
              {selectedReport.type === "comment" ? (
                <p className="text-sm italic">
                  &ldquo;{selectedReport.commentText}&rdquo;
                </p>
              ) : selectedReport.type === "ticket" ? (
                <div>
                  <p className="font-medium">
                    {selectedReport.ticketTitle || "Incident Report"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.ticketDescription}
                  </p>
                </div>
              ) : (
                <img
                  src={selectedReport.imageUrl}
                  alt="Content to delete"
                  className="max-h-32 rounded-md"
                />
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === "delete" ? "destructive" : "default"}
              onClick={
                actionType === "delete"
                  ? handleDeleteContent
                  : handleDismissReport
              }
              disabled={isProcessing}
            >
              {isProcessing
                ? "Processing..."
                : actionType === "delete"
                ? "Delete Content"
                : "Dismiss Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
