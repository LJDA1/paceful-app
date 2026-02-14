import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_KEY = 'paceful-admin-2024';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== 'Bearer ' + ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Get all synthetic users
  const { data: users } = await supabase
    .from('profiles')
    .select('user_id, first_name, breakup_date, recovery_context')
    .eq('is_synthetic', true);

  if (!users) return NextResponse.json({ error: 'No users found' }, { status: 404 });

  let totalInserted = 0;

  for (const user of users) {
    // Get their mood entries to know their timeline
    const { data: moods } = await supabase
      .from('mood_entries')
      .select('mood_value, logged_at')
      .eq('user_id', user.user_id)
      .order('logged_at', { ascending: true });

    if (!moods || moods.length === 0) continue;

    // Pick ~30% of mood days for journal entries
    const journalDays = moods.filter(() => Math.random() < 0.3);

    const journalInserts = journalDays.map((mood, i) => {
      const moodVal = mood.mood_value || 3;
      const dayNum = i + 1;

      // Generate realistic placeholder content based on mood
      let content = '';
      if (moodVal <= 2) {
        const lowTemplates = [
          `Today was really hard. I keep thinking about everything and I can't seem to stop. The mornings are the worst part - waking up and remembering all over again. I just want to feel normal again.`,
          `I don't know why today hit me so hard. I was doing okay and then something reminded me of them and it all came flooding back. I'm tired of feeling this way.`,
          `Rough day. Couldn't focus at work, couldn't eat properly. My friends keep telling me it gets better but right now it doesn't feel like it ever will.`,
          `I cried again today. I thought I was past this but apparently not. It's like grief comes in waves and today was a big one.`,
          `Everything feels heavy today. I stayed in bed too long, skipped my workout, barely ate. I know I should be doing better but I just don't have the energy.`,
        ];
        content = lowTemplates[Math.floor(Math.random() * lowTemplates.length)];
      } else if (moodVal === 3) {
        const midTemplates = [
          `Mixed day. Had some okay moments but also some tough ones. I'm starting to notice that the good moments are lasting a bit longer though. Maybe that's progress.`,
          `Went through the motions today. Not great, not terrible. I managed to get some things done which felt like a small win. Taking it one day at a time.`,
          `Had coffee with a friend today which helped. It's weird how normal things can feel so different now. But I'm trying to rebuild my routine piece by piece.`,
          `Feeling somewhere in the middle today. I had a moment where I actually laughed at something and it felt genuine. Then I felt guilty about it. Is that normal?`,
          `Today was okay. I'm learning to be okay with okay. Not every day needs to be a breakthrough. Sometimes just getting through it is enough.`,
        ];
        content = midTemplates[Math.floor(Math.random() * midTemplates.length)];
      } else {
        const highTemplates = [
          `Good day today. I woke up and for the first time in a while, they weren't the first thing I thought about. I thought about what I wanted to do today instead. That feels like real progress.`,
          `Something shifted today. I felt like myself again - the person I was before all of this. I know there will still be bad days but today reminded me that I'm still in there.`,
          `Had a really nice day. Went for a long walk, cooked a proper meal, called my sister. These simple things used to feel impossible. Now they feel like gifts.`,
          `I'm starting to see this whole experience differently. Yes it was painful, but I'm learning so much about myself. I'm stronger than I thought.`,
          `Today I realized I haven't checked their social media in over a week. A month ago I was checking every hour. Progress isn't always dramatic - sometimes it's quiet like this.`,
        ];
        content = highTemplates[Math.floor(Math.random() * highTemplates.length)];
      }

      return {
        user_id: user.user_id,
        entry_title: `Day ${dayNum}`,
        entry_content: content,
        word_count: content.split(/\s+/).length,
        status: 'published',
        created_at: mood.logged_at,
        is_synthetic: true,
      };
    });

    if (journalInserts.length > 0) {
      const { error } = await supabase.from('journal_entries').insert(journalInserts);
      if (error) {
        console.error(`Journal insert error for ${user.user_id}:`, error.message);
      } else {
        totalInserted += journalInserts.length;
      }
    }
  }

  return NextResponse.json({ success: true, journalsInserted: totalInserted, usersProcessed: users.length });
}
