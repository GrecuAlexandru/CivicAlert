"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Users, Loader2, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ArcgisMap from "./map/map-wrapper";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [mapCenter, setMapCenter] = useState<number[] | undefined>(undefined);

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
          // Check if coordinates and home city are set
          if (
            data.homeCity &&
            data.homeCity.name &&
            data.homeCity.latitude !== 0 &&
            data.homeCity.longitude !== 0
          ) {
            setProfileComplete(true);
            setMapCenter([data.homeCity.longitude, data.homeCity.latitude]);
          } else {
            setProfileComplete(false);
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

        {/* ArcGIS Map */}
        <div className="mt-4">
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
            // If the user is signed in but the coordinates and
            // home city are not set, display the Profile Settings button
            <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
                <AlertTriangle className="h-12 w-12 text-yellow-600 dark:text-yellow-500" />
                <h3 className="text-2xl font-bold text-center">
                  Setup Required
                </h3>
                <p className="text-center text-muted-foreground max-w-md">
                  To view the incidents map, please update your profile with your
                  Home City and Coordinates. This helps us center the map on
                  your community.
                </p>
                <Button size="lg" asChild>
                  <Link href="/profile">Go to Profile Settings</Link>
                </Button>
              </CardContent>
            </Card>
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