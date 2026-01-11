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
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Trash2,
  ArrowLeft,
  CheckCheck,
  AlertCircle,
  Flag,
} from "lucide-react";
import Link from "next/link";

interface Ticket {
  id: string;
  userId: string;
  title?: string;
  description: string;
  status: string;
  category: string;
  imageUrls: string[];
  createdAt: Timestamp;
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

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

  // Fetch all tickets
  useEffect(() => {
    if (isAdmin) {
      const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedTickets = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Ticket[];
        setTickets(fetchedTickets);
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "tickets", ticketId), {
        status: newStatus,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating ticket status:", error);
      alert("Couldn't update status. Check permissions");
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (confirm("Are you sure you want to delete this ticket?")) {
      try {
        await deleteDoc(doc(db, "tickets", ticketId));
      } catch (error) {
        console.error("Error deleting ticket:", error);
        alert("Couldn't delete the ticket.");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
      case "approved":
        return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "resolved":
        return "bg-green-500/10 text-green-600 border-green-200";
      case "rejected":
        return "bg-red-500/10 text-red-600 border-red-200";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (loading || checkingRole) {
    return (
      <div className="flex h-screen items-center justify-center">
        Checking permissions...
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
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
          </div>
          <div className="text-sm text-muted-foreground">
            Number of Tickets: {tickets.length}
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/moderation">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-destructive/20 hover:border-destructive/40">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Flag className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Moderation Panel</h3>
                  <p className="text-sm text-muted-foreground">
                    Review reported comments and images
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* List with tickets */}
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Image(if it exists) */}
                {ticket.imageUrls && ticket.imageUrls.length > 0 && (
                  <div className="w-full md:w-48 h-32 md:h-auto bg-muted shrink-0">
                    <img
                      src={ticket.imageUrls[0]}
                      alt="Ticket"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 p-6 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Badge variant="outline" className="mb-2">
                          {ticket.category}
                        </Badge>
                        <h3 className="font-bold text-lg">
                          {ticket.title || "Fără titlu"}
                        </h3>
                      </div>
                      <Badge
                        className={`capitalize ${getStatusColor(
                          ticket.status
                        )}`}
                        variant="outline"
                      >
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="text-xs text-muted-foreground mt-2">
                      Created at:{" "}
                      {ticket.createdAt?.toDate
                        ? ticket.createdAt.toDate().toLocaleString()
                        : "N/A"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t mt-2">
                    {/* Buttons for status change */}
                    {ticket.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() =>
                            handleStatusChange(ticket.id, "approved")
                          }
                        >
                          <CheckCircle className="h-4 w-4 mr-2" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleStatusChange(ticket.id, "rejected")
                          }
                        >
                          <XCircle className="h-4 w-4 mr-2" /> Reject
                        </Button>
                      </>
                    )}

                    {ticket.status === "approved" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() =>
                          handleStatusChange(ticket.id, "resolved")
                        }
                      >
                        <CheckCheck className="h-4 w-4 mr-2" /> Mark as Resolved
                      </Button>
                    )}

                    {/* Button for status reset */}
                    {(ticket.status === "resolved" ||
                      ticket.status === "rejected") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(ticket.id, "pending")}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" /> Reopen
                      </Button>
                    )}

                    {/* Delete Button */}
                    <div className="ml-auto">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteTicket(ticket.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete permanently
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
