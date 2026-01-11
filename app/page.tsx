"use client";

import { useState, useEffect } from "react";
import MapWrapper from "@/app/map/map-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import {
  Plus,
  Search,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Menu,
  X,
  ArrowUpDown,
  Camera,
  ImageIcon,
  Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";
import { NotificationBell } from "@/components/NotificationBell";
import { notifyNewComment } from "@/lib/notifications";

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
  likes: string[];
  dislikes: string[];
  createdAt: Timestamp;
}

interface Comment {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  text: string;
  imageUrl?: string;
  createdAt: Timestamp;
}

// Haversine distance to calculate the distance between 2 points for displaying nearby tickets
function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371; // The radius of the Earth
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export default function Home() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<number[] | undefined>(undefined);

  // User data and tickets State
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("citizen");
  const [userHomeLocation, setUserHomeLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Selected ticket for displaying informations state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Filter state
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'mine', 'nearby'
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Reporting State
  const [isReporting, setIsReporting] = useState(false);
  const [reportLocation, setReportLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Location Setting State
  const [isSettingLocation, setIsSettingLocation] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [cityName, setCityName] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Comments State
  const [viewingTicketForComments, setViewingTicketForComments] =
    useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentPhoto, setNewCommentPhoto] = useState<File | null>(null);
  const [isSendingComment, setIsSendingComment] = useState(false);

  // If user signs out, reset tab to All to avoid gated views
  useEffect(() => {
    if (!user && activeTab !== "all") {
      setActiveTab("all");
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));

          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role) {
              setUserRole(data.role);
            }
            if (data.photoUrl) {
              setUserPhoto(data.photoUrl);
            }

            // Check if homeCity is missing or empty (handles both string and object formats)
            const hasHomeCity =
              data.homeCity &&
              (typeof data.homeCity === "string"
                ? data.homeCity.length > 0
                : data.homeCity.name?.length > 0);

            if (!hasHomeCity) {
              console.log("User has no home city, triggering setup");
              setIsSettingLocation(true);
              setSidebarOpen(false);
            } else if (
              data.homeCity &&
              typeof data.homeCity === "object" &&
              data.homeCity.latitude &&
              data.homeCity.longitude
            ) {
              // Set map center and user's home city
              setMapCenter([data.homeCity.longitude, data.homeCity.latitude]);
              setUserHomeLocation({
                latitude: data.homeCity.latitude,
                longitude: data.homeCity.longitude,
              });
            }
          }

          // Try to get the name of the user to use when sending comments
          let userName = "";

          if (!userName && user.email) {
            userName = user.email.split("@")[0];
          }

          setUserName(userName || "User");
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };
      fetchUserData();
    }
  }, [user]);

  // Fetch tickets
  useEffect(() => {
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTickets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Ticket[];
      setTickets(fetchedTickets);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (viewingTicketForComments) {
      const q = query(
        collection(db, "tickets", viewingTicketForComments.id, "comments"),
        orderBy("createdAt", "asc")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedComments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Comment[];
        setComments(fetchedComments);
      });
      return () => unsubscribe();
    } else {
      setComments([]);
    }
  }, [viewingTicketForComments]);

  const handleVote = async (
    e: React.MouseEvent,
    ticket: Ticket,
    type: "like" | "dislike"
  ) => {
    e.stopPropagation();
    if (!user) return;

    const ticketRef = doc(db, "tickets", ticket.id);
    const uid = user.uid;

    try {
      if (type === "like") {
        if (ticket.likes?.includes(uid)) {
          await updateDoc(ticketRef, { likes: arrayRemove(uid) });
        } else {
          await updateDoc(ticketRef, {
            likes: arrayUnion(uid),
            dislikes: arrayRemove(uid),
          });
        }
      } else {
        if (ticket.dislikes?.includes(uid)) {
          await updateDoc(ticketRef, { dislikes: arrayRemove(uid) });
        } else {
          await updateDoc(ticketRef, {
            dislikes: arrayUnion(uid),
            likes: arrayRemove(uid),
          });
        }
      }
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  const handlePostComment = async () => {
    if (
      !user ||
      !viewingTicketForComments ||
      (!newCommentText && !newCommentPhoto)
    )
      return;

    setIsSendingComment(true);
    try {
      let imageUrl = null;
      if (newCommentPhoto) {
        const imageRef = ref(storage, `comment-images/${uuidv4()}`);
        await uploadBytes(imageRef, newCommentPhoto);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(
        collection(db, "tickets", viewingTicketForComments.id, "comments"),
        {
          userId: user.uid,
          userName: userName || user.email?.split("@")[0] || "Anonymous",
          userAvatar: userPhoto || user.photoURL,
          text: newCommentText,
          imageUrl: imageUrl,
          createdAt: serverTimestamp(),
        }
      );

      // Notify ticket owner about the new comment
      if (viewingTicketForComments.userId !== user.uid) {
        await notifyNewComment({
          ticketOwnerId: viewingTicketForComments.userId,
          ticketId: viewingTicketForComments.id,
          commenterName: userName || user.email?.split("@")[0] || "Someone",
          commenterId: user.uid,
        });
      }

      setNewCommentText("");
      setNewCommentPhoto(null);
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleStartReporting = () => {
    setIsReporting(true);
    setSidebarOpen(false); // Close sidebar to give full view of map
  };

  const handleLocationSelect = (coords: {
    latitude: number;
    longitude: number;
  }) => {
    setReportLocation(coords);

    if (isReporting) {
      setIsReporting(false);
      setReportModalOpen(true);
      setSidebarOpen(true);
    } else if (isSettingLocation) {
      setIsSettingLocation(false);
      setLocationModalOpen(true);
    }
  };

  const handleCancelReporting = () => {
    setIsReporting(false);
    setSidebarOpen(true);
  };

  const handleSaveLocation = async () => {
    if (!user || !reportLocation || !cityName) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        homeCity: {
          name: cityName,
          latitude: reportLocation.latitude,
          longitude: reportLocation.longitude,
        },
      });
      setLocationModalOpen(false);
      setSidebarOpen(true);
      console.log("Home location set successfully");
    } catch (error) {
      console.error("Error setting home location:", error);
    }
  };

  const handleSubmitReport = async () => {
    if (!user) {
      setFormError("Please sign in to submit a report.");
      return;
    }

    if (!reportLocation) {
      setFormError("Select a location on the map first.");
      return;
    }

    if (!category) {
      setFormError("Select a category to continue.");
      return;
    }

    if (!description.trim()) {
      setFormError("Add a short description of the issue.");
      return;
    }

    setFormError(null);

    setIsSubmitting(true);

    try {
      const imageUrls: string[] = [];

      if (photoFiles.length > 0) {
        await Promise.all(
          photoFiles.map(async (file) => {
            const imageRef = ref(storage, `ticket-images/${uuidv4()}`);
            await uploadBytes(imageRef, file);
            const url = await getDownloadURL(imageRef);
            imageUrls.push(url);
          })
        );
      }

      await addDoc(collection(db, "tickets"), {
        userId: user.uid,
        category,
        description,
        status: "pending",
        location: {
          latitude: reportLocation.latitude,
          longitude: reportLocation.longitude,
        },
        imageUrls,
        votes: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Reset form
      setTitle("");
      setCategory("");
      setDescription("");
      setPhotoFiles([]);
      setReportModalOpen(false);

      // Keep location selection for future submissions
      setReportLocation(null);

      // Ideally show a success toast here
      console.log("Ticket reported successfully");
    } catch (error) {
      console.error("Error reporting ticket:", error);
      setFormError("Could not submit the report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter tickets
  const getFilteredTickets = () => {
    return tickets.filter((ticket) => {
      let matchesTab = true;
      if (activeTab === "mine") {
        matchesTab = user ? ticket.userId === user.uid : false;
      } else if (activeTab === "nearby") {
        if (!userHomeLocation) matchesTab = true;
        else {
          const dist = getDistanceFromLatLonInKm(
            userHomeLocation.latitude,
            userHomeLocation.longitude,
            ticket.location.latitude,
            ticket.location.longitude
          );
          matchesTab = dist <= 10;
        }
      }

      let matchesCategory = true;
      if (selectedCategory) {
        matchesCategory = ticket.category === selectedCategory;
      }

      return matchesTab && matchesCategory;
    });
  };

  const filteredTickets = getFilteredTickets();

  const toggleCategory = (cat: string) => {
    if (selectedCategory === cat) setSelectedCategory(null);
    else setSelectedCategory(cat);
  };

  const handleTicketClick = (ticket: Ticket) => {
    if (selectedTicket?.id === ticket.id) {
      // If the ticket is already selected, deselect the ticket
      setSelectedTicket(null);
    } else {
      setSelectedTicket(ticket);
      setMapCenter([ticket.location.longitude, ticket.location.latitude]);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative">
      {/* Sidebar */}
      <aside
        className={`
          absolute md:relative z-20 h-full bg-card border-r shadow-xl transition-all duration-300 ease-in-out flex flex-col
          ${
            sidebarOpen
              ? "w-full md:w-96 translate-x-0"
              : "w-0 -translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden"
          }
        `}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">CivicAlert</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && <NotificationBell />}
            {user ? (
              <Link href="/profile">
                <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition ring-2 ring-background">
                  <AvatarImage src={userPhoto || user.photoURL || ""} />
                  <AvatarFallback>
                    {user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="sm" variant="outline">
                  Login
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Admin Dashboard */}
        {userRole === 'admin' && (
          <div className="px-4 pt-4">
            <Link href="/admin">
              <Button variant="destructive" className="w-full gap-2 font-bold shadow-sm">
                Admin Dashboard
              </Button>
            </Link>
          </div>
        )}

        {/* Feed Controls */}
        <div className="p-4 space-y-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search incidents..." className="pl-9" />
          </div>

          <Tabs
            defaultValue="all"
            value={activeTab}
            className="w-full"
            onValueChange={setActiveTab}
          >
            <TabsList
              className={`w-full ${
                user ? "grid grid-cols-3" : "grid grid-cols-1"
              }`}
            >
              <TabsTrigger value="all">All</TabsTrigger>
              {user && <TabsTrigger value="mine">Mine</TabsTrigger>}
              {user && <TabsTrigger value="nearby">Nearby</TabsTrigger>}
            </TabsList>
          </Tabs>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
              <Badge
                variant={
                  selectedCategory === "infrastructure"
                    ? "secondary"
                    : "outline"
                }
                className="cursor-pointer whitespace-nowrap"
                onClick={() => toggleCategory("infrastructure")}
              >
                Infrastructure
              </Badge>
              <Badge
                variant={
                  selectedCategory === "safety" ? "secondary" : "outline"
                }
                className="cursor-pointer whitespace-nowrap"
                onClick={() => toggleCategory("safety")}
              >
                Safety
              </Badge>
              <Badge
                variant={
                  selectedCategory === "environment" ? "secondary" : "outline"
                }
                className="cursor-pointer whitespace-nowrap"
                onClick={() => toggleCategory("environment")}
              >
                Environment
              </Badge>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Newest First</DropdownMenuItem>
                <DropdownMenuItem>Most Voted</DropdownMenuItem>
                <DropdownMenuItem>Most Discussed</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>No tickets found.</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <Card
                key={ticket.id}
                onClick={() => handleTicketClick(ticket)}
                className={`cursor-pointer hover:shadow-lg transition-all duration-200 border overflow-hidden group ${
                  selectedTicket?.id === ticket.id
                    ? "ring-2 ring-black border-transparent"
                    : ""
                }`}
              >
                {/* Ticket image */}
                {ticket.imageUrls && ticket.imageUrls.length > 0 && (
                  <div className="relative h-40 w-full overflow-hidden bg-muted">
                    <img
                      src={ticket.imageUrls[0]}
                      alt="Ticket evidence"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {ticket.imageUrls.length}
                    </div>
                  </div>
                )}

                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary">
                      {ticket.category.charAt(0).toUpperCase() +
                        ticket.category.slice(1)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {ticket.createdAt?.toDate
                        ? ticket.createdAt.toDate().toLocaleDateString()
                        : "Recent"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg leading-tight mb-1">
                      {ticket.title || "Incident Reported"}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ticket.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t mt-1">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <button
                        onClick={(e) => handleVote(e, ticket, "like")}
                        className={`flex items-center gap-1 hover:text-green-600 transition-colors ${
                          ticket.likes?.includes(user?.uid || "")
                            ? "text-green-600 font-bold"
                            : ""
                        }`}
                      >
                        <ThumbsUp className="h-3 w-3" />{" "}
                        {ticket.likes?.length || 0}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingTicketForComments(ticket);
                        }}
                        className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                      >
                        <MessageSquare className="h-3 w-3" /> Comments
                      </button>
                    </div>

                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal px-1 py-0"
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-card shrink-0">
          {user ? (
            <Button
              className="w-full gap-2 shadow-lg hover:shadow-xl transition-all"
              size="lg"
              onClick={handleStartReporting}
            >
              <Plus className="h-5 w-5" /> Report New Incident
            </Button>
          ) : (
            <Link href="/login">
              <Button className="w-full gap-2" size="lg" variant="outline">
                <Plus className="h-5 w-5" /> Sign in to report
              </Button>
            </Link>
          )}
        </div>
      </aside>

      {/* Map Area */}
      <main className="flex-1 relative h-full w-full">
        {/* Toggle Button */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="secondary"
            size="icon"
            className="shadow-md bg-background/90 backdrop-blur-sm hover:bg-background"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Reporting Overlay Instructions */}
        {(isReporting || isSettingLocation) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-background/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-4">
            <p className="font-semibold">
              {isSettingLocation
                ? "Click on the map to set your home location"
                : "Click on the map to select the incident location"}
            </p>
            {isReporting && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelReporting}
              >
                Cancel
              </Button>
            )}
          </div>
        )}

        {/* Map Component */}
        <div className="h-full w-full">
          <MapWrapper
            className="h-full w-full"
            isSelecting={isReporting || isSettingLocation}
            onLocationSelect={handleLocationSelect}
            center={mapCenter}
            tickets={tickets}
            userHomeLocation={userHomeLocation}
            selectedTicketId={selectedTicket?.id}
          />
        </div>
      </main>

      {/* Report Incident Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Report New Incident</DialogTitle>
            <DialogDescription>
              Provide details about the issue you observed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Large Pothole"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="safety">Public Safety</SelectItem>
                  <SelectItem value="environment">Environment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the issue in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="photos">Photos</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setPhotoFiles(Array.from(e.target.files));
                    }
                  }}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById("photos")?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />{" "}
                  {photoFiles.length > 0
                    ? `${photoFiles.length} Photo${
                        photoFiles.length > 1 ? "s" : ""
                      } Selected`
                    : "Upload Photos"}
                </Button>
              </div>
            </div>
            {reportLocation && (
              <div className="text-xs text-muted-foreground">
                Location selected: {reportLocation.latitude.toFixed(6)},{" "}
                {reportLocation.longitude.toFixed(6)}
              </div>
            )}

            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReportModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReport}
              disabled={
                isSubmitting ||
                !category ||
                !description.trim() ||
                !reportLocation
              }
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Location Modal */}
      <Dialog open={locationModalOpen} onOpenChange={setLocationModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Set Home Location</DialogTitle>
            <DialogDescription>
              Please name your selected location to finish setting up your
              profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cityName">City / Location Name</Label>
              <Input
                id="cityName"
                placeholder="e.g., Bucharest, Home"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
              />
            </div>
            {reportLocation && (
              <div className="text-xs text-muted-foreground">
                Coordinates: {reportLocation.latitude.toFixed(6)},{" "}
                {reportLocation.longitude.toFixed(6)}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveLocation} disabled={!cityName}>
              Save Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <Dialog
        open={!!viewingTicketForComments}
        onOpenChange={(open) => !open && setViewingTicketForComments(null)}
      >
        <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="p-4 border-b shrink-0 bg-background z-10">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {viewingTicketForComments?.title || "Incident Details"}
              </DialogTitle>
              <DialogDescription className="text-xs line-clamp-2">
                {viewingTicketForComments?.description}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
            {comments.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">
                No comments yet.
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="h-6 w-6 mt-1">
                    <AvatarImage src={c.userAvatar} />
                    <AvatarFallback>
                      {c.userName?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-card border rounded-md p-2 shadow-sm text-sm flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-xs">
                        {c.userName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {c.createdAt?.toDate
                          ? c.createdAt.toDate().toLocaleString()
                          : ""}
                      </span>
                    </div>
                    <p className="text-xs">{c.text}</p>
                    {c.imageUrl && (
                      <img
                        src={c.imageUrl}
                        alt="Attachment"
                        className="mt-2 rounded-md max-h-32 border object-cover"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-card border-t mt-auto flex flex-col gap-2">
            {newCommentPhoto && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-xs w-fit">
                <ImageIcon className="h-3 w-3" />
                <span className="truncate max-w-[150px]">
                  {newCommentPhoto.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-destructive/20"
                  onClick={() => setNewCommentPhoto(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            <div className="flex gap-2 items-center">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() =>
                  document.getElementById("comment-photo-input")?.click()
                }
              >
                <Camera className="h-4 w-4" />
              </Button>
              <Input
                id="comment-photo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && setNewCommentPhoto(e.target.files[0])
                }
              />

              <Input
                className="h-9 text-sm"
                placeholder="Write a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                disabled={isSendingComment}
              />

              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handlePostComment}
                disabled={
                  isSendingComment ||
                  (!newCommentText.trim() && !newCommentPhoto)
                }
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
