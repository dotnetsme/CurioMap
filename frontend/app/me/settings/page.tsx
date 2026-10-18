"use client";

import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { AvatarSelector } from "@/components/profile/AvatarSelector";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { ErrorState, PageLoading } from "@/components/ui/Feedback";
import { useAuth } from "@/components/providers/AuthProvider";
import * as usersApi from "@/lib/api/users";
import type { DisplayMode, LocationVisibilitySetting, Settings, ShelfVisibilitySetting } from "@/types";

function SettingsForm() {
  const { user, updateUser } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof usersApi.getProfile>> | null>(null);

  // identity form
  const [avatarId, setAvatarId] = useState("curio-01");
  const [displayNameMode, setDisplayNameMode] = useState<DisplayMode>("anonymous");
  const [handle, setHandle] = useState("");
  const [realName, setRealName] = useState("");
  const [bio, setBio] = useState("");

  // location form
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");

  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadLocationFields(loc: Settings["location"]) {
    setCountry(loc?.country ?? "");
    setRegion(loc?.region ?? "");
    setCity(loc?.city ?? "");
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [s, p] = await Promise.all([usersApi.getSettings(), usersApi.getProfile(user.id)]);
        setSettings(s);
        setProfile(p);
        setAvatarId(user.avatarId);
        setDisplayNameMode(user.displayNameMode);
        setHandle(user.handle);
        setRealName(user.realName ?? "");
        setBio(user.bio ?? "");
        loadLocationFields(s.location);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load settings");
      }
    })();
  }, [user]);

  if (!user) return null;
  if (error) return <ErrorState message={error} />;
  if (!settings || !profile) return <PageLoading />;

  async function saveIdentity() {
    setSavingIdentity(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await usersApi.updateMe({
        avatarId,
        displayNameMode,
        handle: handle.trim().toLowerCase(),
        realName: realName.trim() || null,
        bio: bio.trim() || null,
      });
      updateUser(updated);
      setMessage("Identity saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingIdentity(false);
    }
  }

  async function savePrivacy(next: {
    locationVisibility?: LocationVisibilitySetting;
    bookshelfVisibility?: ShelfVisibilitySetting;
  }) {
    setError(null);
    try {
      const s = await usersApi.updateSettings(next);
      setSettings(s);
      setMessage("Privacy settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function saveLocation() {
    setSavingLocation(true);
    setError(null);
    try {
      const loc = await usersApi.updateLocation({
        country: country.trim() || undefined,
        region: region.trim() || undefined,
        city: city.trim() || undefined,
      });
      setSettings((s) => (s ? { ...s, location: loc } : s));
      setMessage("Location saved (coordinates are fuzzed to a ~15 km grid).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingLocation(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-4">
      <h1 className="display text-4xl text-ink-strong sm:text-5xl">Settings</h1>
      {message ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-signal/40 bg-signal/15 p-3.5 text-sm font-medium text-ink">
          <span className="h-2 w-2 rounded-full bg-signal" />
          {message}
        </div>
      ) : null}

      <section className="glass flex flex-col gap-4 p-6">
        <h2 className="font-display font-bold text-ink-strong">Identity</h2>
        <div>
          <Label>Avatar (curated set — uploads are intentionally not supported)</Label>
          <AvatarSelector value={avatarId} onChange={setAvatarId} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Display name mode</Label>
            <Select value={displayNameMode} onChange={(e) => setDisplayNameMode(e.target.value as DisplayMode)}>
              <option value="anonymous">Anonymous — &ldquo;Anonymous Reader&rdquo;</option>
              <option value="pseudonymous">Pseudonymous — show handle</option>
              <option value="real_name">Real name — show your name</option>
            </Select>
          </div>
          <div>
            <Label>Handle</Label>
            <Input value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={40} />
          </div>
        </div>
        <div>
          <Label>Real name (optional — shown only in real-name mode)</Label>
          <Input value={realName} onChange={(e) => setRealName(e.target.value)} maxLength={120} />
        </div>
        <div>
          <Label>Bio</Label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} />
        </div>
        <Button onClick={() => void saveIdentity()} isLoading={savingIdentity}>
          Save identity
        </Button>
      </section>

      <section className="glass flex flex-col gap-4 p-6">
        <h2 className="font-semibold text-ink">Location &amp; privacy</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Location visibility</Label>
            <Select
              value={settings.locationVisibility}
              onChange={(e) =>
                void savePrivacy({ locationVisibility: e.target.value as LocationVisibilitySetting })
              }
            >
              <option value="region_city">Show region &amp; city</option>
              <option value="country">Show country only</option>
              <option value="hidden">Opt out of discovery entirely</option>
            </Select>
          </div>
          <div>
            <Label>Bookshelf visibility</Label>
            <Select
              value={settings.bookshelfVisibility}
              onChange={(e) =>
                void savePrivacy({ bookshelfVisibility: e.target.value as ShelfVisibilitySetting })
              }
            >
              <option value="public">Public</option>
              <option value="private">Private (only you)</option>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Country</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={100} />
          </div>
          <div>
            <Label>Region / state</Label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => void saveLocation()} isLoading={savingLocation}>
            Save location
          </Button>
          {settings.location ? (
            <span className="text-xs text-ink-faint">
              stored (fuzzed): lat {settings.location.latFuzzed ?? "—"}, lng {settings.location.lngFuzzed ?? "—"}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-ink-faint">
          We never store exact coordinates. On the map, your city shows only fuzzed to a ~15 km
          grid — and only if visibility allows.
        </p>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGate
      icon={Settings2}
      title="Settings"
      body="Sign in to manage your identity, location, and privacy controls."
    >
      <SettingsForm />
    </AuthGate>
  );
}