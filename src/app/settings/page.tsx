'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';

// ============================================================================
// Types
// ============================================================================

interface ProfileData {
  first_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  email_reminders_daily: boolean;
  email_reminders_weekly: boolean;
  seeking_match: boolean;
  recovery_context: 'breakup' | 'divorce' | 'grief' | 'life_transition' | 'general_wellness';
}

interface Memory {
  id: string;
  memory_type: 'fact' | 'pattern' | 'preference' | 'milestone' | 'concern';
  content: string;
  importance: number;
  created_at: string;
}

// ============================================================================
// Icons
// ============================================================================

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function ChevronRightIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function DownloadIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function TrashIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function LogOutIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
    </svg>
  );
}

function SparklesIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function XMarkIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function BellIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}

function HeartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

// Memory type labels and colors
const MEMORY_TYPE_LABELS: Record<Memory['memory_type'], string> = {
  fact: 'Personal fact',
  pattern: 'Pattern',
  preference: 'Preference',
  milestone: 'Milestone',
  concern: 'Sensitive',
};

const MEMORY_TYPE_COLORS: Record<Memory['memory_type'], { bg: string; text: string }> = {
  fact: { bg: 'rgba(94,141,176,0.15)', text: '#5E8DB0' },
  pattern: { bg: 'rgba(126,113,181,0.15)', text: '#7E71B5' },
  preference: { bg: 'rgba(212,151,59,0.15)', text: '#D4973B' },
  milestone: { bg: 'rgba(91,138,114,0.15)', text: '#5B8A72' },
  concern: { bg: 'rgba(184,107,100,0.15)', text: '#B86B64' },
};

// ============================================================================
// Main Page
// ============================================================================

