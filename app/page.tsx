import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Users } from "lucide-react";

import ArcgisMap from "./map/map-wrapper";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="px-6 py-4 border-b">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">CivicAlert</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
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

          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/register">Create Account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
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

        {/* Harta ArcGIS */}
        <div className="mt-24">
          <ArcgisMap />
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 mt-12 border-t">
        <p className="text-center text-muted-foreground">
          © 2024 CivicAlert. University Project.
        </p>
      </footer>
    </div>
  );
}
