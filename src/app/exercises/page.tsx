'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Exercise {
  id: string;
  exercise_name: string;
  exercise_description: string | null;
  exercise_type: string | null;
  duration_minutes: number | null;
  recommended_stage: string | null;
  difficulty_level: string;
}

const stageColors: Record<string, string> = {
  healing: 'bg-rose-100 text-rose-700',
  rebuilding: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchExercises() {
      let query = supabase
        .from('exercises')
        .select('id, exercise_name, exercise_description, exercise_type, duration_minutes, recommended_stage, difficulty_level')
        .eq('is_active', true)
        .order('exercise_name');

      if (filter !== 'all') {
        query = query.eq('recommended_stage', filter);
      }

      const { data } = await query;
      setExercises(data || []);
      setLoading(false);
    }
    fetchExercises();
  }, [filter]);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Healing Exercises</h1>
          <p className="text-gray-600 mt-1">Guided activities for your recovery</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'healing', 'rebuilding', 'ready'].map((stage) => (
            <button
              key={stage}
              onClick={() => setFilter(stage)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === stage
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {stage === 'all' ? 'All Exercises' : stage.charAt(0).toUpperCase() + stage.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <span className="text-6xl mb-4 block">✨</span>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No exercises found</h2>
            <p className="text-gray-600">Try selecting a different filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="bg-white rounded-2xl shadow hover:shadow-lg transition-shadow p-6">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">{exercise.exercise_name}</h2>
                  {exercise.duration_minutes && (
                    <span className="text-sm text-gray-500">{exercise.duration_minutes} min</span>
                  )}
                </div>

                {exercise.exercise_description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {exercise.exercise_description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {exercise.recommended_stage && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${stageColors[exercise.recommended_stage] || 'bg-gray-100 text-gray-600'}`}>
                      {exercise.recommended_stage}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColors[exercise.difficulty_level] || 'bg-gray-100 text-gray-600'}`}>
                    {exercise.difficulty_level}
                  </span>
                  {exercise.exercise_type && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      {exercise.exercise_type}
                    </span>
                  )}
                </div>

                <button className="mt-4 w-full py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors font-medium">
                  Start Exercise
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
