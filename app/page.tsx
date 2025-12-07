"use client";

import { useState, useEffect } from "react";
import MapWrapper from "@/app/map/map-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MessageSquare,
  Menu,
  X,
  ArrowUpDown,
  Camera,
  ImageIcon,
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
  GeoPoint,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";

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
  createdAt: any;
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

  // Tickets and user data
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
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
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };
      fetchUserData();
    }
  }, [user]);

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
    if (!user || !reportLocation || !category) return;

    setIsSubmitting(true);

    try {
      const imageUrls: string[] = [];

      if (photoFile) {
        const imageRef = ref(storage, `ticket-images/${uuidv4()}`);
        await uploadBytes(imageRef, photoFile);
        const url = await getDownloadURL(imageRef);
        imageUrls.push(url);
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
      setPhotoFile(null);
      setReportModalOpen(false);

      // Ideally show a success toast here
      console.log("Ticket reported successfully");
    } catch (error) {
      console.error("Error reporting ticket:", error);
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

      // For mobile usage, close the menu with the tickets
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
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

        {/* Feed Controls */}
        <div className="p-4 space-y-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search incidents..." className="pl-9" />
          </div>

          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="mine">Mine</TabsTrigger>
              <TabsTrigger value="nearby">Nearby</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
              <Badge
                variant={selectedCategory === "infrastructure" ? "secondary" : "outline"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => toggleCategory("infrastructure")}
              >
                Infrastructure
              </Badge>
              <Badge
                variant={selectedCategory === "safety" ? "secondary" : "outline"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => toggleCategory("safety")}
              >
                Safety
              </Badge>
              <Badge
                variant={selectedCategory === "environment" ? "secondary" : "outline"}
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
                  selectedTicket?.id === ticket.id ? "ring-2 ring-black border-transparent" : ""
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
                      {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'Recent'}
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

                  <div className="flex items-center justify-between pt-2 border-t mt-2">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 hover:text-primary transition-colors">
                        <ThumbsUp className="h-3 w-3" /> {ticket.votes?.length || 0}
                      </div>
                      <div className="flex items-center gap-1 hover:text-primary transition-colors">
                        <MessageSquare className="h-3 w-3" /> 0
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs font-normal">
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
          <Button
            className="w-full gap-2 shadow-lg hover:shadow-xl transition-all"
            size="lg"
            onClick={handleStartReporting}
          >
            <Plus className="h-5 w-5" /> Report New Incident
          </Button>
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
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPhotoFile(e.target.files[0]);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById("photos")?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />{" "}
                  {photoFile ? "Photo Selected" : "Upload Photo"}
                </Button>
              </div>
            </div>
            {reportLocation && (
              <div className="text-xs text-muted-foreground">
                Location selected: {reportLocation.latitude.toFixed(6)},{" "}
                {reportLocation.longitude.toFixed(6)}
              </div>
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
            <Button onClick={handleSubmitReport} disabled={isSubmitting}>
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
    </div>
  );
}
