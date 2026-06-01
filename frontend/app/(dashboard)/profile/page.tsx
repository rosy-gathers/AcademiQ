"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import DataExportSection from "@/components/DataExportSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { listDocuments, listQuizAttempts } from "@/lib/api";
import { useDashboardUser } from "@/lib/dashboard-context";
import { supabase } from "@/lib/supabase";
import type { LanguageCode } from "@/types";

type UserMetadata = {
  name?: string;
  language_pref?: string;
  university?: string;
  course_tags?: string;
  notify_study_reminders?: boolean;
  notify_product_updates?: boolean;
};

function initialsFromUser(email: string | undefined, name: string | undefined) {
  const n = (name || "").trim();
  if (n.length >= 2) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  const local = (email || "?").split("@")[0] || "?";
  return local.slice(0, 2).toUpperCase();
}

function readMetadata(user: { user_metadata?: Record<string, unknown> }): UserMetadata {
  const m = user.user_metadata ?? {};
  return {
    name: typeof m.name === "string" ? m.name : "",
    language_pref: typeof m.language_pref === "string" ? m.language_pref : "en",
    university: typeof m.university === "string" ? m.university : "",
    course_tags: typeof m.course_tags === "string" ? m.course_tags : "",
    notify_study_reminders:
      typeof m.notify_study_reminders === "boolean" ? m.notify_study_reminders : true,
    notify_product_updates:
      typeof m.notify_product_updates === "boolean" ? m.notify_product_updates : false,
  };
}

