'use client';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({ message = 'Loading...', fullScreen = false }: LoadingStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative">
        <div className="w-10 h-10 border-3 border-indigo-200 rounded-full" />
        <div className="absolute top-0 left-0 w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-stone-400 text-sm">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        {content}
      </div>
    );
  }

  return content;
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className={`${sizeClasses[size]} border-indigo-500 border-t-transparent rounded-full animate-spin`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200 animate-pulse">
      <div className="h-4 bg-stone-200 rounded w-1/3 mb-4" />
      <div className="h-8 bg-stone-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-stone-200 rounded w-2/3" />
    </div>
  );
}

export function SkeletonList({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-stone-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-stone-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-stone-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200 animate-pulse">
      <div className="h-4 bg-stone-200 rounded w-1/4 mb-6" />
      <div className="flex items-end gap-2 h-32">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-stone-200 rounded-t"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}
