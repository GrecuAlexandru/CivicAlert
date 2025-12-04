"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Users, Loader2, MapPin, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ArcgisMap from "./map/map-wrapper";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [cityName, setCityName] = useState("");
  const [mapCenter, setMapCenter] = useState<number[] | undefined>(undefined);

  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user) {
        setCheckingProfile(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          // Check if coordinates are set
          if (data.homeCity) {
            // If user already set the city name before the coordinates, keep the name
            if (data.homeCity.name) {
              setCityName(data.homeCity.name);
            }

            if (data.homeCity && data.homeCity.latitude !== 0 && data.homeCity.longitude !== 0) {
              setProfileComplete(true);
              setMapCenter([data.homeCity.longitude, data.homeCity.latitude]);
          } else {
              setProfileComplete(false);
          }
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setCheckingProfile(false);
      }
    };

    if (!authLoading) {
      checkUserProfile();
    }
  }, [user, authLoading]);

  const handleSaveLocation = async () => {
    if (!user || !selectedCoords) return;

    setIsSavingLocation(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        homeCity: {
          name: cityName || "Type your city",
          latitude: selectedCoords.latitude,
          longitude: selectedCoords.longitude
        }
      });

      setMapCenter([selectedCoords.longitude, selectedCoords.latitude]);
      setProfileComplete(true);
    } catch (error) {
      console.error("Error saving location:", error);
    } finally {
      setIsSavingLocation(false);
    }
  };

  if (authLoading || (user && checkingProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="px-6 py-4 border-b">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">CivicAlert</h1>
          <div className="flex items-center gap-4">
            {!user ? (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/profile">My Profile</Link>
              </Button>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-bold mb-6">
            Report & Track
            <span className="text-primary"> Civic Issues</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Help improve your community by reporting issues like potholes,
            broken streetlights, or other civic problems. Track their resolution
            in real-time.
          </p>

          {!user && (
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/register">Create Account</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Report Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Easily report civic problems with photos and location. Help
                authorities identify issues faster.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <CardTitle>Track Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Follow the status of your reports from submission to resolution.
                Stay informed every step.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
              <CardTitle>Community Driven</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Join other citizens in making your city better. See what others
                are reporting in your area.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* ArcGIS Map area */}
      <div className="mt-4 px-6 pb-20">
        {!user ? (
          // If the user is not signed in, display message
          <Card className="text-center p-10 bg-muted/50 border-dashed">
            <div className="flex flex-col items-center gap-4">
              <MapPin className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-xl font-semibold">Interactive Map</h3>
              <p className="text-muted-foreground">
                Please log in to access the live incident map.
              </p>
            </div>
          </Card>
        ) : !profileComplete ? (
          // If the user is signed in but the coordinates
          // are not set, display the Profile Settings button
          <div className="max-w-4xl mx-auto">
              <Card className="border-blue-500/50 shadow-lg animate-in fade-in zoom-in duration-500">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle>Select your city</CardTitle>
                      <CardDescription>
                        To see or add reports in your area, click on the map where your city is located.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[500px] w-full rounded-xl overflow-hidden border-2 border-muted relative">
                    {/* Map in selection mode */}
                    <ArcgisMap onLocationSelect={setSelectedCoords} />
                    
                    {/* Instructions that disappear after selection */}
                    {!selectedCoords && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 dark:bg-black/80 backdrop-blur px-4 py-2 rounded-full shadow-sm text-sm font-medium animate-pulse border">
                        Click on the map to select the location
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t pt-6 bg-muted/20">
                  <Button
                    size="lg" 
                    onClick={handleSaveLocation} 
                    disabled={!selectedCoords || isSavingLocation}
                    className={selectedCoords ? "animate-pulse" : ""}
                  >
                    {isSavingLocation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save and continue
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
        ) : (
          // Display the map
          <div className="space-y-4">
            <div className="relative flex items-center justify-center py-2">
              <h3 className="text-2xl font-bold">Live Incidents Map</h3>
            </div>
            <div className="max-w-6xl mx-auto shadow-md rounded-xl overflow-hidden">
              <ArcgisMap center={mapCenter} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 mt-12 border-t">
        <p className="text-center text-muted-foreground">
          © 2024 CivicAlert. University Project.
        </p>
      </footer>
    </div>
  );
}