"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import {
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  ArrowRight,
  Check,
  Zap,
  Shield,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Performance Tracking",
    description:
      "Real-time analytics for views, likes, comments, and shares across all major platforms.",
  },
  {
    icon: DollarSign,
    title: "Automated Payouts",
    description:
      "Get paid automatically based on your content performance. No more chasing invoices.",
  },
  {
    icon: Users,
    title: "Brand Connections",
    description:
      "Access campaigns from top brands looking for creators like you.",
  },
  {
    icon: BarChart3,
    title: "Detailed Analytics",
    description:
      "Comprehensive dashboards to track your earnings and growth over time.",
  },
];

const platforms = [
  { name: "TikTok", color: "platform-tiktok" },
  { name: "YouTube", color: "platform-youtube" },
  { name: "Instagram", color: "platform-instagram" },
];

const benefits = {
  creators: [
    "Browse and apply to brand campaigns",
    "Track your content performance in real-time",
    "Get paid automatically based on engagement",
    "View detailed earnings analytics",
    "Connect all your social accounts",
  ],
  brands: [
    "Create targeted influencer campaigns",
    "Review and approve creator applications",
    "Track campaign performance metrics",
    "Manage budgets and payouts",
    "Access detailed ROI analytics",
  ],
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background pointer-events-none" />
        <div className="container relative py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              The Future of Creator Monetization
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Get Paid for Your{" "}
              <span className="gradient-text">Social Media</span> Content
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              SocialPay connects content creators with brands, tracks your
              performance, and automates your payouts. Focus on creating while
              we handle the rest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Start Earning <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/signup?type=brand">
                <Button size="lg" variant="outline">
                  I'm a Brand
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex items-center justify-center gap-6">
              {platforms.map((platform) => (
                <div
                  key={platform.name}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${platform.color}`}
                >
                  {platform.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Monetize
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform handles the complex stuff so you can focus on what
              you do best - creating amazing content.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-6 rounded-xl bg-background border hover:border-primary/50 transition-colors"
                >
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Creators */}
            <div className="p-8 rounded-2xl border bg-gradient-to-br from-primary/5 to-background">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                For Creators
              </div>
              <h3 className="text-2xl font-bold mb-4">
                Turn Your Content Into Income
              </h3>
              <p className="text-muted-foreground mb-6">
                Join thousands of creators earning money from their social media
                content. No upfront costs, no hidden fees.
              </p>
              <ul className="space-y-3 mb-6">
                {benefits.creators.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup">
                <Button className="gap-2">
                  Sign Up as Creator <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Brands */}
            <div className="p-8 rounded-2xl border bg-gradient-to-br from-secondary/50 to-background">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4">
                For Brands
              </div>
              <h3 className="text-2xl font-bold mb-4">
                Reach Your Target Audience
              </h3>
              <p className="text-muted-foreground mb-6">
                Create campaigns, connect with authentic creators, and track
                your ROI in real-time.
              </p>
              <ul className="space-y-3 mb-6">
                {benefits.brands.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup?type=brand">
                <Button variant="outline" className="gap-2">
                  Sign Up as Brand <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by Creators & Brands
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              Join a growing community of content creators and brands building
              meaningful partnerships.
            </p>
            <div className="grid sm:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">10K+</div>
                <div className="text-muted-foreground">Active Creators</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">$2M+</div>
                <div className="text-muted-foreground">Paid to Creators</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">500+</div>
                <div className="text-muted-foreground">Brand Partners</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center p-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Join SocialPay today and turn your social media presence into a
              sustainable income stream.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" variant="secondary" className="gap-2">
                  Create Free Account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              <span className="font-bold">SocialPay</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
              <Link href="/support" className="hover:text-foreground">
                Support
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date().getFullYear()} SocialPay. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