export default function ProfilePage() {
  const { user, userId } = useDashboardUser();

  const baseMeta = useMemo(() => readMetadata(user), [user]);

  const [displayName, setDisplayName] = useState(baseMeta.name ?? "");
  const [languagePref, setLanguagePref] = useState<LanguageCode>(
    (baseMeta.language_pref === "bn" ? "bn" : "en") as LanguageCode
  );
  const [university, setUniversity] = useState(baseMeta.university ?? "");
  const [courseTags, setCourseTags] = useState(baseMeta.course_tags ?? "");
  const [notifyStudy, setNotifyStudy] = useState(baseMeta.notify_study_reminders ?? true);
  const [notifyProduct, setNotifyProduct] = useState(
    baseMeta.notify_product_updates ?? false
  );

  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [resetEmailMessage, setResetEmailMessage] = useState<string | null>(null);
  const [resetEmailError, setResetEmailError] = useState<string | null>(null);
  const [resetEmailSending, setResetEmailSending] = useState(false);

  const [docCount, setDocCount] = useState<number | null>(null);
  const [quizCount, setQuizCount] = useState<number | null>(null);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const m = readMetadata(user);
    setDisplayName(m.name ?? "");
    setLanguagePref((m.language_pref === "bn" ? "bn" : "en") as LanguageCode);
    setUniversity(m.university ?? "");
    setCourseTags(m.course_tags ?? "");
    setNotifyStudy(m.notify_study_reminders ?? true);
    setNotifyProduct(m.notify_product_updates ?? false);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      setStatsLoading(true);
      try {
        const [docs, attempts] = await Promise.all([
          listDocuments(userId),
          listQuizAttempts(userId),
        ]);
        if (cancelled) return;
        setDocCount(docs.documents.length);
        const list = attempts.attempts;
        setQuizCount(list.length);
        if (list.length === 0) {
          setAvgScore(null);
        } else {
          const sum = list.reduce((acc, a) => acc + a.percentage, 0);
          setAvgScore(Math.round((sum / list.length) * 10) / 10);
        }
      } catch {
        if (!cancelled) {
          setDocCount(null);
          setQuizCount(null);
          setAvgScore(null);
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    setProfileError(null);
    const { error } = await supabase.auth.updateUser({
      data: {
        name: displayName.trim(),
        language_pref: languagePref,
        university: university.trim(),
        course_tags: courseTags.trim(),
        notify_study_reminders: notifyStudy,
        notify_product_updates: notifyProduct,
      },
    });
    setProfileSaving(false);
    if (error) {
      setProfileError(error.message);
      return;
    }
    setProfileMessage("Profile saved.");
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setPasswordMessage("Password updated.");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSendResetEmail = async () => {
    const email = user.email;
    if (!email) return;
    setResetEmailSending(true);
    setResetEmailMessage(null);
    setResetEmailError(null);
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: origin ? `${origin}/auth/callback` : undefined,
    });
    setResetEmailSending(false);
    if (error) {
      setResetEmailError(error.message);
      return;
    }
    setResetEmailMessage(
      "If an account exists for this email, you will receive a reset link shortly."
    );
  };

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);

  const initials = initialsFromUser(user.email, displayName || baseMeta.name);

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title="Profile"
        subtitle="Your account, preferences, and study overview"
      />

      <div className="surface-card p-6 flex flex-wrap items-center gap-6">
        <div
          className="h-20 w-20 rounded-full bg-accent text-white flex items-center justify-center text-2xl font-semibold shrink-0 shadow-glow-sm"
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-foreground truncate">
            {displayName.trim() || user.email?.split("@")[0] || "Student"}
          </p>
          <p className="text-sm text-foreground-secondary truncate" title={user.email ?? ""}>
            {user.email}
          </p>
          <p className="text-xs text-muted mt-1">
            Avatar uses your initials until photo upload is available.
          </p>
        </div>
      </div>

      <section className="surface-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Study overview</h2>
        {statsLoading ? (
          <p className="text-sm text-muted">Loading stats…</p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-elevated border border-subtle px-4 py-3">
              <dt className="text-xs font-medium text-muted uppercase tracking-wide">
                Documents
              </dt>
              <dd className="text-2xl font-bold text-accent font-mono mt-1">
                {docCount ?? "—"}
              </dd>
            </div>
            <div className="rounded-xl bg-elevated border border-subtle px-4 py-3">
              <dt className="text-xs font-medium text-muted uppercase tracking-wide">
                Quiz attempts
              </dt>
              <dd className="text-2xl font-bold text-success font-mono mt-1">
                {quizCount ?? "—"}
              </dd>
            </div>
            <div className="rounded-xl bg-elevated border border-subtle px-4 py-3">
              <dt className="text-xs font-medium text-muted uppercase tracking-wide">
                Avg. quiz score
              </dt>
              <dd className="text-2xl font-bold text-accent font-mono mt-1">
                {avgScore != null ? `${avgScore}%` : "—"}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <form onSubmit={handleSaveProfile} className="surface-card p-6 space-y-5">
        <h2 className="text-base font-semibold text-foreground">Account &amp; preferences</h2>

        <div>
          <label htmlFor="displayName" className="label-field">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input-field"
            placeholder="How we greet you in the app"
          />
        </div>

        <div>
          <span className="label-field">Preferred language</span>
          <div className="flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-foreground-secondary cursor-pointer">
              <input
                type="radio"
                name="language_pref"
                checked={languagePref === "en"}
                onChange={() => setLanguagePref("en")}
                className="text-accent focus:ring-accent/30"
              />
              English
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-foreground-secondary cursor-pointer">
              <input
                type="radio"
                name="language_pref"
                checked={languagePref === "bn"}
                onChange={() => setLanguagePref("bn")}
                className="text-accent focus:ring-accent/30"
              />
              বাংলা
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="university" className="label-field">
            University / institution
          </label>
          <input
            id="university"
            type="text"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            className="input-field"
            placeholder="e.g. BRAC University"
          />
        </div>

        <div>
          <label htmlFor="courseTags" className="label-field">
            Course tags
          </label>
          <input
            id="courseTags"
            type="text"
            value={courseTags}
            onChange={(e) => setCourseTags(e.target.value)}
            className="input-field font-mono"
            placeholder="Comma-separated, e.g. CSE350, Discrete Math"
          />
        </div>

        <div className="space-y-3 pt-2 border-t border-subtle">
          <p className="text-sm font-medium text-foreground">Notifications</p>
          <p className="text-xs text-muted">
            Preferences are saved to your account for future email or in-app reminders.
          </p>
          <label className="flex items-center gap-3 text-sm text-foreground-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={notifyStudy}
              onChange={(e) => setNotifyStudy(e.target.checked)}
              className="rounded border-subtle bg-elevated text-accent focus:ring-accent/30"
            />
            Study reminders (quizzes, weak concepts)
          </label>
          <label className="flex items-center gap-3 text-sm text-foreground-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={notifyProduct}
              onChange={(e) => setNotifyProduct(e.target.checked)}
              className="rounded border-subtle bg-elevated text-accent focus:ring-accent/30"
            />
            Product updates from AcademiQ
          </label>
        </div>

        {profileError && <p className="alert-error">{profileError}</p>}
        {profileMessage && <p className="alert-success">{profileMessage}</p>}

        <button type="submit" disabled={profileSaving} className="btn-glow !py-2.5 disabled:opacity-50">
          {profileSaving ? "Saving…" : "Save profile"}
        </button>
      </form>

      <section className="surface-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Password</h2>
        <p className="text-sm text-foreground-secondary">
          Set a new password while signed in. Use a strong password you do not reuse elsewhere.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label htmlFor="newPassword" className="label-field">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="label-field">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
            />
          </div>
          {passwordError && <p className="alert-error">{passwordError}</p>}
          {passwordMessage && <p className="alert-success">{passwordMessage}</p>}
          <button type="submit" disabled={passwordSaving} className="btn-glow !py-2.5 disabled:opacity-50">
            {passwordSaving ? "Updating…" : "Update password"}
          </button>
        </form>

        <div className="pt-4 border-t border-subtle">
          <p className="text-sm text-foreground-secondary mb-2">
            Forgot your password? We can email a reset link to{" "}
            <span className="font-medium text-foreground">{user.email}</span>.
          </p>
          <button
            type="button"
            onClick={handleSendResetEmail}
            disabled={resetEmailSending || !user.email}
            className="text-sm text-accent font-medium hover:text-accent-hover disabled:opacity-50"
          >
            {resetEmailSending ? "Sending…" : "Send reset email"}
          </button>
          {resetEmailError && <p className="text-sm text-red-400 mt-2">{resetEmailError}</p>}
          {resetEmailMessage && <p className="text-sm text-success mt-2">{resetEmailMessage}</p>}
        </div>
      </section>

      <DataExportSection userId={userId} />

      <section className="surface-card p-6">
        <h2 className="text-base font-semibold text-foreground mb-2">Session</h2>
        <p className="text-sm text-foreground-secondary mb-4">
          Sign out on this device. You can sign in again anytime.
        </p>
        <button type="button" onClick={handleSignOut} className="btn-ghost !py-2.5">
          Sign out
        </button>
      </section>
    </div>
  );
}
