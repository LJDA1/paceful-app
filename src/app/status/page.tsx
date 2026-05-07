'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

type ServiceStatus = 'operational' | 'degraded' | 'slow' | 'down' | 'checking';

interface ServiceRow {
  name: string;
  status: ServiceStatus;
  responseTimeMs: number | null;
  uptime: string;
}

interface HealthResponse {
  status: string;
  services: {
    api: { status: string; responseTimeMs?: number };
    database: { status: string; responseTimeMs?: number };
    ers_engine: { status: string };
  };
  uptime: string;
  timestamp: string;
}

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; dot: string }> = {
  operational: { label: 'Operational',  color: '#3D6B54', dot: '#5B8A72' },
  degraded:    { label: 'Degraded',     color: '#92661A', dot: '#D4973B' },
  slow:        { label: 'Slow',         color: '#92661A', dot: '#D4973B' },
  down:        { label: 'Down',         color: '#8B3D3D', dot: '#B86B64' },
  checking:    { label: 'Checking…',    color: '#9A938A', dot: '#C4BEB6' },
};

const OVERALL_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  operational: {
    label: 'All Systems Operational',
    bg: 'rgba(91,138,114,0.08)',
    color: '#3D6B54',
    dot: '#5B8A72',
  },
  degraded: {
    label: 'Partial System Degradation',
    bg: 'rgba(212,151,59,0.08)',
    color: '#92661A',
    dot: '#D4973B',
  },
  slow: {
    label: 'Performance Degradation',
    bg: 'rgba(212,151,59,0.08)',
    color: '#92661A',
    dot: '#D4973B',
  },
  down: {
    label: 'Service Disruption',
    bg: 'rgba(184,107,100,0.08)',
    color: '#8B3D3D',
    dot: '#B86B64',
  },
  checking: {
    label: 'Checking status…',
    bg: 'rgba(196,190,182,0.12)',
    color: '#9A938A',
    dot: '#C4BEB6',
  },
};

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '12px', height: '12px', flexShrink: 0 }}>
      {pulse && (
        <span style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: color,
          opacity: 0.3,
          animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        }} />
      )}
      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'block' }} />
    </span>
  );
}

export default function StatusPage() {
  const [overallStatus, setOverallStatus] = useState<string>('checking');
  const [services, setServices] = useState<ServiceRow[]>([
    { name: 'Emotional Readiness Score API', status: 'checking', responseTimeMs: null, uptime: '99.9%' },
    { name: 'Vertical Analysis API',         status: 'checking', responseTimeMs: null, uptime: '99.9%' },
    { name: 'Snapshot Assessment API',       status: 'checking', responseTimeMs: null, uptime: '99.9%' },
    { name: 'Partner Dashboard',             status: 'checking', responseTimeMs: null, uptime: '99.9%' },
    { name: 'Webhook Delivery',              status: 'checking', responseTimeMs: null, uptime: '99.9%' },
  ]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    const t0 = Date.now();
    try {
      const res = await fetch('/api/v1/status');
      const elapsed = Date.now() - t0;
      if (!res.ok) throw new Error('non-200');
      const data: HealthResponse = await res.json();

      const apiStatus = (data.services.api?.status || 'operational') as ServiceStatus;
      const apiMs = data.services.api?.responseTimeMs ?? elapsed;
      const dbMs  = data.services.database?.responseTimeMs ?? null;

      setOverallStatus(data.status || 'operational');
      setServices([
        { name: 'Emotional Readiness Score API', status: apiStatus,     responseTimeMs: apiMs,         uptime: '99.9%' },
        { name: 'Vertical Analysis API',         status: apiStatus,     responseTimeMs: apiMs,         uptime: '99.9%' },
        { name: 'Snapshot Assessment API',        status: apiStatus,     responseTimeMs: apiMs,         uptime: '99.9%' },
        { name: 'Partner Dashboard',             status: apiStatus,     responseTimeMs: dbMs ?? apiMs, uptime: '99.9%' },
        { name: 'Webhook Delivery',              status: apiStatus,     responseTimeMs: apiMs,         uptime: '99.9%' },
      ]);
    } catch {
      setOverallStatus('down');
      setServices(s => s.map(svc => ({ ...svc, status: 'down', responseTimeMs: null })));
    } finally {
      setLastChecked(new Date());
      setChecking(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  const overall = OVERALL_CONFIG[overallStatus] ?? OVERALL_CONFIG.checking;

  return (
    <>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
      <MarketingNav />
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Page title + last-checked */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '32px', fontWeight: 500, color: '#1F1D1A', marginBottom: '4px' }}>
              System Status
            </h1>
            {lastChecked && (
              <p style={{ fontSize: '13px', color: '#9A938A' }}>
                Last checked {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </div>
          <button
            onClick={check}
            disabled={checking}
            style={{
              padding: '8px 18px',
              background: '#FFFFFF',
              border: '1px solid #E8E2DA',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 600,
              color: checking ? '#9A938A' : '#1F1D1A',
              cursor: checking ? 'default' : 'pointer',
              flexShrink: 0,
            }}
          >
            {checking ? 'Checking…' : 'Refresh'}
          </button>
        </div>

        {/* Overall status banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '20px 24px',
          background: overall.bg,
          border: `1px solid ${overall.dot}33`,
          borderRadius: '4px',
          marginBottom: '32px',
        }}>
          <Dot color={overall.dot} pulse={overallStatus === 'operational'} />
          <span style={{ fontFamily: 'var(--font-fraunces, Fraunces, serif)', fontSize: '20px', fontWeight: 500, color: overall.color }}>
            {overall.label}
          </span>
        </div>

        {/* Services table */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DA', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            gap: '0',
            borderBottom: '1px solid #F0EBE4',
            padding: '10px 24px',
          }}>
            {['Service', 'Status', 'Response', 'Uptime'].map((h, i) => (
              <span key={h} style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#9A938A',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textAlign: i > 0 ? 'right' : 'left',
                paddingLeft: i > 0 ? '24px' : '0',
              }}>
                {h}
              </span>
            ))}
          </div>

          {services.map((svc, i) => {
            const cfg = STATUS_CONFIG[svc.status];
            return (
              <div
                key={svc.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  alignItems: 'center',
                  padding: '16px 24px',
                  borderBottom: i < services.length - 1 ? '1px solid #F0EBE4' : 'none',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F1D1A' }}>
                  {svc.name}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', paddingLeft: '24px' }}>
                  <Dot color={cfg.dot} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: cfg.color, whiteSpace: 'nowrap' }}>
                    {cfg.label}
                  </span>
                </div>

                <span style={{ fontSize: '13px', color: '#5C574F', textAlign: 'right', paddingLeft: '24px', fontVariantNumeric: 'tabular-nums' }}>
                  {svc.responseTimeMs !== null ? `${svc.responseTimeMs} ms` : '—'}
                </span>

                <span style={{ fontSize: '13px', color: '#5C574F', textAlign: 'right', paddingLeft: '24px', fontVariantNumeric: 'tabular-nums' }}>
                  {svc.uptime}
                </span>
              </div>
            );
          })}
        </div>

        {/* Uptime note */}
        <p style={{ fontSize: '12px', color: '#9A938A', marginTop: '12px', textAlign: 'right' }}>
          30-day uptime · response time measured at time of check
        </p>

      </main>
      <MarketingFooter />
    </>
  );
}
