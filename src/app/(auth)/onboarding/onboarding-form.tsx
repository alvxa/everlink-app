"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, Check, Globe2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { apiFetch, apiUpload, errorMessage } from "@/lib/client";
import { COUNTRIES } from "@/lib/countries";
import { INTERESTS, LANGUAGES } from "@/lib/constants";
import { flagEmoji } from "@/lib/utils";

type Props = {
  initial: {
    displayName: string;
    bio: string;
    avatarUrl: string | null;
    countryCode: string | null;
    interests: string[];
    languages: string[];
    discoverable: boolean;
    showCountry: boolean;
  };
};

const STEPS = ["Your profile", "Your interests", "Languages & privacy"];

export function OnboardingForm({ initial }: Props) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [displayName, setDisplayName] = React.useState(initial.displayName);
  const [bio, setBio] = React.useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(initial.avatarUrl);
  const [countryCode, setCountryCode] = React.useState(initial.countryCode ?? "");
  const [interests, setInterests] = React.useState<string[]>(initial.interests);
  const [languages, setLanguages] = React.useState<string[]>(initial.languages);
  const [discoverable, setDiscoverable] = React.useState(initial.discoverable);
  const [showCountry, setShowCountry] = React.useState(initial.showCountry);
  const [uploading, setUploading] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stepError, setStepError] = React.useState<string | null>(null);

  function toggle(list: string[], setList: (v: string[]) => void, value: string, max: number) {
    if (list.includes(value)) setList(list.filter((v) => v !== value));
    else if (list.length < max) setList([...list, value]);
  }

  async function onAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "AVATAR");
      const data = await apiUpload<{ upload: { url: string } }>("/api/v1/uploads", form);
      setAvatarUrl(data.upload.url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function nextStep() {
    setStepError(null);
    if (step === 0 && displayName.trim().length < 2) {
      setStepError("Add a display name so people know what to call you.");
      return;
    }
    if (step === 1 && interests.length === 0) {
      setStepError("Pick at least one interest.");
      return;
    }
    if (step === 2 && languages.length === 0) {
      setStepError("Pick at least one language.");
      return;
    }
    setStep((s) => Math.min(2, s + 1));
  }

  async function finish() {
    if (languages.length === 0) {
      setStep(2);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await apiFetch("/api/v1/onboarding", {
        method: "POST",
        json: {
          displayName: displayName.trim(),
          bio: bio.trim(),
          avatarUrl,
          countryCode: countryCode || null,
          interests,
          languages,
          discoverable,
          showCountry,
        },
      });
      router.push("/home");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="surface-card p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-ink">Set up your corner of the world</h1>
          <p className="text-[12.5px] text-ink-muted">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
        </div>
      </div>

      <div className="mt-5 flex gap-1.5">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full transition-colors ${index <= step ? "bg-electric" : "bg-surface-3"}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="mt-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <Avatar src={avatarUrl} name={displayName || "You"} size="2xl" />
            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink transition hover:bg-surface-2">
                <Camera className="h-4 w-4" />
                {uploading ? "Uploading..." : avatarUrl ? "Change photo" : "Upload photo"}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onAvatar} disabled={uploading} />
              </label>
              <p className="mt-1.5 text-[11px] text-ink-faint">JPG, PNG, WebP or GIF · up to 10 MB</p>
            </div>
          </div>

          <div className="mt-6">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="How should people know you?"
            />
          </div>
          <div className="mt-4">
            <Label htmlFor="bio">Short bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="A sentence or two about you, your culture or what you love."
            />
            <p className="mt-1 text-right text-[11px] text-ink-faint">{bio.length}/300</p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-6 animate-fade-in">
          <p className="text-[13px] leading-6 text-ink-muted">
            Choose what you love. We use this for discovery and Random Connect. Pick up to 15.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {INTERESTS.map((interest) => {
              const active = interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggle(interests, setInterests, interest, 15)}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition ${
                    active
                      ? "border-electric bg-electric text-white"
                      : "border-line bg-surface text-ink-muted hover:border-electric/40 hover:text-ink"
                  }`}
                  aria-pressed={active}
                >
                  {active && <Check className="mr-1 inline h-3 w-3" />}
                  {interest}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11.5px] text-ink-faint">{interests.length} selected</p>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 animate-fade-in">
          <p className="text-[13px] leading-6 text-ink-muted">What languages do you speak? This helps Language Bridge and discovery.</p>
          <div className="mt-4 flex max-h-44 flex-wrap gap-2 overflow-y-auto">
            {LANGUAGES.map((language) => {
              const active = languages.includes(language.code);
              return (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => toggle(languages, setLanguages, language.code, 10)}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition ${
                    active
                      ? "border-mint bg-mint text-midnight"
                      : "border-line bg-surface text-ink-muted hover:border-mint/50 hover:text-ink"
                  }`}
                  aria-pressed={active}
                >
                  {language.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <Label htmlFor="country">Country (optional)</Label>
            <Select id="country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
              <option value="">Prefer not to say</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {flagEmoji(country.code)} {country.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4 space-y-3 rounded-xl border border-line bg-surface-2 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-ink">Make me discoverable</p>
                <p className="text-[11.5px] leading-5 text-ink-muted">Allow others to find you in Explore People.</p>
              </div>
              <Switch checked={discoverable} onChange={setDiscoverable} label="Discoverable" />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-ink">Show my country</p>
                <p className="text-[11.5px] leading-5 text-ink-muted">Your country may appear on your profile and country hub.</p>
              </div>
              <Switch checked={showCountry} onChange={setShowCountry} label="Show country" />
            </div>
          </div>
        </div>
      )}

      {stepError && <p className="mt-4 text-[12.5px] font-medium text-red-600 dark:text-red-400">{stepError}</p>}
      {error && <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < 2 ? (
          <Button onClick={nextStep}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finish} loading={pending}>
            <Globe2 className="h-4 w-4" /> Enter Everlink
          </Button>
        )}
      </div>
    </div>
  );
}
