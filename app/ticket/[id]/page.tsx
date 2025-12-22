"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Calendar, MessageSquare, ThumbsUp, Share2, MoreHorizontal, Send, Image as ImageIcon, Heart, Reply } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

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

export default function TicketPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

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
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Anonymous User</span>
              <span className="text-xs text-muted-foreground">
                {ticket.createdAt?.toDate
                  ? ticket.createdAt.toDate().toLocaleDateString()
                  : "Just now"} • {ticket.category}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
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
              <div className={`grid gap-2 ${ticket.imageUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {ticket.imageUrls.map((url, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border bg-muted/20 aspect-[4/3] group cursor-pointer">
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
                 {ticket.location.latitude.toFixed(5)}, {ticket.location.longitude.toFixed(5)}
               </span>
            </div>
          </CardContent>

          <Separator />

          {/* Interaction Bar */}
          <CardFooter className="p-2 flex justify-between items-center bg-muted/5">
             <div className="flex items-center gap-1">
               <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                 <ThumbsUp className="h-4 w-4" /> 
                 <span className="text-xs font-medium">{ticket.votes?.length || 0} Upvotes</span>
               </Button>
               <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-blue-500">
                 <MessageSquare className="h-4 w-4" />
                 <span className="text-xs font-medium">12 Comments</span>
               </Button>
             </div>
             <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <Share2 className="h-4 w-4" />
                <span className="text-xs font-medium">Share</span>
             </Button>
          </CardFooter>
        </Card>

        {/* Comment Section */}
        <div className="space-y-4">
           {/* Input */}
           <Card className="p-4 flex gap-3 shadow-sm border-none">
              <Avatar className="h-8 w-8">
                <AvatarFallback>ME</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                 <Textarea 
                   placeholder="Add to the discussion..." 
                   className="min-h-[80px] bg-muted/20 border-transparent focus:border-input resize-none"
                   value={commentText}
                   onChange={(e) => setCommentText(e.target.value)}
                 />
                 <div className="flex justify-between items-center">
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <ImageIcon className="h-4 w-4 mr-2" /> Add Photo
                    </Button>
                    <Button size="sm" disabled={!commentText.trim()}>
                        Post Comment <Send className="ml-2 h-3 w-3" />
                    </Button>
                 </div>
              </div>
           </Card>

           {/* Dummy Comments Feed */}
           <div className="space-y-3 pb-10">
              <CommentItem 
                user="Maria D." 
                time="2 hours ago" 
                text="I noticed this too! It's been like this for a week. Really dangerous for cyclists."
                likes={5}
              />
              <CommentItem 
                user="Alex C." 
                time="5 hours ago" 
                text="Submitted a similar report nearby. Hopefully they fix it soon."
                likes={2}
                hasImage
              />
              <CommentItem 
                user="Local Council" 
                time="1 day ago" 
                text="Thank you for the report. This has been flagged for inspection."
                likes={12}
                isOfficial
              />
           </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ user, time, text, likes, hasImage, isOfficial }: any) {
    return (
        <Card className="p-4 shadow-sm border-none">
            <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarFallback>{user.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{user}</span>
                            {isOfficial && <Badge variant="secondary" className="text-[10px] h-4 px-1">OFFICIAL</Badge>}
                            <span className="text-xs text-muted-foreground">• {time}</span>
                        </div>
                    </div>
                    
                    <p className="text-sm text-foreground/90 leading-relaxed">{text}</p>
                    
                    {hasImage && (
                        <div className="mt-2 rounded-md overflow-hidden h-32 w-48 bg-muted relative">
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                                Evidence.jpg
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-4 pt-2">
                        <button className="text-xs font-medium text-muted-foreground hover:text-red-500 flex items-center gap-1 transition-colors">
                            <Heart className="h-3 w-3" /> {likes}
                        </button>
                        <button className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                            <Reply className="h-3 w-3" /> Reply
                        </button>
                    </div>
                </div>
            </div>
        </Card>
    )
}
