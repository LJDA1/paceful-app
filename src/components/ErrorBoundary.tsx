'use client';
import React from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('ErrorBoundary:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F3EFE9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9A938A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F1D1A', fontFamily: "'Fraunces', serif", marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: '#9A938A', maxWidth: 280, lineHeight: 1.6, marginBottom: 24 }}>We hit an unexpected issue. Try refreshing the page.</p>
          <button onClick={() => window.location.reload()} style={{ background: '#5B8A72', color: '#fff', border: 'none', borderRadius: 50, padding: '12px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Refresh page</button>
          <a href="/dashboard" style={{ marginTop: 16, fontSize: 13, color: '#5B8A72', textDecoration: 'none' }}>Go home</a>
        </div>
      );
    }
    return this.props.children;
  }
}
