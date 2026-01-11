"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  startAfter,
  limit,
  getDocs,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MapPin,
  MessageSquare,
  ThumbsUp,
  Share2,
  Send,
  Image as ImageIcon,
  Heart,
  Reply,
  X,
  Flag,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { notifyNewComment } from "@/lib/notifications";
import { reportComment, reportTicket } from "@/lib/reports";
import { Label } from "@/components/ui/label";

interface Comment {
  id?: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  text: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  createdAt: Timestamp;
  likes?: string[];
}

interface Ticket {
  id: string;
  userId: string;
  title?: string;
  category: string;
  description: string;
  status: string;
  location: {
    latitude: number;
    longitude: number;
  };
  imageUrls: string[];
  votes: string[];
  createdAt: Timestamp;
}

interface UserProfile {
  photoUrl?: string;
  displayName?: string;
  email?: string;
}

export default function TicketPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comment state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [ticketAuthor, setTicketAuthor] = useState<UserProfile | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Report state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingComment, setReportingComment] = useState<Comment | null>(
    null
  );
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<"comment" | "ticket">("comment");
  const [reportSuccessOpen, setReportSuccessOpen] = useState(false);

  // Fetch expanded user profile (for photoUrl)
  useEffect(() => {
    if (user) {
      const fetchUserProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      };
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        if (!params?.id) return;

        const docRef = doc(db, "tickets", params.id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setTicket({ id: docSnap.id, ...docSnap.data() } as Ticket);
        } else {
          setError("Ticket not found");
        }
      } catch (err) {
        console.error("Error fetching ticket:", err);
        setError("Error loading ticket details");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [params?.id]);

  // Fetch ticket author profile once ticket is loaded
  useEffect(() => {
    if (ticket?.userId) {
      const fetchTicketAuthor = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", ticket.userId));
          if (userDoc.exists()) {
            setTicketAuthor(userDoc.data() as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching ticket author:", error);
        }
      };
      fetchTicketAuthor();
    }
  }, [ticket?.userId]);

  // Pagination state
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(
    null
  );
  const [loadingComments, setLoadingComments] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const COMMENTS_PER_PAGE = 5;

  const fetchComments = useCallback(
    async (isInitial = false, lastDoc: QueryDocumentSnapshot | null = null) => {
      if (!params?.id) return;

      setLoadingComments(true);
      try {
        let q = query(
          collection(db, "tickets", params.id as string, "comments"),
          orderBy("createdAt", "desc"),
          limit(COMMENTS_PER_PAGE)
        );

        if (!isInitial && lastDoc) {
          q = query(
            collection(db, "tickets", params.id as string, "comments"),
            orderBy("createdAt", "desc"),
            startAfter(lastDoc),
            limit(COMMENTS_PER_PAGE)
          );
        }

        const snapshot = await getDocs(q);

        const fetchedComments = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Comment)
        );

        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMoreComments(snapshot.docs.length === COMMENTS_PER_PAGE);

        if (isInitial) {
          setComments(fetchedComments);
        } else {
          setComments((prev) => [...prev, ...fetchedComments]);
        }
      } catch (error) {
        console.error("Error fetching comments:", error);
      } finally {
        setLoadingComments(false);
      }
    },
    [params?.id]
  );

  useEffect(() => {
    fetchComments(true);
  }, [fetchComments]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter((file) => {
        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} too large. Maximum size is 5MB.`);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        setSelectedImages((prev) => [...prev, ...validFiles]);

        validFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreviews((prev) => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        });
      }
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePostComment = async () => {
    if (!user) {
      alert("Please log in to comment");
      return;
    }
    if (!commentText.trim() && selectedImages.length === 0) return;

    setIsSubmitting(true);
    try {
      const uploadedImageUrls: string[] = [];

      if (selectedImages.length > 0) {
        await Promise.all(
          selectedImages.map(async (image) => {
            const storageRef = ref(
              storage,
              `comment-images/${params.id}_${Date.now()}_${image.name}`
            );
            const snapshot = await uploadBytes(storageRef, image);
            const url = await getDownloadURL(snapshot.ref);
            uploadedImageUrls.push(url);
          })
        );
      }

      const newCommentRef = await addDoc(
        collection(db, "tickets", params.id as string, "comments"),
        {
          userId: user.uid,
          userName:
            user.displayName || user.email?.split("@")[0] || "Anonymous",
          userAvatar: userProfile?.photoUrl || user.photoURL,
          text: commentText,
          imageUrl: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null, // Backward compatibility
          imageUrls: uploadedImageUrls,
          createdAt: serverTimestamp(),
          likes: [],
        }
      );

      // Manually add to state for immediate feedback
      const newComment: Comment = {
        id: newCommentRef.id,
        userId: user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "Anonymous",
        userAvatar: userProfile?.photoUrl || user.photoURL || undefined,
        text: commentText,
        imageUrl: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null,
        imageUrls: uploadedImageUrls,
        createdAt: Timestamp.now(), // Estimate for UI
        likes: [],
      };
      setComments((prev) => [newComment, ...prev]);

      // Notify ticket owner about the new comment
      if (ticket && ticket.userId !== user.uid) {
        await notifyNewComment({
          ticketOwnerId: ticket.userId,
          ticketId: ticket.id,
          commenterName:
            user.displayName || user.email?.split("@")[0] || "Someone",
          commenterId: user.uid,
        });
      }

      setCommentText("");
      setSelectedImages([]);
      setImagePreviews([]);
    } catch (err) {
      console.error("Error posting comment:", err);
      alert("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTicketVote = async () => {
    if (!user || !ticket) return;

    const ticketRef = doc(db, "tickets", ticket.id);
    const uid = user.uid;

    try {
      if (ticket.votes?.includes(uid)) {
        await updateDoc(ticketRef, { votes: arrayRemove(uid) });
        // Optimistic update
        setTicket((prev) =>
          prev
            ? { ...prev, votes: prev.votes.filter((id) => id !== uid) }
            : null
        );
      } else {
        await updateDoc(ticketRef, { votes: arrayUnion(uid) });
        // Optimistic update
        setTicket((prev) =>
          prev ? { ...prev, votes: [...(prev.votes || []), uid] } : null
        );
      }
    } catch (err) {
      console.error("Error updating vote:", err);
    }
  };

  const handleCommentLike = async (comment: Comment) => {
    if (!user || !comment.id) return;

    const commentRef = doc(
      db,
      "tickets",
      params.id as string,
      "comments",
      comment.id
    );
    const uid = user.uid;
    const isLiked = comment.likes?.includes(uid);

    try {
      if (isLiked) {
        await updateDoc(commentRef, { likes: arrayRemove(uid) });
      } else {
        await updateDoc(commentRef, { likes: arrayUnion(uid) });
      }
    } catch (err) {
      console.error("Error liking comment:", err);
    }
  };

  const handleReply = (userName: string) => {
    setCommentText((prev) => `@${userName} ${prev}`);
    // Focus textarea? If ref was available.
    const textarea = document.querySelector("textarea");
    if (textarea) textarea.focus();
  };

  const openReportModal = (comment?: Comment) => {
    if (comment) {
      setReportingComment(comment);
      setReportType("comment");
    } else {
      setReportType("ticket");
    }
    setReportReason("");
    setReportError(null);
    setReportModalOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!user || !ticket || !reportReason.trim()) {
      setReportError("Please provide a reason for your report.");
      return;
    }

    if (reportType === "comment" && !reportingComment) {
      setReportError("No comment selected for reporting.");
      return;
    }

    setIsReporting(true);
    setReportError(null);

    try {
      const reporterName =
        user.displayName || user.email?.split("@")[0] || "Anonymous";

      if (reportType === "comment" && reportingComment) {
        await reportComment({
          reporterId: user.uid,
          reporterName,
          ticketId: ticket.id,
          commentId: reportingComment.id || "",
          commentText: reportingComment.text,
          commentAuthorId: reportingComment.userId || "",
          commentAuthorName: reportingComment.userName,
          reason: reportReason,
        });
      } else {
        await reportTicket({
          reporterId: user.uid,
          reporterName,
          ticketId: ticket.id,
          ticketTitle: ticket.title,
          ticketDescription: ticket.description,
          ticketAuthorId: ticket.userId,
          reason: reportReason,
        });
      }

      setReportModalOpen(false);
      setReportingComment(null);
      setReportReason("");
      setReportSuccessOpen(true);
    } catch (err) {
      if (err instanceof Error) {
        setReportError(err.message);
      } else {
        setReportError("Failed to submit report. Please try again.");
      }
    } finally {
      setIsReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-2xl space-y-4">
        <Button variant="ghost" disabled>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Map
        </Button>
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center h-screen gap-4">
        <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center">
          <span className="text-destructive font-bold text-xl">!</span>
        </div>
        <h1 className="text-2xl font-bold">Error</h1>
        <p className="text-muted-foreground">{error || "Ticket not found"}</p>
        <Button onClick={() => router.push("/")}>Return to Map</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="container mx-auto p-4 max-w-2xl">
        <Button
          variant="ghost"
          className="mb-4 hover:bg-transparent hover:text-primary pl-0"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Map
        </Button>

        <Card className="border-none shadow-sm bg-background mb-6 overflow-hidden">
          {/* Post Header */}
          <CardHeader className="flex flex-row items-center gap-4 p-4 pb-2">
            <Avatar className="h-10 w-10 border">
              {ticketAuthor?.photoUrl && (
                <AvatarImage
                  src={ticketAuthor.photoUrl}
                  alt={ticketAuthor.displayName || "Author"}
                />
              )}
              <AvatarFallback>
                {ticketAuthor?.displayName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">
                {ticketAuthor?.displayName || "Anonymous User"}
              </span>
              <span className="text-xs text-muted-foreground">
                {ticket.createdAt?.toDate
                  ? ticket.createdAt.toDate().toLocaleString([], {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Just now"}{" "}
                • {ticket.category}
              </span>
            </div>
            {/* <Button variant="ghost" size="icon" className="ml-auto">
              <MoreHorizontal className="h-4 w-4" />
            </Button> */}
          </CardHeader>

          {/* Post Content */}
          <CardContent className="p-4 pt-0 space-y-4">
            <div>
              <h1 className="text-xl font-bold leading-tight mb-2">
                {ticket.title || "Incident Report"}
              </h1>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>
            </div>

            {/* Image Grid */}
            {ticket.imageUrls && ticket.imageUrls.length > 0 && (
              <div
                className={`grid gap-2 ${
                  ticket.imageUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {ticket.imageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-lg overflow-hidden border bg-muted/20 aspect-4/3 group cursor-pointer"
                    onClick={() => setFullscreenImage(url)}
                  >
                    <img
                      src={url}
                      alt={`Evidence ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Location Badge */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 w-fit px-3 py-1.5 rounded-full">
              <MapPin className="h-3 w-3" />
              <span>
                {ticket.location.latitude.toFixed(5)},{" "}
                {ticket.location.longitude.toFixed(5)}
              </span>
            </div>
          </CardContent>
          <div className="flex justify-center py-4">
            <img
              src="/CivicAlertLogo.svg"
              alt="CivicAlert Logo"
              className="w-24 h-24"
            />
          </div>

          <Separator />

          {/* Interaction Bar */}
          <CardFooter className="p-2 flex justify-between items-center bg-muted/5">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 ${
                  ticket.votes?.includes(user?.uid || "")
                    ? "text-primary font-bold"
                    : "text-muted-foreground"
                } hover:text-primary`}
                onClick={handleTicketVote}
              >
                <ThumbsUp
                  className={`h-4 w-4 ${
                    ticket.votes?.includes(user?.uid || "")
                      ? "fill-current"
                      : ""
                  }`}
                />
                <span className="text-xs font-medium">
                  {ticket.votes?.length || 0} Upvotes
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-blue-500"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {comments.length} Comments
                </span>
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
            >
              <Share2 className="h-4 w-4" />
              <span className="text-xs font-medium">Share</span>
            </Button>
            {user && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-destructive"
                onClick={() => openReportModal()}
              >
                <Flag className="h-4 w-4" />
                <span className="text-xs font-medium">Report</span>
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Comment Section */}
        <div className="space-y-4">
          {/* Input */}
          {/* Input */}
          {user ? (
            <Card className="p-4 flex gap-3 shadow-sm border-none">
              <Avatar className="h-8 w-8">
                {userProfile?.photoUrl && (
                  <AvatarImage src={userProfile.photoUrl} alt="Me" />
                )}
                <AvatarFallback>ME</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Add to the discussion..."
                  className="min-h-[80px] bg-muted/20 border-transparent focus:border-input resize-none"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />

                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative inline-block">
                        <img
                          src={preview}
                          alt={`Preview ${idx + 1}`}
                          className="h-20 w-20 object-cover rounded-md border"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-muted-foreground ${
                      imagePreviews.length > 0 ? "text-primary" : ""
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {imagePreviews.length > 0
                      ? "Add More Photos"
                      : "Add Photos"}
                  </Button>
                  <Button
                    size="sm"
                    disabled={
                      (!commentText.trim() && selectedImages.length === 0) ||
                      isSubmitting
                    }
                    onClick={handlePostComment}
                  >
                    {isSubmitting ? "Posting..." : "Post Comment"}{" "}
                    <Send className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="bg-muted/20 rounded-lg p-6 text-center">
              <p className="text-muted-foreground mb-4">
                Please log in to join the discussion.
              </p>
              <Button onClick={() => router.push("/login")}>
                Log In to Comment
              </Button>
            </div>
          )}

          {/* Dummy Comments Feed */}
          <div className="space-y-3 pb-10">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                user={comment.userName}
                time={
                  comment.createdAt?.toDate
                    ? comment.createdAt.toDate().toLocaleString([], {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Just now"
                }
                text={comment.text}
                likes={comment.likes?.length || 0}
                hasImage={
                  !!(
                    comment.imageUrl ||
                    (comment.imageUrls && comment.imageUrls.length > 0)
                  )
                }
                imageUrl={comment.imageUrl}
                imageUrls={comment.imageUrls}
                isOfficial={false} // Would need a way to determine this logic
                currentUserId={user?.uid}
                onLike={() => handleCommentLike(comment)}
                onReply={() => handleReply(comment.userName)}
                onReport={() => openReportModal(comment)}
                userAvatar={comment.userAvatar}
                onImageClick={(url) => setFullscreenImage(url)}
              />
            ))}
            {comments.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to share your thoughts!
              </div>
            )}

            {hasMoreComments && comments.length > 0 && (
              <div className="flex justify-center pb-8 pt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchComments(false, lastVisible)}
                  disabled={loadingComments}
                >
                  {loadingComments ? "Loading..." : "Load More Comments"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={!!fullscreenImage}
        onOpenChange={() => setFullscreenImage(null)}
      >
        <DialogContent className="max-w-4xl w-full p-0 bg-transparent border-none shadow-none flex justify-center items-center">
          <DialogTitle className="sr-only">
            Fullscreen Evidence View
          </DialogTitle>
          <div className="relative w-full max-h-[90vh] flex justify-center">
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute -top-10 right-0 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-50 ring-1 ring-white/20"
            >
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </button>
            {fullscreenImage && (
              <img
                src={fullscreenImage}
                alt="Fullscreen evidence"
                className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Report {reportType === "comment" ? "Comment" : "Ticket"}
            </DialogTitle>
            <DialogDescription>
              Help us keep the community safe. Please explain why you&apos;re
              reporting this {reportType}.
            </DialogDescription>
          </DialogHeader>

          {reportType === "comment" && reportingComment && (
            <div className="my-2 p-3 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">
                Reported comment:
              </p>
              <p className="text-sm italic">
                &ldquo;{reportingComment.text}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                by {reportingComment.userName}
              </p>
            </div>
          )}

          {reportType === "ticket" && ticket && (
            <div className="my-2 p-3 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">
                Reported ticket:
              </p>
              <p className="text-sm font-medium">
                {ticket.title || "Untitled Ticket"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Owner: {ticketAuthor?.displayName || "Unknown User"}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="report-reason">Reason for report</Label>
            <Textarea
              id="report-reason"
              placeholder={`Why should this ${reportType} be removed? e.g., Spam, offensive content...`}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {reportError && (
            <p className="text-sm text-destructive">{reportError}</p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReportModalOpen(false);
                setReportingComment(null);
              }}
              disabled={isReporting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitReport}
              disabled={isReporting || !reportReason.trim()}
            >
              {isReporting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Success Dialog */}
      <Dialog open={reportSuccessOpen} onOpenChange={setReportSuccessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Report Submitted
            </DialogTitle>
            <DialogDescription>
              Thank you for helping keep our community safe. An admin will
              review your report shortly.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setReportSuccessOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CommentItemProps {
  user: string;
  time: string;
  text: string;
  likes: number;
  hasImage: boolean;
  imageUrl?: string | null;
  imageUrls?: string[];
  isOfficial?: boolean;
  currentUserId?: string;
  userAvatar?: string;
  onLike?: () => void;
  onReply?: () => void;
  onReport?: () => void;
  onImageClick?: (url: string) => void;
}

function CommentItem({
  user,
  time,
  text,
  likes,
  hasImage,
  imageUrl,
  imageUrls,
  isOfficial,
  currentUserId,
  userAvatar,
  onLike,
  onReply,
  onReport,
  onImageClick,
}: CommentItemProps) {
  // Combine single legacy image with new array if needed, or prefer array
  const displayImages =
    imageUrls && imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [];
  return (
    <Card className="p-4 shadow-sm border-none">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          {userAvatar && <AvatarImage src={userAvatar} alt={user} />}
          <AvatarFallback>{user.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{user}</span>
              {isOfficial && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  OFFICIAL
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">• {time}</span>
            </div>
          </div>

          <p className="text-sm text-foreground/90 leading-relaxed">{text}</p>

          {hasImage && displayImages.length > 0 && (
            <div
              className={`mt-2 grid gap-2 ${
                displayImages.length > 1 ? "grid-cols-2" : "grid-cols-1"
              } max-w-[400px]`}
            >
              {displayImages.map((url, idx) => (
                <div
                  key={idx}
                  className="rounded-md overflow-hidden aspect-4/3 bg-muted relative border cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onImageClick?.(url)}
                >
                  <img
                    src={url}
                    alt={`Attached evidence ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={onLike}
              className={`text-xs font-medium flex items-center gap-1 transition-colors ${
                currentUserId && likes > 0
                  ? "text-red-500"
                  : "text-muted-foreground hover:text-red-500"
              }`}
            >
              <Heart
                className={`h-3 w-3 ${
                  currentUserId && likes > 0 ? "fill-current" : ""
                }`}
              />{" "}
              {likes}
            </button>
            {currentUserId && (
              <>
                <button
                  onClick={onReply}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <Reply className="h-3 w-3" /> Reply
                </button>
                <button
                  onClick={onReport}
                  className="text-xs font-medium text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors ml-auto"
                >
                  <Flag className="h-3 w-3" /> Report
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
