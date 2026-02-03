"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  Globe,
  Upload,
  Loader2,
  ArrowRight,
  DollarSign,
  CheckCircle,
} from "lucide-react";

const companySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  industry: z.string().min(1, "Please select an industry"),
  company_size: z.string().min(1, "Please select company size"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

const industries = [
  { value: "technology", label: "Technology" },
  { value: "fashion", label: "Fashion & Apparel" },
  { value: "beauty", label: "Beauty & Cosmetics" },
  { value: "food", label: "Food & Beverage" },
  { value: "fitness", label: "Fitness & Wellness" },
  { value: "gaming", label: "Gaming" },
  { value: "entertainment", label: "Entertainment" },
  { value: "finance", label: "Finance" },
  { value: "travel", label: "Travel & Hospitality" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "health", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
];

const companySizes = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501-1000", label: "501-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

export default function BrandOnboardingPage() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: profile?.company_name || "",
      website: "",
      industry: "",
      company_size: "",
      description: "",
    },
  });

  const watchedIndustry = watch("industry");
  const watchedSize = watch("company_size");

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    if (!profile) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Create company record
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .insert({
          user_id: profile.id,
          name: data.name,
          website: data.website || null,
          industry: data.industry,
          company_size: data.company_size,
          description: data.description || null,
          logo_url: logoPreview, // In production, upload to storage first
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Refresh profile to get updated company_id
      await refreshProfile();

      // Redirect to dashboard
      router.push("/dashboard/brand");
    } catch (err: any) {
      console.error("Error creating company:", err);
      setError(err.message || "Failed to create company profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect if not a brand user
  if (profile && profile.user_type !== "brand") {
    router.push("/dashboard/creator");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">SocialPay</span>
          </Link>
        </div>
      </header>

      <div className="container max-w-2xl py-12">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="text-sm font-medium">Company Profile</span>
            </div>
            <div className="h-px w-12 bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="text-sm text-muted-foreground">Create Campaign</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Set Up Your Company Profile</CardTitle>
            <CardDescription>
              Tell us about your company so creators can learn more about your brand.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: Square image, at least 200x200px
                    </p>
                  </div>
                </div>
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  placeholder="Acme Inc."
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website">Company Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    placeholder="https://example.com"
                    className="pl-10"
                    {...register("website")}
                  />
                </div>
                {errors.website && (
                  <p className="text-sm text-destructive">{errors.website.message}</p>
                )}
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <Label>Industry *</Label>
                <Select
                  value={watchedIndustry}
                  onValueChange={(value) => setValue("industry", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.industry && (
                  <p className="text-sm text-destructive">{errors.industry.message}</p>
                )}
              </div>

              {/* Company Size */}
              <div className="space-y-2">
                <Label>Company Size *</Label>
                <Select
                  value={watchedSize}
                  onValueChange={(value) => setValue("company_size", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {companySizes.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.company_size && (
                  <p className="text-sm text-destructive">{errors.company_size.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Company Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell creators about your brand, products, and what you're looking for..."
                  rows={4}
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  This will be shown to creators when they view your campaigns.
                </p>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Continue to Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Benefits reminder */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Reach Creators</p>
              <p className="text-xs text-muted-foreground">Connect with thousands of content creators</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Track Performance</p>
              <p className="text-xs text-muted-foreground">Real-time analytics and insights</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Automated Payouts</p>
              <p className="text-xs text-muted-foreground">Pay creators based on performance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
