"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import {
  Menu,
  X,
  LayoutDashboard,
  Settings,
  LogOut,
  User,
  Megaphone,
  DollarSign,
  Bell,
} from "lucide-react";
import { useState } from "react";

export function Header() {
  const { user, profile, signOut, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDashboardLink = () => {
    if (profile?.user_type === "brand") {
      return "/dashboard/brand";
    }
    return "/dashboard/creator";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <DollarSign className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">SocialPay</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {user && profile && (
              <>
                <Link
                  href={getDashboardLink()}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Dashboard
                </Link>
                <Link
                  href="/campaigns"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Campaigns
                </Link>
                {profile.user_type === "creator" && (
                  <Link
                    href="/earnings"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    Earnings
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          ) : user && profile ? (
            <>
              {/* Notification Bell */}
              <div className="hidden md:block">
                <NotificationDropdown />
              </div>

              {/* Desktop User Menu */}
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={profile.profile_image || undefined}
                          alt={profile.full_name}
                        />
                        <AvatarFallback>
                          {getInitials(profile.full_name || "U")}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {profile.full_name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {profile.email}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground capitalize">
                          {profile.user_type}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={getDashboardLink()}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/signin">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && user && profile && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-4 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={profile.profile_image || undefined}
                  alt={profile.full_name}
                />
                <AvatarFallback>
                  {getInitials(profile.full_name || "U")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile.user_type}
                </p>
              </div>
            </div>
            <nav className="flex flex-col gap-2">
              <Link
                href={getDashboardLink()}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Link>
              <Link
                href="/campaigns"
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Megaphone className="h-5 w-5" />
                Campaigns
              </Link>
              {profile.user_type === "creator" && (
                <Link
                  href="/earnings"
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <DollarSign className="h-5 w-5" />
                  Earnings
                </Link>
              )}
              <Link
                href="/profile"
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="h-5 w-5" />
                Profile
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="h-5 w-5" />
                Settings
              </Link>
              <button
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-destructive"
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="h-5 w-5" />
                Log out
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
