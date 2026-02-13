'use client';

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width, height, borderRadius = 12, className = '', style }: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width: width || '100%',
        height: height || 16,
        borderRadius,
        background: 'linear-gradient(90deg, #F3EFE9 25%, #FAF8F5 50%, #F3EFE9 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite ease-in-out',
        ...style,
      }}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div style={{ padding: '0 20px' }}>
      {/* Greeting */}
      <Skeleton width={120} height={14} borderRadius={8} />
      <Skeleton width={220} height={30} borderRadius={10} style={{ marginTop: 6 }} />
      {/* ERS card */}
      <Skeleton height={200} borderRadius={28} style={{ marginTop: 24 }} />
      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <Skeleton height={100} borderRadius={22} />
        <Skeleton height={100} borderRadius={22} />
        <Skeleton height={100} borderRadius={22} />
      </div>
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
        <Skeleton height={120} borderRadius={22} />
        <Skeleton height={120} borderRadius={22} />
        <Skeleton height={120} borderRadius={22} />
        <Skeleton height={120} borderRadius={22} />
      </div>
    </div>
  );
}

export function MoodSkeleton() {
  return (
    <div style={{ padding: '0 20px', textAlign: 'center' }}>
      <Skeleton width={180} height={14} borderRadius={8} style={{ margin: '0 auto' }} />
      <Skeleton width={260} height={28} borderRadius={10} style={{ margin: '10px auto 0' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 30 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={68} borderRadius={18} />
        ))}
      </div>
    </div>
  );
}

export function JournalSkeleton() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Skeleton width={100} height={28} borderRadius={10} />
        <Skeleton width={100} height={40} borderRadius={50} />
      </div>
      <Skeleton height={100} borderRadius={24} />
      <div style={{ marginTop: 20 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={140} borderRadius={22} style={{ marginBottom: 12 }} />
        ))}
      </div>
    </div>
  );
}

export function ERSSkeleton() {
  return (
    <div style={{ padding: '0 20px', textAlign: 'center' }}>
      <Skeleton width={120} height={28} borderRadius={10} style={{ margin: '0 auto' }} />
      <Skeleton width={180} height={180} borderRadius={90} style={{ margin: '20px auto' }} />
      <Skeleton height={300} borderRadius={24} style={{ marginTop: 30 }} />
    </div>
  );
}

export function ForecastSkeleton() {
  return (
    <div style={{ padding: '0 20px' }}>
      <Skeleton width={120} height={28} borderRadius={10} />
      <Skeleton height={140} borderRadius={26} style={{ marginTop: 20 }} />
      <Skeleton height={200} borderRadius={24} style={{ marginTop: 20 }} />
      <Skeleton height={300} borderRadius={20} style={{ marginTop: 20 }} />
    </div>
  );
}
