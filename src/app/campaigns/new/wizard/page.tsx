"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  DollarSign,
  Loader2,
  Megaphone,
  Target,
  Users,
  Zap,
  Plus,
  Trash2,
  Upload,
  FileText,
  ImageIcon,
  AlertCircle,
  Calculator,
  Eye,
} from "lucide-react";
import type { PayoutModel, CreatorNiche } from "@/types/database";

// Zod schemas for each step
const step1Schema = z.object({
  title: z.string().min(5, "Campaign name must be at least 5 characters").max(100),
  brief_description: z.string().min(20, "Description must be at least 20 characters").max(500),
  key_talking_points: z.array(z.object({ value: z.string() })).refine(
    (points) => points.some(p => p.value.trim().length > 0),
    "Add at least one talking point"
  ),
  dos: z.array(z.object({ value: z.string() })),
  donts: z.array(z.object({ value: z.string() })),
  call_to_action: z.string().min(5, "Call to action is required").max(200),
});

const step2Schema = z.object({
  platforms: z.array(z.string()).min(1, "Select at least one platform"),
  target_niche: z.string().min(1, "Select a creator niche"),
  follower_range: z.array(z.number()).length(2),
});

const step3Schema = z.object({
  payout_model: z.enum(["base_performance", "performance_only", "fixed"]),
  payout_base_rate: z.number().min(0),
  payout_performance_rate: z.number().min(0),
  payout_max_per_creator: z.number().min(1, "Maximum payout is required"),
  total_budget: z.number().min(100, "Minimum budget is $100"),
});

const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema);

type CampaignFormData = z.infer<typeof fullSchema>;

const steps = [
  { id: 1, name: "Campaign Brief", icon: FileText },
  { id: 2, name: "Target Creators", icon: Users },
  { id: 3, name: "Budget & Payouts", icon: DollarSign },
  { id: 4, name: "Review & Launch", icon: Zap },
];

const platforms = [
  { id: "tiktok", name: "TikTok", color: "bg-black", icon: "TT" },
  { id: "youtube", name: "YouTube", color: "bg-red-600", icon: "YT" },
  { id: "instagram", name: "Instagram", color: "bg-gradient-to-br from-purple-600 to-pink-500", icon: "IG" },
];

const niches: { value: CreatorNiche; label: string }[] = [
  { value: "gaming", label: "Gaming" },
  { value: "beauty", label: "Beauty & Cosmetics" },
  { value: "tech", label: "Technology" },
  { value: "food", label: "Food & Cooking" },
  { value: "fitness", label: "Fitness & Health" },
  { value: "fashion", label: "Fashion & Style" },
  { value: "travel", label: "Travel" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "comedy", label: "Comedy & Entertainment" },
  { value: "education", label: "Education" },
  { value: "music", label: "Music" },
  { value: "other", label: "Other" },
];

const followerMarks = [
  { value: 0, label: "1K" },
  { value: 25, label: "10K" },
  { value: 50, label: "100K" },
  { value: 75, label: "500K" },
  { value: 100, label: "1M+" },
];

const sliderToFollowers = (value: number): number => {
  if (value <= 25) return 1000 + (value / 25) * 9000;
  if (value <= 50) return 10000 + ((value - 25) / 25) * 90000;
  if (value <= 75) return 100000 + ((value - 50) / 25) * 400000;
  return 500000 + ((value - 75) / 25) * 500000;
};

const formatFollowers = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