export default function SettingsPage() {
  const router = useRouter();
  const { userId, loading: userLoading, isAuthenticated } = useUser();
  const supabase = createClient();

  // Profile state
  const [profile, setProfile] = useState<ProfileData>({
    first_name: '',
    date_of_birth: '',
    gender: '',
    email_reminders_daily: true,
    email_reminders_weekly: true,
    seeking_match: false,
    recovery_context: 'breakup',
  });
  const [email, setEmail] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Notification state
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [notificationsSaved, setNotificationsSaved] = useState(false);

  // Matching state
  const [isSavingMatching, setIsSavingMatching] = useState(false);
  const [matchingSaved, setMatchingSaved] = useState(false);

  // Password state
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Data actions state
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Memory state
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setIsLoadingProfile(true);

    try {
      // Get email from auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }

      // Get profile data
      const { data } = await supabase
        .from('profiles')
        .select('first_name, date_of_birth, gender, email_reminders_daily, email_reminders_weekly, seeking_match, recovery_context')
        .eq('user_id', userId)
        .single();

      if (data) {
        setProfile({
          first_name: data.first_name || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          email_reminders_daily: data.email_reminders_daily ?? true,
          email_reminders_weekly: data.email_reminders_weekly ?? true,
          seeking_match: data.seeking_match ?? false,
          recovery_context: data.recovery_context || 'breakup',
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId, fetchProfile]);

  // Fetch memories
  const fetchMemories = useCallback(async () => {
    if (!userId) return;
    setIsLoadingMemories(true);

    try {
      const { data } = await supabase
        .from('ai_memory')
        .select('*')
        .eq('user_id', userId)
        .order('memory_type')
        .order('importance', { ascending: false });

      setMemories(data || []);
    } catch (err) {
      console.error('Error fetching memories:', err);
    } finally {
      setIsLoadingMemories(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (userId && showMemories) {
      fetchMemories();
    }
  }, [userId, showMemories, fetchMemories]);

  // Save profile
  const handleSaveProfile = async () => {
    if (!userId) return;
    setIsSavingProfile(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          first_name: profile.first_name || null,
          date_of_birth: profile.date_of_birth || null,
          gender: profile.gender || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save notification preferences
  const handleSaveNotifications = async () => {
    if (!userId) return;
    setIsSavingNotifications(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          email_reminders_daily: profile.email_reminders_daily,
          email_reminders_weekly: profile.email_reminders_weekly,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setNotificationsSaved(true);
      setTimeout(() => setNotificationsSaved(false), 3000);
    } catch (err) {
      console.error('Error saving notifications:', err);
      alert('Failed to save notification preferences. Please try again.');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  // Save matching preferences
  const handleSaveMatching = async () => {
    if (!userId) return;
    setIsSavingMatching(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          seeking_match: profile.seeking_match,
          recovery_context: profile.recovery_context,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setMatchingSaved(true);
      setTimeout(() => setMatchingSaved(false), 3000);
    } catch (err) {
      console.error('Error saving matching preferences:', err);
      alert('Failed to save matching preferences. Please try again.');
    } finally {
      setIsSavingMatching(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      setPasswordChanged(true);
      setShowPasswordFields(false);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordChanged(false), 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError('Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Export data
  const handleExportData = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const response = await fetch('/api/user/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Export failed');

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paceful-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Error exporting data:', err);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);

    try {
      const response = await fetch('/api/user/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Deletion failed');

      await supabase.auth.signOut();
      router.push('/');
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  // Delete single memory
  const handleDeleteMemory = async (memoryId: string) => {
    setDeletingMemoryId(memoryId);

    try {
      const { error } = await supabase
        .from('ai_memory')
        .delete()
        .eq('id', memoryId)
        .eq('user_id', userId);

      if (error) throw error;

      setMemories(prev => prev.filter(m => m.id !== memoryId));
    } catch (err) {
      console.error('Error deleting memory:', err);
      alert('Failed to delete memory. Please try again.');
    } finally {
      setDeletingMemoryId(null);
    }
  };

  // Clear all memories
  const handleClearAllMemories = async () => {
    setIsClearingAll(true);

    try {
      const { error } = await supabase
        .from('ai_memory')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setMemories([]);
      setShowClearAllConfirm(false);
    } catch (err) {
      console.error('Error clearing memories:', err);
      alert('Failed to clear memories. Please try again.');
    } finally {
      setIsClearingAll(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (userLoading || isLoadingProfile) {
    return (
      <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
        <div className="max-w-lg mx-auto px-5 py-6 animate-pulse">
          <div className="h-8 w-24 rounded mb-2" style={{ background: 'var(--border)' }} />
          <div className="h-4 w-40 rounded mb-8" style={{ background: 'var(--border-light)' }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 rounded-3xl mb-4" style={{ background: 'var(--border-light)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-5 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-[28px] font-bold mb-1"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
          >
            Settings
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
            Manage your account
          </p>
        </div>

        {/* Profile Section */}
        <div
          className="rounded-3xl p-5 mb-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
        >
          <h2 className="text-[16px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Profile
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-sec)' }}>
                First name
              </label>
              <input
                type="text"
                value={profile.first_name || ''}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl text-[14px] outline-none transition-all"
                style={{ background: 'var(--bg-warm)', border: '1.5px solid var(--border-light)', color: 'var(--text)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-sec)' }}>
                Date of birth
              </label>
              <input
                type="date"
                value={profile.date_of_birth || ''}
                onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl text-[14px] outline-none transition-all"
                style={{ background: 'var(--bg-warm)', border: '1.5px solid var(--border-light)', color: 'var(--text)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-sec)' }}>
                Gender
              </label>
              <select
                value={profile.gender || ''}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl text-[14px] outline-none transition-all appearance-none"
                style={{ background: 'var(--bg-warm)', border: '1.5px solid var(--border-light)', color: 'var(--text)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
              >
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="px-6 py-2.5 rounded-full text-[14px] font-medium text-white transition-all disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {isSavingProfile ? 'Saving...' : 'Save changes'}
            </button>
            {profileSaved && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
                style={{ background: 'rgba(91,138,114,0.1)', color: 'var(--primary)' }}
              >
                <CheckIcon className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>
        </div>

        {/* Account Section */}
        <div
          className="rounded-3xl p-5 mb-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
        >
          <h2 className="text-[16px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Account
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-sec)' }}>
                Email
              </label>
              <div
                className="w-full px-4 py-3 rounded-2xl text-[14px]"
                style={{ background: 'var(--bg-warm)', border: '1.5px solid var(--border-light)', color: 'var(--text-muted)' }}
              >
                {email}
              </div>
            </div>

            {!showPasswordFields ? (
              <button
                onClick={() => setShowPasswordFields(true)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-2xl text-[14px] font-medium transition-colors"
                style={{ background: 'var(--bg-warm)', color: 'var(--text)' }}
              >
                Change password
                <ChevronRightIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--bg-warm)' }}>
                <div>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text-sec)' }}>
                    New password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2.5 rounded-xl text-[14px] outline-none"
                    style={{ background: 'white', border: '1.5px solid var(--border-light)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text-sec)' }}>
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-[14px] outline-none"
                    style={{ background: 'white', border: '1.5px solid var(--border-light)', color: 'var(--text)' }}
                  />
                </div>
                {passwordError && (
                  <p className="text-[12px]" style={{ color: 'var(--rose)' }}>{passwordError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="px-4 py-2 rounded-full text-[13px] font-medium text-white disabled:opacity-50"
                    style={{ background: 'var(--primary)' }}
                  >
                    {isChangingPassword ? 'Updating...' : 'Update'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordFields(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                    }}
                    className="px-4 py-2 rounded-full text-[13px] font-medium"
                    style={{ color: 'var(--text-sec)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {passwordChanged && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
                style={{ background: 'rgba(91,138,114,0.1)', color: 'var(--primary)' }}
              >
                <CheckIcon className="w-3.5 h-3.5" />
                Password updated
              </span>
            )}
          </div>
        </div>

        {/* Data & Privacy Section */}
        <div
          className="rounded-3xl p-5 mb-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
        >
          <h2 className="text-[16px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Data & Privacy
          </h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="flex items-center gap-3 flex-1 px-4 py-3 rounded-2xl text-[14px] font-medium transition-colors disabled:opacity-50"
                style={{ background: 'var(--bg-warm)', color: 'var(--text)' }}
              >
                <DownloadIcon className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                {isExporting ? 'Exporting...' : 'Export my data'}
              </button>
              {exportSuccess && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap"
                  style={{ background: 'rgba(91,138,114,0.1)', color: 'var(--primary)' }}
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  Exported
                </span>
              )}
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-[14px] font-medium transition-colors"
                style={{ background: 'var(--bg-warm)', color: 'var(--rose)' }}
              >
                <TrashIcon className="w-5 h-5" />
                Delete my account
              </button>
            ) : (
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(184,107,100,0.08)', border: '1px solid rgba(184,107,100,0.2)' }}>
                <p className="text-[14px] font-medium mb-2" style={{ color: 'var(--rose)' }}>
                  Delete your account?
                </p>
                <p className="text-[13px] mb-3" style={{ color: 'var(--text-sec)' }}>
                  This will permanently delete all your data including moods, journals, and progress. This cannot be undone.
                </p>
                <div className="mb-3">
                  <label className="block text-[12px] mb-1" style={{ color: 'var(--text-muted)' }}>
                    Type DELETE to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-[14px] outline-none"
                    style={{ background: 'white', border: '1.5px solid var(--border-light)', color: 'var(--text)' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                    className="px-4 py-2 rounded-full text-[13px] font-medium text-white disabled:opacity-50"
                    style={{ background: 'var(--rose)' }}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete forever'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="px-4 py-2 rounded-full text-[13px] font-medium"
                    style={{ color: 'var(--text-sec)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notifications Section */}
        <div
          className="rounded-3xl p-5 mb-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BellIcon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
              Notifications
            </h2>
          </div>

          <div className="space-y-4">
            {/* Daily reminders toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                  Daily mood reminders
                </p>
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  Get a gentle nudge to log your mood
                </p>
              </div>
              <button
                onClick={() => setProfile({ ...profile, email_reminders_daily: !profile.email_reminders_daily })}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: profile.email_reminders_daily ? 'var(--primary)' : 'var(--border)' }}
                aria-label="Toggle daily mood reminders"
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: profile.email_reminders_daily ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>

            {/* Weekly recap toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                  Weekly progress recap
                </p>
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  Receive a summary of your week
                </p>
              </div>
              <button
                onClick={() => setProfile({ ...profile, email_reminders_weekly: !profile.email_reminders_weekly })}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: profile.email_reminders_weekly ? 'var(--primary)' : 'var(--border)' }}
                aria-label="Toggle weekly progress recap"
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: profile.email_reminders_weekly ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleSaveNotifications}
              disabled={isSavingNotifications}
              className="px-6 py-2.5 rounded-full text-[14px] font-medium text-white transition-all disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {isSavingNotifications ? 'Saving...' : 'Save preferences'}
            </button>
            {notificationsSaved && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
                style={{ background: 'rgba(91,138,114,0.1)', color: 'var(--primary)' }}
              >
                <CheckIcon className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>
        </div>

        {/* Matching Section */}
        <div
          className="rounded-3xl p-5 mb-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <HeartIcon className="w-5 h-5" style={{ color: '#D4973B' }} />
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
              Matching
            </h2>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase"
              style={{ background: 'rgba(212,151,59,0.15)', color: '#D4973B' }}
            >
              Coming Soon
            </span>
          </div>

          <div className="space-y-4">
            {/* Matching interest toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                  Interested in matching
                </p>
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  Get notified when matching is available
                </p>
              </div>
              <button
                onClick={() => setProfile({ ...profile, seeking_match: !profile.seeking_match })}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: profile.seeking_match ? '#D4973B' : 'var(--border)' }}
                aria-label="Toggle matching interest"
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: profile.seeking_match ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>

            {/* Recovery context dropdown */}
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-sec)' }}>
                What brought you to Paceful?
              </label>
              <select
                value={profile.recovery_context}
                onChange={(e) => setProfile({ ...profile, recovery_context: e.target.value as ProfileData['recovery_context'] })}
                className="w-full px-4 py-3 rounded-2xl text-[14px] outline-none transition-all appearance-none"
                style={{ background: 'var(--bg-warm)', border: '1.5px solid var(--border-light)', color: 'var(--text)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
              >
                <option value="breakup">Breakup</option>
                <option value="divorce">Divorce</option>
                <option value="grief">Grief or loss</option>
                <option value="life_transition">Life transition</option>
                <option value="general_wellness">General wellness</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleSaveMatching}
              disabled={isSavingMatching}
              className="px-6 py-2.5 rounded-full text-[14px] font-medium text-white transition-all disabled:opacity-50"
              style={{ background: '#D4973B' }}
            >
              {isSavingMatching ? 'Saving...' : 'Save preferences'}
            </button>
            {matchingSaved && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
                style={{ background: 'rgba(212,151,59,0.1)', color: '#D4973B' }}
              >
                <CheckIcon className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>
        </div>

        {/* AI Memory Section */}
        <div
          className="rounded-3xl p-5 mb-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5" style={{ color: '#7E71B5' }} />
              <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
                Pace&apos;s Memory
              </h2>
            </div>
            {!showMemories && (
              <button
                onClick={() => setShowMemories(true)}
                className="text-[13px] font-medium"
                style={{ color: 'var(--primary)' }}
              >
                View
              </button>
            )}
          </div>

          <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
            Pace remembers things you share to provide more personalized support. You can view and delete these memories anytime.
          </p>

          {showMemories && (
            <div className="space-y-3">
              {isLoadingMemories ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full" />
                </div>
              ) : memories.length === 0 ? (
                <div
                  className="text-center py-6 rounded-2xl"
                  style={{ background: 'var(--bg-warm)' }}
                >
                  <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                    No memories yet. Chat with Pace to build a connection.
                  </p>
                </div>
              ) : (
                <>
                  {memories.map((memory) => (
                    <div
                      key={memory.id}
                      className="flex items-start justify-between gap-3 px-4 py-3 rounded-2xl"
                      style={{ background: 'var(--bg-warm)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: MEMORY_TYPE_COLORS[memory.memory_type].bg,
                              color: MEMORY_TYPE_COLORS[memory.memory_type].text,
                            }}
                          >
                            {MEMORY_TYPE_LABELS[memory.memory_type]}
                          </span>
                        </div>
                        <p className="text-[14px]" style={{ color: 'var(--text)' }}>
                          {memory.content}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteMemory(memory.id)}
                        disabled={deletingMemoryId === memory.id}
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: 'rgba(184,107,100,0.1)' }}
                        aria-label="Delete memory"
                      >
                        {deletingMemoryId === memory.id ? (
                          <div className="animate-spin w-3 h-3 border-2 border-stone-300 border-t-stone-600 rounded-full" />
                        ) : (
                          <XMarkIcon className="w-3.5 h-3.5" style={{ color: 'var(--rose)' }} />
                        )}
                      </button>
                    </div>
                  ))}

                  {/* Clear all button */}
                  {memories.length > 0 && !showClearAllConfirm && (
                    <button
                      onClick={() => setShowClearAllConfirm(true)}
                      className="w-full px-4 py-3 rounded-2xl text-[14px] font-medium transition-colors"
                      style={{ background: 'rgba(184,107,100,0.08)', color: 'var(--rose)' }}
                    >
                      Clear all memories
                    </button>
                  )}

                  {/* Clear all confirmation */}
                  {showClearAllConfirm && (
                    <div
                      className="p-4 rounded-2xl"
                      style={{ background: 'rgba(184,107,100,0.08)', border: '1px solid rgba(184,107,100,0.2)' }}
                    >
                      <p className="text-[14px] font-medium mb-2" style={{ color: 'var(--rose)' }}>
                        Clear all memories?
                      </p>
                      <p className="text-[13px] mb-3" style={{ color: 'var(--text-sec)' }}>
                        Pace will forget everything about you. This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleClearAllMemories}
                          disabled={isClearingAll}
                          className="px-4 py-2 rounded-full text-[13px] font-medium text-white disabled:opacity-50"
                          style={{ background: 'var(--rose)' }}
                        >
                          {isClearingAll ? 'Clearing...' : 'Yes, clear all'}
                        </button>
                        <button
                          onClick={() => setShowClearAllConfirm(false)}
                          className="px-4 py-2 rounded-full text-[13px] font-medium"
                          style={{ color: 'var(--text-sec)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Hide memories button */}
              <button
                onClick={() => setShowMemories(false)}
                className="text-[13px] font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                Hide memories
              </button>
            </div>
          )}
        </div>

        {/* About Section */}
        <div
          className="rounded-3xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
        >
          <h2 className="text-[16px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
            About
          </h2>

          <div className="space-y-3">
            <div
              className="px-4 py-3 rounded-2xl text-[14px]"
              style={{ background: 'var(--bg-warm)', color: 'var(--text-muted)' }}
            >
              Paceful v1.0
            </div>

            <Link
              href="/privacy"
              className="flex items-center justify-between w-full px-4 py-3 rounded-2xl text-[14px] font-medium transition-colors"
              style={{ background: 'var(--bg-warm)', color: 'var(--text)' }}
            >
              Privacy Policy
              <ChevronRightIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </Link>

            <Link
              href="/terms"
              className="flex items-center justify-between w-full px-4 py-3 rounded-2xl text-[14px] font-medium transition-colors"
              style={{ background: 'var(--bg-warm)', color: 'var(--text)' }}
            >
              Terms of Service
              <ChevronRightIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-[14px] font-medium transition-colors"
              style={{ background: 'var(--bg-warm)', color: 'var(--rose)' }}
            >
              <LogOutIcon className="w-5 h-5" />
              Sign out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
