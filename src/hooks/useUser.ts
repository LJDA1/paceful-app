'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export function useUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (isMounted) {
        setUserId(user?.id ?? null);
        setLoading(false);
      }
    }
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUserId(session?.user?.id ?? null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { userId, loading, isAuthenticated: !!userId };
}