export default function CampaignWizardPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    trigger,
    formState: { errors },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      title: "",
      brief_description: "",
      key_talking_points: [{ value: "" }],
      dos: [{ value: "" }],
      donts: [{ value: "" }],
      call_to_action: "",
      platforms: [],
      target_niche: "",
      follower_range: [25, 75], // 10K to 500K default
      payout_model: "base_performance",
      payout_base_rate: 50,
      payout_performance_rate: 5,
      payout_max_per_creator: 500,
      total_budget: 5000,
    },
    mode: "onChange",
  });

  const { fields: talkingPointFields, append: appendTalkingPoint, remove: removeTalkingPoint } =
    useFieldArray({ control, name: "key_talking_points" });

  const { fields: dosFields, append: appendDo, remove: removeDo } =
    useFieldArray({ control, name: "dos" });

  const { fields: dontsFields, append: appendDont, remove: removeDont } =
    useFieldArray({ control, name: "donts" });

  const formValues = watch();

  // Calculate budget estimates
  const minFollowers = Math.round(sliderToFollowers(formValues.follower_range[0]));
  const maxFollowers = Math.round(sliderToFollowers(formValues.follower_range[1]));

  const calculatePayout = (views: number): number => {
    const { payout_model, payout_base_rate, payout_performance_rate, payout_max_per_creator } = formValues;
    let payout = 0;

    if (payout_model === "fixed") {
      payout = payout_base_rate;
    } else if (payout_model === "performance_only") {
      payout = (views / 1000) * payout_performance_rate;
    } else {
      payout = payout_base_rate + (views / 1000) * payout_performance_rate;
    }

    return Math.min(payout, payout_max_per_creator);
  };

  const estimatedCreators = Math.floor(formValues.total_budget / formValues.payout_max_per_creator);
  const samplePayout = calculatePayout(500000);

  const validateStep = async (): Promise<boolean> => {
    let fieldsToValidate: (keyof CampaignFormData)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ["title", "brief_description", "key_talking_points", "call_to_action"];
        break;
      case 2:
        fieldsToValidate = ["platforms", "target_niche", "follower_range"];
        break;
      case 3:
        fieldsToValidate = ["payout_model", "payout_max_per_creator", "total_budget"];
        break;
      default:
        return true;
    }

    return await trigger(fieldsToValidate);
  };

  const nextStep = async () => {
    const isValid = await validateStep();
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: CampaignFormData) => {
    if (!profile) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Build the campaign description with all the details
      const fullDescription = `${data.brief_description}

**Key Talking Points:**
${data.key_talking_points.filter(p => p.value).map(p => `- ${p.value}`).join('\n')}

${data.dos.some(d => d.value) ? `**Do's:**\n${data.dos.filter(d => d.value).map(d => `- ${d.value}`).join('\n')}` : ''}

${data.donts.some(d => d.value) ? `**Don'ts:**\n${data.donts.filter(d => d.value).map(d => `- ${d.value}`).join('\n')}` : ''}

**Call to Action:** ${data.call_to_action}`;

      // Calculate per-view rate based on payout model
      let perViewRate = 0;
      if (data.payout_model === "performance_only" || data.payout_model === "base_performance") {
        perViewRate = data.payout_performance_rate / 1000;
      }

      const campaignData = {
        brand_id: profile.id,
        title: data.title,
        description: fullDescription,
        requirements: {
          platforms: data.platforms,
          min_followers: minFollowers,
          content_type: [data.target_niche],
          hashtags: [],
          mentions: [],
        },
        budget: data.total_budget,
        payout_rate: {
          per_view: perViewRate,
          per_like: 0,
          per_comment: 0,
          per_share: 0,
        },
        status: "active" as const,
        max_creators: Math.floor(data.total_budget / data.payout_max_per_creator),
        starts_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from("campaigns").insert(campaignData);

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      // Show success alert
      alert("Campaign created successfully! Funding integration coming soon.");

      router.push("/dashboard/brand?campaign_created=true");
    } catch (err: any) {
      console.error("Error creating campaign:", err);
      setError(err.message || "Failed to create campaign");
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <AuthGuard allowedUserTypes={["brand"]}>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/dashboard/brand" className="flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">SocialPay</span>
            </Link>
            <Button variant="ghost" onClick={() => router.push("/dashboard/brand")}>
              Cancel
            </Button>
          </div>
        </header>

        <div className="container max-w-4xl py-8">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isComplete = step.id < currentStep;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                          isComplete
                            ? "bg-primary text-primary-foreground"
                            : isActive
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isComplete ? (
                          <Check className="h-6 w-6" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                      <span
                        className={`text-xs mt-2 font-medium text-center max-w-[80px] ${
                          isActive || isComplete
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.name}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-1 w-16 mx-2 rounded ${
                          step.id < currentStep ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {error}
              </div>
            )}

            {/* Step 1: Campaign Brief */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Campaign Brief
                  </CardTitle>
                  <CardDescription>
                    Provide the essential details creators need to understand your campaign.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Campaign Name */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Campaign Name *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Summer Product Launch 2024"
                      {...register("title")}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive">{errors.title.message}</p>
                    )}
                  </div>

                  {/* Product/Service Description */}
                  <div className="space-y-2">
                    <Label htmlFor="brief_description">Product/Service Description *</Label>
                    <Textarea
                      id="brief_description"
                      placeholder="Describe your product or service, its benefits, and what makes it unique..."
                      rows={4}
                      {...register("brief_description")}
                    />
                    {errors.brief_description && (
                      <p className="text-sm text-destructive">{errors.brief_description.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formValues.brief_description?.length || 0}/500 characters
                    </p>
                  </div>

                  {/* Key Talking Points */}
                  <div className="space-y-3">
                    <Label>Key Talking Points *</Label>
                    <p className="text-sm text-muted-foreground">
                      What should creators mention in their content?
                    </p>
                    {talkingPointFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <Input
                          placeholder={`Talking point ${index + 1}`}
                          {...register(`key_talking_points.${index}.value`)}
                        />
                        {talkingPointFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTalkingPoint(index)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendTalkingPoint({ value: "" })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Point
                    </Button>
                    {errors.key_talking_points && (
                      <p className="text-sm text-destructive">{errors.key_talking_points.message}</p>
                    )}
                  </div>

                  {/* Creative Guidelines: Do's and Don'ts */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Do's */}
                    <div className="space-y-3">
                      <Label className="text-green-600 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Do's
                      </Label>
                      {dosFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                          <Input
                            placeholder="e.g., Show the product in use"
                            {...register(`dos.${index}.value`)}
                          />
                          {dosFields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDo(index)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendDo({ value: "" })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Do
                      </Button>
                    </div>

                    {/* Don'ts */}
                    <div className="space-y-3">
                      <Label className="text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Don'ts
                      </Label>
                      {dontsFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                          <Input
                            placeholder="e.g., Don't mention competitors"
                            {...register(`donts.${index}.value`)}
                          />
                          {dontsFields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDont(index)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendDont({ value: "" })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Don't
                      </Button>
                    </div>
                  </div>

                  {/* Call to Action */}
                  <div className="space-y-2">
                    <Label htmlFor="call_to_action">Call to Action *</Label>
                    <Input
                      id="call_to_action"
                      placeholder="e.g., Visit example.com/summer for 20% off!"
                      {...register("call_to_action")}
                    />
                    {errors.call_to_action && (
                      <p className="text-sm text-destructive">{errors.call_to_action.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      What action should viewers take after watching?
                    </p>
                  </div>

                  {/* Campaign Visuals */}
                  <div className="space-y-3">
                    <Label>Campaign Visuals</Label>
                    <p className="text-sm text-muted-foreground">
                      Upload logo, product images, or reference content for creators.
                    </p>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload images
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG up to 10MB each
                        </p>
                      </label>
                    </div>
                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-4 gap-3 mt-4">
                        {uploadedImages.map((img, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={img}
                              alt={`Upload ${index + 1}`}
                              className="h-20 w-20 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Define Your Ideal Creator */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Define Your Ideal Creator
                  </CardTitle>
                  <CardDescription>
                    Specify who can participate in your campaign.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Platform Selection */}
                  <div className="space-y-4">
                    <Label>Platforms *</Label>
                    <p className="text-sm text-muted-foreground">
                      Which platforms should creators post on?
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      {platforms.map((platform) => {
                        const isSelected = formValues.platforms?.includes(platform.id);
                        return (
                          <div
                            key={platform.id}
                            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => {
                              const current = formValues.platforms || [];
                              if (isSelected) {
                                setValue("platforms", current.filter((p) => p !== platform.id));
                              } else {
                                setValue("platforms", [...current, platform.id]);
                              }
                            }}
                          >
                            <div className="flex flex-col items-center gap-3">
                              <div
                                className={`h-14 w-14 rounded-xl ${platform.color} flex items-center justify-center text-white text-lg font-bold`}
                              >
                                {platform.icon}
                              </div>
                              <span className="font-medium">{platform.name}</span>
                              {isSelected && (
                                <Check className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {errors.platforms && (
                      <p className="text-sm text-destructive">{errors.platforms.message}</p>
                    )}
                  </div>

                  {/* Creator Niche */}
                  <div className="space-y-4">
                    <Label>Creator Niche *</Label>
                    <p className="text-sm text-muted-foreground">
                      What type of content creators are you looking for?
                    </p>
                    <Select
                      value={formValues.target_niche}
                      onValueChange={(value) => setValue("target_niche", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a niche" />
                      </SelectTrigger>
                      <SelectContent>
                        {niches.map((niche) => (
                          <SelectItem key={niche.value} value={niche.value}>
                            {niche.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.target_niche && (
                      <p className="text-sm text-destructive">{errors.target_niche.message}</p>
                    )}
                  </div>

                  {/* Follower Count Range */}
                  <div className="space-y-6">
                    <Label>Follower Count Range</Label>
                    <p className="text-sm text-muted-foreground">
                      Set the minimum and maximum follower count for eligible creators.
                    </p>

                    <div className="px-4">
                      <Slider
                        defaultValue={formValues.follower_range}
                        max={100}
                        step={1}
                        onValueChange={(value) => setValue("follower_range", value)}
                        className="mb-6"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        {followerMarks.map((mark) => (
                          <span key={mark.value}>{mark.label}</span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Minimum</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatFollowers(minFollowers)}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Maximum</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatFollowers(maxFollowers)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Budget & Payouts */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Budget & Payouts
                  </CardTitle>
                  <CardDescription>
                    Configure how creators will be compensated.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Payout Model */}
                  <div className="space-y-4">
                    <Label>Payout Model *</Label>
                    <div className="grid gap-4">
                      <label
                        htmlFor="base_performance"
                        className={`flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formValues.payout_model === "base_performance"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          id="base_performance"
                          name="payout_model"
                          value="base_performance"
                          checked={formValues.payout_model === "base_performance"}
                          onChange={() => setValue("payout_model", "base_performance")}
                          className="mt-1 h-4 w-4 text-primary"
                        />
                        <div className="flex-1">
                          <span className="font-medium">Base + Performance (Recommended)</span>
                          <p className="text-sm text-muted-foreground mt-1">
                            Pay a base amount plus bonus based on views. Best for motivating quality content.
                          </p>
                        </div>
                      </label>

                      <label
                        htmlFor="performance_only"
                        className={`flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formValues.payout_model === "performance_only"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          id="performance_only"
                          name="payout_model"
                          value="performance_only"
                          checked={formValues.payout_model === "performance_only"}
                          onChange={() => setValue("payout_model", "performance_only")}
                          className="mt-1 h-4 w-4 text-primary"
                        />
                        <div className="flex-1">
                          <span className="font-medium">Performance Only</span>
                          <p className="text-sm text-muted-foreground mt-1">
                            Pay only based on views. Lower risk but may attract fewer creators.
                          </p>
                        </div>
                      </label>

                      <label
                        htmlFor="fixed"
                        className={`flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formValues.payout_model === "fixed"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          id="fixed"
                          name="payout_model"
                          value="fixed"
                          checked={formValues.payout_model === "fixed"}
                          onChange={() => setValue("payout_model", "fixed")}
                          className="mt-1 h-4 w-4 text-primary"
                        />
                        <div className="flex-1">
                          <span className="font-medium">Fixed Payout</span>
                          <p className="text-sm text-muted-foreground mt-1">
                            Pay a flat fee per creator. Best for predictable budgeting.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Configure Rates */}
                  <div className="space-y-4">
                    <Label>Configure Rates</Label>
                    <div className="grid md:grid-cols-2 gap-4">
                      {(formValues.payout_model === "base_performance" || formValues.payout_model === "fixed") && (
                        <div className="space-y-2">
                          <Label htmlFor="payout_base_rate" className="text-sm text-muted-foreground">
                            {formValues.payout_model === "fixed" ? "Fixed Payout ($)" : "Base Payment ($)"}
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="payout_base_rate"
                              type="number"
                              min={0}
                              step={5}
                              className="pl-10"
                              {...register("payout_base_rate", { valueAsNumber: true })}
                            />
                          </div>
                        </div>
                      )}

                      {(formValues.payout_model === "base_performance" || formValues.payout_model === "performance_only") && (
                        <div className="space-y-2">
                          <Label htmlFor="payout_performance_rate" className="text-sm text-muted-foreground">
                            Performance Bonus ($ per 1K views)
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="payout_performance_rate"
                              type="number"
                              min={0}
                              step={0.5}
                              className="pl-10"
                              {...register("payout_performance_rate", { valueAsNumber: true })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Safeguards */}
                  <div className="space-y-4">
                    <Label>Set Safeguards</Label>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="payout_max_per_creator" className="text-sm text-muted-foreground">
                          Maximum Payout per Creator ($) *
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="payout_max_per_creator"
                            type="number"
                            min={1}
                            step={50}
                            className="pl-10"
                            {...register("payout_max_per_creator", { valueAsNumber: true })}
                          />
                        </div>
                        {errors.payout_max_per_creator && (
                          <p className="text-sm text-destructive">{errors.payout_max_per_creator.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Caps the maximum a single creator can earn
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="total_budget" className="text-sm text-muted-foreground">
                          Total Campaign Budget ($) *
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="total_budget"
                            type="number"
                            min={100}
                            step={100}
                            className="pl-10"
                            {...register("total_budget", { valueAsNumber: true })}
                          />
                        </div>
                        {errors.total_budget && (
                          <p className="text-sm text-destructive">{errors.total_budget.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Summary */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-4">
                      <Calculator className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Budget Summary</span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Estimated creators your budget can support</p>
                        <p className="text-3xl font-bold text-primary">{estimatedCreators}</p>
                        <p className="text-xs text-muted-foreground">
                          Based on max payout of {formatCurrency(formValues.payout_max_per_creator)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Sample payout (500K views)</p>
                        <p className="text-3xl font-bold text-primary">{formatCurrency(samplePayout)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formValues.payout_model === "fixed"
                            ? "Fixed rate"
                            : formValues.payout_model === "performance_only"
                            ? "Performance only"
                            : `$${formValues.payout_base_rate} base + $${(500000 / 1000 * formValues.payout_performance_rate).toFixed(2)} bonus`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Review & Launch */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Review & Launch
                  </CardTitle>
                  <CardDescription>
                    Double-check everything before launching your campaign.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Campaign Brief Summary */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Campaign Brief
                    </h3>
                    <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Campaign Name</p>
                        <p className="font-medium">{formValues.title}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="text-sm">{formValues.brief_description}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Key Talking Points</p>
                        <ul className="list-disc list-inside text-sm">
                          {formValues.key_talking_points.filter(p => p.value).map((point, i) => (
                            <li key={i}>{point.value}</li>
                          ))}
                        </ul>
                      </div>
                      {formValues.dos.some(d => d.value) && (
                        <div>
                          <p className="text-sm text-muted-foreground text-green-600">Do's</p>
                          <ul className="list-disc list-inside text-sm">
                            {formValues.dos.filter(d => d.value).map((d, i) => (
                              <li key={i}>{d.value}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {formValues.donts.some(d => d.value) && (
                        <div>
                          <p className="text-sm text-muted-foreground text-red-600">Don'ts</p>
                          <ul className="list-disc list-inside text-sm">
                            {formValues.donts.filter(d => d.value).map((d, i) => (
                              <li key={i}>{d.value}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Call to Action</p>
                        <p className="text-sm font-medium text-primary">{formValues.call_to_action}</p>
                      </div>
                    </div>
                  </div>

                  {/* Target Creators Summary */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Target Creators
                    </h3>
                    <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-muted-foreground mr-2">Platforms:</span>
                        {formValues.platforms.map((p) => (
                          <Badge key={p} variant="secondary" className="capitalize">
                            {p}
                          </Badge>
                        ))}
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Niche: </span>
                        <span className="font-medium capitalize">
                          {niches.find(n => n.value === formValues.target_niche)?.label}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Follower Range: </span>
                        <span className="font-medium">
                          {formatFollowers(minFollowers)} - {formatFollowers(maxFollowers)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Budget Summary */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Budget & Payouts
                    </h3>
                    <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Budget</p>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(formValues.total_budget)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Payout Model</p>
                          <p className="font-medium capitalize">
                            {formValues.payout_model.replace("_", " + ")}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                        {(formValues.payout_model === "base_performance" || formValues.payout_model === "fixed") && (
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">
                              {formValues.payout_model === "fixed" ? "Fixed Rate" : "Base Rate"}
                            </p>
                            <p className="font-semibold">{formatCurrency(formValues.payout_base_rate)}</p>
                          </div>
                        )}
                        {(formValues.payout_model === "base_performance" || formValues.payout_model === "performance_only") && (
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Per 1K Views</p>
                            <p className="font-semibold">{formatCurrency(formValues.payout_performance_rate)}</p>
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Max per Creator</p>
                          <p className="font-semibold">{formatCurrency(formValues.payout_max_per_creator)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Campaign Images */}
                  {uploadedImages.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Campaign Assets
                      </h3>
                      <div className="flex gap-3 overflow-x-auto p-2">
                        {uploadedImages.map((img, index) => (
                          <img
                            key={index}
                            src={img}
                            alt={`Asset ${index + 1}`}
                            className="h-24 w-24 object-cover rounded-lg flex-shrink-0"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Final Budget Notice */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-700">Ready to Launch</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your campaign budget of <strong>{formatCurrency(formValues.total_budget)}</strong> will
                          support approximately <strong>{estimatedCreators} creators</strong>. You'll only be charged
                          when creators complete approved posts.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                size="lg"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep} size="lg">
                  Next Step
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting} size="lg" className="bg-green-600 hover:bg-green-700">
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-5 w-5" />
                  )}
                  Fund & Launch Campaign
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
