"use client";

import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, AlertCircle, LogOut, Home } from "lucide-react";

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string;
  role: string;
  homeCity: {
    name: string;
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
}

export default function ProfilePage() {
  const { user, role, loading, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleUpload = async () => {
    if (file && user) {
      setIsUploading(true);
      setError("");
      try {
        const storageRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", user.uid), { photoUrl: url });
        setProfile((prev) => (prev ? { ...prev, photoUrl: url } : null));
        setFile(null);
        setMessage("Avatar updated successfully!");
        setTimeout(() => setMessage(""), 3000);
      } catch (err) {
        console.error("Upload error:", err);
        setError("Failed to upload avatar.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    setIsSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: profile.displayName,
        homeCity: profile.homeCity,
      });
      setMessage("Profile saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "police":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">My Profile</CardTitle>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
                
                <Button variant="destructive" size="sm" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>

            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {message && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.photoUrl} alt="Avatar" />
                <AvatarFallback className="text-2xl">
                  {profile.displayName?.charAt(0).toUpperCase() ||
                    profile.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-lg font-semibold">
                  {profile.displayName || "No name set"}
                </p>
                <p className="text-muted-foreground">{profile.email}</p>
                <Badge variant={getRoleBadgeVariant(role)} className="mt-2">
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Avatar Upload */}
            <div className="space-y-2">
              <Label>Update Avatar</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                <Button
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  size="sm"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={profile.displayName}
                onChange={(e) =>
                  setProfile({ ...profile, displayName: e.target.value })
                }
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="homeCity">Home City</Label>
              <Input
                id="homeCity"
                type="text"
                value={profile.homeCity?.name || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    homeCity: { ...profile.homeCity, name: e.target.value },
                  })
                }
                placeholder="Enter your city"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={profile.homeCity?.latitude || 0}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      homeCity: {
                        ...profile.homeCity,
                        latitude: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={profile.homeCity?.longitude || 0}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      homeCity: {
                        ...profile.homeCity,
                        longitude: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
