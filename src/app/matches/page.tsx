// TODO: Post-MVP feature - not active in current version
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';

interface Match {
  id: string;
  matched_at: string;
  last_message_at: string | null;
  match_health_score: number | null;
  other_user: {
    id: string;
    first_name: string;
    display_name: string | null;
    profile_photo_url: string | null;
    ers_stage: string | null;
  } | null;
}

const stageConfig: Record<string, { label: string; color: string; bg: string }> = {
  healing: { label: 'Healing', color: 'text-rose-600', bg: 'bg-rose-100' },
  rebuilding: { label: 'Rebuilding', color: 'text-amber-600', bg: 'bg-amber-100' },
  ready: { label: 'Ready', color: 'text-paceful-primary', bg: 'bg-paceful-primary-muted' },
};

export default function MatchesPage() {
  const router = useRouter();
  const { userId, loading: userLoading, isAuthenticated } = useUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeStrings, setTimeStrings] = useState<Record<string, string>>({});

  const supabase = createClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!userId) return;

    async function fetchMatches() {
      // Fetch matches where user is either user1 or user2
      const { data: matchData } = await supabase
        .from('active_matches')
        .select('id, matched_at, last_message_at, match_health_score, user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (!matchData || matchData.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // Get the other user's ID for each match
      const otherUserIds = matchData.map((m) =>
        m.user1_id === userId ? m.user2_id : m.user1_id
      );

      // Fetch profiles for other users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, display_name, profile_photo_url')
        .in('user_id', otherUserIds);

      // Fetch ERS scores for other users
      const { data: ersScores } = await supabase
        .from('ers_scores')
        .select('user_id, ers_stage')
        .in('user_id', otherUserIds)
        .order('calculated_at', { ascending: false });

      // Build matches with other user info
      const enrichedMatches: Match[] = matchData.map((match) => {
        const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
        const profile = profiles?.find((p) => p.user_id === otherUserId);
        const ers = ersScores?.find((e) => e.user_id === otherUserId);

        return {
          id: match.id,
          matched_at: match.matched_at,
          last_message_at: match.last_message_at,
          match_health_score: match.match_health_score,
          other_user: profile ? {
            id: otherUserId,
            first_name: profile.first_name,
            display_name: profile.display_name,
            profile_photo_url: profile.profile_photo_url,
            ers_stage: ers?.ers_stage || null,
          } : null,
        };
      });

      setMatches(enrichedMatches);
      setLoading(false);
    }

    fetchMatches();
  }, [userId]);

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // Calculate time strings client-side to prevent hydration mismatch
  useEffect(() => {
    const getTimeAgo = (dateStr: string) => {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return date.toLocaleDateString();
    };

    const strings: Record<string, string> = {};
    matches.forEach((match) => {
      if (match.last_message_at) {
        strings[`last_${match.id}`] = `Last message: ${getTimeAgo(match.last_message_at)}`;
      }
      strings[`matched_${match.id}`] = `Matched ${getTimeAgo(match.matched_at)}`;
    });
    setTimeStrings(strings);
  }, [matches]);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-stone-200 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-stone-900">Your Matches</h1>
          <p className="text-stone-600 mt-1">Connect with others on similar healing journeys</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-stone-200" />
                  <div className="flex-1">
                    <div className="h-5 bg-stone-200 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-stone-200 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-paceful-primary-muted flex items-center justify-center">
              <svg className="w-8 h-8 text-paceful-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-stone-800 mb-2">No matches yet</h2>
            <p className="text-stone-600 mb-6">
              Keep working on your healing journey. Matches happen when you&apos;re ready!
            </p>
            <div className="bg-paceful-primary-muted rounded-xl p-4 text-sm text-paceful-primary">
              Tip: Complete journal entries and mood check-ins to improve your ERS score and find compatible matches.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-white rounded-2xl shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-paceful-primary to-paceful-primary-light flex items-center justify-center text-white text-xl font-semibold">
                    {match.other_user ? getInitials(match.other_user.first_name) : '?'}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-stone-900">
                        {match.other_user?.display_name || match.other_user?.first_name || 'Unknown'}
                      </h2>
                      {match.other_user?.ers_stage && stageConfig[match.other_user.ers_stage] && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageConfig[match.other_user.ers_stage].bg} ${stageConfig[match.other_user.ers_stage].color}`}>
                          {stageConfig[match.other_user.ers_stage].label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500">
                      {match.last_message_at
                        ? timeStrings[`last_${match.id}`] || ''
                        : timeStrings[`matched_${match.id}`] || ''}
                    </p>
                  </div>

                  {/* Match Health */}
                  {match.match_health_score !== null && (
                    <div className="text-right">
                      <div className="text-sm text-stone-500">Match Health</div>
                      <div className={`text-lg font-semibold ${
                        match.match_health_score >= 70 ? 'text-paceful-primary' :
                        match.match_health_score >= 40 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {match.match_health_score}%
                      </div>
                    </div>
                  )}

                  {/* Arrow */}
                  <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
