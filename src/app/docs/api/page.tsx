'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';

export default function ApiDocsPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'redoc' | 'swagger'>('redoc');

  useEffect(() => {
    // Initialize Redoc when script loads
    if (isLoaded && viewMode === 'redoc' && typeof window !== 'undefined') {
      const Redoc = (window as unknown as { Redoc?: { init: (specUrl: string, options: object, element: HTMLElement | null) => void } }).Redoc;
      if (Redoc) {
        Redoc.init(
          '/api/v1/openapi',
          {
            theme: {
              colors: {
                primary: {
                  main: '#5B8A72',
                },
                success: {
                  main: '#5B8A72',
                },
                warning: {
                  main: '#D4973B',
                },
                error: {
                  main: '#B86B64',
                },
                text: {
                  primary: '#1F1D1A',
                  secondary: '#5C574F',
                },
                border: {
                  dark: '#E8E2DA',
                  light: '#F0EBE4',
                },
              },
              typography: {
                fontSize: '15px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                headings: {
                  fontFamily: '"Fraunces", serif',
                  fontWeight: '500',
                },
                code: {
                  fontSize: '13px',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                },
              },
              sidebar: {
                backgroundColor: '#F9F6F2',
                textColor: '#1F1D1A',
                activeTextColor: '#5B8A72',
              },
              rightPanel: {
                backgroundColor: '#1F1D1A',
              },
            },
            hideDownloadButton: false,
            hideHostname: false,
            expandResponses: '200',
            pathInMiddlePanel: true,
            scrollYOffset: 0,
            nativeScrollbars: true,
          },
          document.getElementById('redoc-container')
        );
      }
    }
  }, [isLoaded, viewMode]);

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F2' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #5B8A72 0%, #3D6B54 100%)',
        padding: '24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/partners" style={{
              fontFamily: "'Fraunces', serif",
              fontSize: '20px',
              fontWeight: 500,
              color: '#FFFFFF',
              textDecoration: 'none',
            }}>
              Paceful
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
            <span style={{ color: '#FFFFFF', fontWeight: 500 }}>API Reference</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* View Mode Toggle */}
            <div style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '6px',
              padding: '4px',
            }}>
              <button
                onClick={() => setViewMode('redoc')}
                style={{
                  padding: '6px 12px',
                  background: viewMode === 'redoc' ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: viewMode === 'redoc' ? '#5B8A72' : '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                Redoc
              </button>
              <button
                onClick={() => setViewMode('swagger')}
                style={{
                  padding: '6px 12px',
                  background: viewMode === 'swagger' ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: viewMode === 'swagger' ? '#5B8A72' : '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                Swagger
              </button>
            </div>

            <a
              href="/api/v1/openapi"
              download="paceful-openapi.json"
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#FFFFFF',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <DownloadIcon />
              OpenAPI JSON
            </a>

            <Link
              href="/partners/signup"
              style={{
                padding: '8px 16px',
                background: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#5B8A72',
                textDecoration: 'none',
              }}
            >
              Get API Key
            </Link>
          </div>
        </div>
      </header>

      {/* Redoc View */}
      {viewMode === 'redoc' && (
        <>
          <Script
            src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"
            onLoad={() => setIsLoaded(true)}
          />
          <div id="redoc-container" style={{ minHeight: 'calc(100vh - 80px)' }} />
        </>
      )}

      {/* Swagger UI View */}
      {viewMode === 'swagger' && (
        <SwaggerUIView />
      )}
    </div>
  );
}

function SwaggerUIView() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded && typeof window !== 'undefined') {
      const SwaggerUIBundle = (window as unknown as { SwaggerUIBundle?: (config: object) => void }).SwaggerUIBundle;
      if (SwaggerUIBundle) {
        SwaggerUIBundle({
          url: '/api/v1/openapi',
          dom_id: '#swagger-ui',
          presets: [
            (window as unknown as { SwaggerUIBundle: { presets: { apis: unknown } } }).SwaggerUIBundle.presets.apis,
          ],
          layout: 'BaseLayout',
          deepLinking: true,
          showExtensions: true,
          showCommonExtensions: true,
        });
      }
    }
  }, [loaded]);

  return (
    <>
      <Script
        src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"
        onLoad={() => setLoaded(true)}
      />
      <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css"
      />
      <style>{`
        .swagger-ui .topbar { display: none !important; }
        .swagger-ui .info { margin: 32px 0; }
        .swagger-ui .scheme-container { background: #F9F6F2; padding: 16px; }
        .swagger-ui .btn.authorize { background: #5B8A72; border-color: #5B8A72; }
        .swagger-ui .btn.authorize:hover { background: #3D6B54; }
        .swagger-ui .opblock.opblock-post { border-color: #5B8A72; background: rgba(91, 138, 114, 0.05); }
        .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #5B8A72; }
        .swagger-ui .opblock.opblock-get { border-color: #5E8DB0; background: rgba(94, 141, 176, 0.05); }
        .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #5E8DB0; }
        .swagger-ui .opblock.opblock-put { border-color: #D4973B; background: rgba(212, 151, 59, 0.05); }
        .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #D4973B; }
        .swagger-ui .opblock.opblock-delete { border-color: #B86B64; background: rgba(184, 107, 100, 0.05); }
        .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #B86B64; }
      `}</style>
      <div id="swagger-ui" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }} />
    </>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
