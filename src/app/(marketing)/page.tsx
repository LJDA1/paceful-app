'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { trackConversion } from '@/lib/conversion-track';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

// ============================================================================
// SVG Icons
// ============================================================================

function HeartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function ChartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function BrainIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23.693L5 15.5m14.8-.2-.8.2m-13 0 .8-.2m0 0a9.001 9.001 0 0 0 12.4 0" />
    </svg>
  );
}

function DocumentIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function AppStoreBadge({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" rx="6" fill="black"/>
      <path d="M24.769 20.3C24.749 18.096 26.069 16.144 28.049 15.08C26.813 13.32 24.869 12.308 22.729 12.256C20.469 12.016 18.281 13.596 17.129 13.596C15.957 13.596 14.181 12.276 12.277 12.316C9.765 12.4 7.473 13.78 6.217 15.94C3.577 20.404 5.537 27.032 8.069 30.64C9.337 32.4 10.813 34.376 12.717 34.304C14.581 34.224 15.277 33.124 17.537 33.124C19.777 33.124 20.429 34.304 22.377 34.256C24.389 34.224 25.669 32.488 26.893 30.708C27.829 29.412 28.549 27.972 29.029 26.448C26.649 25.424 24.789 23.056 24.769 20.3Z" fill="white"/>
      <path d="M21.589 10.176C22.693 8.844 23.233 7.156 23.101 5.456C21.437 5.632 19.897 6.424 18.777 7.696C17.685 8.932 17.105 10.56 17.213 12.184C18.893 12.204 20.509 11.456 21.589 10.176Z" fill="white"/>
      <path d="M42.301 27.14H37.485L36.329 30.496H34.149L38.749 18.078H41.077L45.677 30.496H43.457L42.301 27.14ZM38.005 25.476H41.781L39.921 20.07H39.861L38.005 25.476Z" fill="white"/>
      <path d="M55.16 25.97C55.16 28.77 53.66 30.606 51.372 30.606C50.138 30.67 48.97 30.042 48.348 28.978H48.298V33.55H46.278V21.436H48.228V23.01H48.268C48.922 21.956 50.09 21.326 51.332 21.386C53.65 21.386 55.16 23.232 55.16 25.97ZM53.08 25.97C53.08 24.196 52.17 23.03 50.77 23.03C49.39 23.03 48.478 24.216 48.478 25.97C48.478 27.744 49.39 28.918 50.77 28.918C52.17 28.918 53.08 27.764 53.08 25.97Z" fill="white"/>
      <path d="M65.124 25.97C65.124 28.77 63.624 30.606 61.336 30.606C60.102 30.67 58.934 30.042 58.312 28.978H58.262V33.55H56.242V21.436H58.192V23.01H58.232C58.886 21.956 60.054 21.326 61.296 21.386C63.614 21.386 65.124 23.232 65.124 25.97ZM63.044 25.97C63.044 24.196 62.134 23.03 60.734 23.03C59.354 23.03 58.442 24.216 58.442 25.97C58.442 27.744 59.354 28.918 60.734 28.918C62.134 28.918 63.044 27.764 63.044 25.97Z" fill="white"/>
      <path d="M71.71 27.04C71.87 28.22 73.01 29.01 74.55 29.01C76.03 29.01 77.1 28.22 77.1 27.14C77.1 26.2 76.44 25.64 74.92 25.27L73.4 24.91C71.17 24.38 70.14 23.34 70.14 21.64C70.14 19.54 71.97 18.078 74.53 18.078C77.06 18.078 78.82 19.54 78.88 21.64H76.84C76.71 20.452 75.73 19.722 74.5 19.722C73.27 19.722 72.29 20.462 72.29 21.532C72.29 22.392 72.93 22.892 74.44 23.262L75.72 23.572C78.22 24.152 79.25 25.152 79.25 26.932C79.25 29.212 77.44 30.654 74.4 30.654C71.55 30.654 69.73 29.252 69.63 27.04H71.71Z" fill="white"/>
      <path d="M83.346 19.502V21.436H85.226V22.94H83.346V27.752C83.346 28.55 83.696 28.918 84.476 28.918C84.724 28.914 84.972 28.896 85.216 28.864V30.358C84.82 30.434 84.416 30.468 84.012 30.46C82.022 30.46 81.316 29.778 81.316 27.872V22.94H79.886V21.436H81.316V19.502H83.346Z" fill="white"/>
      <path d="M86.066 25.97C86.066 23.182 87.736 21.366 90.326 21.366C92.926 21.366 94.586 23.182 94.586 25.97C94.586 28.768 92.936 30.574 90.326 30.574C87.716 30.574 86.066 28.768 86.066 25.97ZM92.536 25.97C92.536 24.066 91.676 22.95 90.326 22.95C88.976 22.95 88.116 24.076 88.116 25.97C88.116 27.884 88.976 28.99 90.326 28.99C91.676 28.99 92.536 27.884 92.536 25.97Z" fill="white"/>
      <path d="M96.186 21.436H98.106V23.05H98.156C98.418 22.028 99.336 21.334 100.386 21.386C100.646 21.386 100.906 21.416 101.156 21.476V23.352C100.836 23.252 100.5 23.206 100.166 23.212C99.136 23.172 98.256 23.96 98.206 24.99C98.2 25.088 98.2 25.188 98.206 25.286V30.496H96.186V21.436Z" fill="white"/>
      <path d="M109.874 27.78C109.594 29.42 108.004 30.574 105.984 30.574C103.374 30.574 101.744 28.788 101.744 26.02C101.744 23.242 103.384 21.366 105.904 21.366C108.384 21.366 109.954 23.102 109.954 25.78V26.47H103.784V26.6C103.694 27.844 104.624 28.938 105.864 29.04C106.004 29.054 106.144 29.054 106.284 29.04C107.154 29.126 107.984 28.642 108.324 27.84L109.874 27.78ZM103.794 25.136H107.924C107.984 24.002 107.134 23.03 106.004 22.97C105.944 22.966 105.884 22.966 105.824 22.97C104.634 22.942 103.634 23.892 103.604 25.082C103.604 25.1 103.604 25.118 103.604 25.136H103.794Z" fill="white"/>
      <path d="M37.826 8.731C39.13 8.641 40.286 9.617 40.386 10.917C40.394 11.013 40.394 11.111 40.386 11.207C40.386 13.151 39.346 14.271 37.826 14.271H35.726V8.731H37.826ZM36.636 13.439H37.726C38.646 13.495 39.456 12.807 39.516 11.887C39.52 11.829 39.52 11.769 39.516 11.711C39.576 10.791 38.886 9.981 37.966 9.921C37.886 9.915 37.806 9.915 37.726 9.921H36.636V13.439Z" fill="white"/>
      <path d="M41.319 12.168C41.239 11.088 42.049 10.148 43.129 10.068C44.209 9.988 45.149 10.798 45.229 11.878C45.237 11.974 45.237 12.072 45.229 12.168C45.309 13.248 44.499 14.188 43.419 14.268C42.339 14.348 41.399 13.538 41.319 12.458C41.311 12.362 41.311 12.264 41.319 12.168ZM44.349 12.168C44.349 11.268 43.949 10.738 43.269 10.738C42.589 10.738 42.199 11.268 42.199 12.168C42.199 13.078 42.589 13.598 43.269 13.598C43.949 13.598 44.349 13.068 44.349 12.168Z" fill="white"/>
      <path d="M50.579 14.271H49.689L48.789 11.211H48.719L47.829 14.271H46.949L45.759 10.168H46.629L47.399 13.348H47.469L48.359 10.168H49.179L50.069 13.348H50.139L50.899 10.168H51.769L50.579 14.271Z" fill="white"/>
      <path d="M52.699 10.168H53.539V10.858H53.609C53.819 10.368 54.319 10.058 54.859 10.098C55.539 10.048 56.149 10.548 56.199 11.228C56.207 11.314 56.207 11.402 56.199 11.488V14.271H55.329V11.688C55.329 11.028 55.029 10.738 54.439 10.738C53.849 10.738 53.569 11.108 53.569 11.768V14.271H52.699V10.168Z" fill="white"/>
      <path d="M57.549 8.438H58.419V14.271H57.549V8.438Z" fill="white"/>
      <path d="M59.509 12.168C59.429 11.088 60.239 10.148 61.319 10.068C62.399 9.988 63.339 10.798 63.419 11.878C63.427 11.974 63.427 12.072 63.419 12.168C63.499 13.248 62.689 14.188 61.609 14.268C60.529 14.348 59.589 13.538 59.509 12.458C59.501 12.362 59.501 12.264 59.509 12.168ZM62.539 12.168C62.539 11.268 62.139 10.738 61.459 10.738C60.779 10.738 60.389 11.268 60.389 12.168C60.389 13.078 60.779 13.598 61.459 13.598C62.139 13.598 62.539 13.068 62.539 12.168Z" fill="white"/>
      <path d="M64.319 13.068C64.319 12.318 64.869 11.888 65.859 11.818L66.989 11.748V11.388C66.989 10.958 66.689 10.718 66.149 10.718C65.709 10.718 65.379 10.878 65.289 11.158H64.449C64.529 10.438 65.199 9.968 66.189 9.968C67.289 9.968 67.849 10.468 67.849 11.388V14.271H67.009V13.661H66.939C66.669 14.091 66.169 14.341 65.649 14.311C64.949 14.381 64.329 13.861 64.259 13.161C64.255 13.131 64.255 13.099 64.259 13.068H64.319ZM66.989 12.718V12.368L65.979 12.438C65.419 12.478 65.179 12.668 65.179 13.018C65.179 13.378 65.489 13.588 65.919 13.588C66.479 13.648 66.979 13.238 67.039 12.678C67.041 12.658 67.041 12.638 67.039 12.618L66.989 12.718Z" fill="white"/>
      <path d="M68.889 12.168C68.889 10.888 69.549 10.088 70.529 10.088C71.029 10.062 71.499 10.332 71.719 10.778H71.789V8.438H72.659V14.271H71.819V13.581H71.749C71.499 14.011 71.039 14.271 70.549 14.251C69.539 14.251 68.889 13.451 68.889 12.168ZM69.789 12.168C69.789 13.048 70.199 13.578 70.869 13.578C71.529 13.578 71.949 13.038 71.949 12.168C71.949 11.298 71.529 10.758 70.869 10.758C70.199 10.758 69.789 11.298 69.789 12.168Z" fill="white"/>
      <path d="M76.099 12.168C76.019 11.088 76.829 10.148 77.909 10.068C78.989 9.988 79.929 10.798 80.009 11.878C80.017 11.974 80.017 12.072 80.009 12.168C80.089 13.248 79.279 14.188 78.199 14.268C77.119 14.348 76.179 13.538 76.099 12.458C76.091 12.362 76.091 12.264 76.099 12.168ZM79.129 12.168C79.129 11.268 78.729 10.738 78.049 10.738C77.369 10.738 76.979 11.268 76.979 12.168C76.979 13.078 77.369 13.598 78.049 13.598C78.729 13.598 79.129 13.068 79.129 12.168Z" fill="white"/>
      <path d="M81.049 10.168H81.889V10.858H81.959C82.169 10.368 82.669 10.058 83.209 10.098C83.889 10.048 84.499 10.548 84.549 11.228C84.557 11.314 84.557 11.402 84.549 11.488V14.271H83.679V11.688C83.679 11.028 83.379 10.738 82.789 10.738C82.199 10.738 81.919 11.108 81.919 11.768V14.271H81.049V10.168Z" fill="white"/>
      <path d="M88.879 8.978V10.198H89.849V10.928H88.879V12.988C88.879 13.388 89.049 13.568 89.429 13.568C89.569 13.568 89.709 13.558 89.849 13.538V14.258C89.649 14.294 89.449 14.314 89.249 14.318C88.289 14.318 87.999 14.058 87.999 13.188V10.928H87.279V10.198H87.999V8.978H88.879Z" fill="white"/>
      <path d="M90.969 8.438H91.829V10.788H91.899C92.119 10.296 92.629 9.982 93.179 10.018C93.855 9.978 94.461 10.478 94.509 11.154C94.515 11.232 94.515 11.31 94.509 11.388V14.271H93.639V11.688C93.639 11.038 93.309 10.738 92.749 10.738C92.189 10.738 91.839 11.108 91.839 11.768V14.271H90.969V8.438Z" fill="white"/>
      <path d="M99.489 13.138C99.269 13.878 98.549 14.358 97.779 14.298C96.749 14.328 95.889 13.518 95.859 12.488C95.857 12.378 95.867 12.268 95.889 12.158C95.749 11.098 96.509 10.128 97.569 9.988C97.639 9.978 97.709 9.974 97.779 9.974C98.969 9.974 99.669 10.798 99.669 12.118V12.418H96.749V12.468C96.699 13.148 97.199 13.738 97.879 13.788C97.929 13.792 97.979 13.792 98.029 13.788C98.449 13.838 98.859 13.618 99.039 13.238L99.489 13.138ZM96.749 11.768H98.779C98.819 11.158 98.359 10.628 97.749 10.588C97.719 10.586 97.689 10.586 97.659 10.588C97.029 10.578 96.499 11.098 96.489 11.728C96.489 11.742 96.489 11.754 96.489 11.768H96.749Z" fill="white"/>
    </svg>
  );
}

function TrendUpIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  );
}

function CodeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  );
}

function UsersIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function BuildingIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </svg>
  );
}

function HeartHandIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

// ============================================================================
// ERS Ring Visualization
// ============================================================================

function ERSRingVisual() {
  const score = 72;
  const circumference = 2 * Math.PI * 80;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative w-[200px] h-[200px]">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
        {/* Background ring */}
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="#F3EFE9"
          strokeWidth="12"
        />
        {/* Progress ring */}
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="#5B8A72"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[42px] font-bold"
          style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
        >
          {score}
        </span>
        <span className="text-[13px]" style={{ color: '#9A938A' }}>
          ERS Score
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Phone Mockup Component
// ============================================================================

function PhoneMockup() {
  const score = 67;
  const circumference = 2 * Math.PI * 38;
  const progress = (score / 100) * circumference;

  return (
    <div
      className="relative mt-12 lg:mt-16 flex justify-center lg:justify-start"
      style={{
        animation: 'float 4s ease-in-out infinite',
      }}
    >
      {/* Glow effect behind phone */}
      <div
        className="absolute inset-0 flex justify-center lg:justify-start"
        style={{
          background: 'radial-gradient(ellipse 300px 400px at center, rgba(91,138,114,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Phone frame */}
      <svg
        viewBox="0 0 280 560"
        className="w-[220px] h-[440px] sm:w-[260px] sm:h-[520px] lg:w-[280px] lg:h-[560px]"
        style={{
          filter: 'drop-shadow(0 20px 60px rgba(91,138,114,0.15))',
        }}
      >
        {/* Phone body */}
        <rect
          x="0"
          y="0"
          width="280"
          height="560"
          rx="40"
          fill="#FFFFFF"
          stroke="#E8E2DA"
          strokeWidth="2"
        />

        {/* Screen area */}
        <rect
          x="12"
          y="12"
          width="256"
          height="536"
          rx="32"
          fill="#F9F6F2"
        />

        {/* Status bar */}
        <g>
          {/* Time */}
          <text x="28" y="38" fontSize="12" fontWeight="600" fill="#1F1D1A">9:41</text>
          {/* Signal dots */}
          <circle cx="220" cy="34" r="2" fill="#5B8A72" />
          <circle cx="228" cy="34" r="2" fill="#5B8A72" />
          <circle cx="236" cy="34" r="2" fill="#5B8A72" />
          <circle cx="244" cy="34" r="2" fill="#9A938A" />
          {/* Battery */}
          <rect x="252" y="30" width="16" height="8" rx="2" fill="none" stroke="#1F1D1A" strokeWidth="1" />
          <rect x="254" y="32" width="10" height="4" rx="1" fill="#5B8A72" />
        </g>

        {/* Greeting */}
        <text x="28" y="80" fontSize="14" fill="#9A938A">Good morning,</text>
        <text x="28" y="100" fontSize="18" fontWeight="600" fill="#1F1D1A">Sarah</text>

        {/* ERS Card */}
        <rect x="20" y="120" width="240" height="200" rx="20" fill="#FFFFFF" />

        {/* ERS Ring - centered in card */}
        <g transform="translate(140, 200)">
          {/* Track */}
          <circle
            cx="0"
            cy="0"
            r="38"
            fill="none"
            stroke="#F0EBE4"
            strokeWidth="8"
          />
          {/* Progress - animated via CSS */}
          <circle
            cx="0"
            cy="0"
            r="38"
            fill="none"
            stroke="#5B8A72"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            transform="rotate(-90)"
            style={{
              animation: 'ersRingFill 1.5s ease-out forwards',
            }}
          />
          {/* Score text */}
          <text
            x="0"
            y="6"
            textAnchor="middle"
            fontSize="28"
            fontWeight="700"
            fill="#1F1D1A"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {score}
          </text>
        </g>

        {/* Stage label */}
        <rect x="100" y="258" width="80" height="24" rx="12" fill="rgba(91,138,114,0.1)" />
        <text x="140" y="274" textAnchor="middle" fontSize="11" fontWeight="500" fill="#5B8A72">Rebuilding</text>

        {/* Stat cards row */}
        <g transform="translate(20, 340)">
          {/* Streak card */}
          <rect x="0" y="0" width="115" height="60" rx="12" fill="#FFFFFF" />
          {/* Flame icon */}
          <circle cx="20" cy="30" r="12" fill="rgba(212,151,59,0.1)" />
          <text x="20" y="34" textAnchor="middle" fontSize="12">🔥</text>
          <text x="42" y="26" fontSize="10" fill="#9A938A">Streak</text>
          <text x="42" y="42" fontSize="14" fontWeight="600" fill="#1F1D1A">7 days</text>

          {/* Mood card */}
          <rect x="125" y="0" width="115" height="60" rx="12" fill="#FFFFFF" />
          {/* Up arrow icon */}
          <circle cx="145" cy="30" r="12" fill="rgba(91,138,114,0.1)" />
          <path d="M145 35 L145 25 M141 29 L145 25 L149 29" stroke="#5B8A72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <text x="167" y="26" fontSize="10" fill="#9A938A">Mood</text>
          <text x="167" y="42" fontSize="14" fontWeight="600" fill="#5B8A72">Good</text>
        </g>

        {/* Quick mood log hint */}
        <rect x="20" y="420" width="240" height="50" rx="14" fill="#FFFFFF" />
        <text x="40" y="450" fontSize="13" fontWeight="500" fill="#1F1D1A">How are you feeling?</text>
        <circle cx="230" cy="445" r="14" fill="rgba(91,138,114,0.1)" />
        <text x="230" y="450" textAnchor="middle" fontSize="14">+</text>

        {/* Bottom nav hint */}
        <g transform="translate(0, 490)">
          <rect x="20" y="0" width="240" height="50" rx="0" fill="#F9F6F2" />
          <circle cx="60" cy="25" r="4" fill="#5B8A72" />
          <circle cx="110" cy="25" r="4" fill="#D4D0C8" />
          <circle cx="170" cy="25" r="4" fill="#D4D0C8" />
          <circle cx="220" cy="25" r="4" fill="#D4D0C8" />
        </g>

        {/* Home indicator */}
        <rect x="105" y="530" width="70" height="5" rx="2.5" fill="#1F1D1A" opacity="0.2" />
      </svg>

      {/* CSS Keyframes - injected via style tag */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes ersRingFill {
          from { stroke-dashoffset: ${circumference}; }
          to { stroke-dashoffset: ${circumference - progress}; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Product Preview Tabs
// ============================================================================

type PreviewTab = 'dashboard' | 'chat' | 'progress';

function ProductPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('dashboard');

  const tabs: { id: PreviewTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'chat', label: 'Talk to Pace' },
    { id: 'progress', label: 'Your progress' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-8 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-6 py-2.5 rounded-full text-[14px] font-medium transition-all"
            style={{
              background: activeTab === tab.id ? '#5B8A72' : 'transparent',
              color: activeTab === tab.id ? '#FFFFFF' : '#5C574F',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'rgba(91,138,114,0.06)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preview Container */}
      <div className="max-w-[480px] mx-auto">
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: '#FFFFFF',
            border: '1px solid #F0EBE4',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            height: '520px',
          }}
        >
          {/* Dashboard Preview */}
          <div
            style={{
              opacity: activeTab === 'dashboard' ? 1 : 0,
              transition: 'opacity 0.3s ease',
              display: activeTab === 'dashboard' ? 'block' : 'none',
            }}
          >
            <DashboardPreview />
          </div>

          {/* Chat Preview */}
          <div
            style={{
              opacity: activeTab === 'chat' ? 1 : 0,
              transition: 'opacity 0.3s ease',
              display: activeTab === 'chat' ? 'block' : 'none',
            }}
          >
            <ChatPreview />
          </div>

          {/* Progress Preview */}
          <div
            style={{
              opacity: activeTab === 'progress' ? 1 : 0,
              transition: 'opacity 0.3s ease',
              display: activeTab === 'progress' ? 'block' : 'none',
            }}
          >
            <ProgressPreview />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  const score = 67;
  const circumference = 2 * Math.PI * 50;
  const progress = (score / 100) * circumference;

  return (
    <div className="p-6" style={{ background: '#F9F6F2', height: '520px' }}>
      {/* Header */}
      <div className="mb-6">
        <p className="text-[13px] mb-1" style={{ color: '#9A938A' }}>Good morning,</p>
        <p className="text-[20px] font-semibold" style={{ color: '#1F1D1A' }}>Sarah</p>
      </div>

      {/* ERS Card */}
      <div
        className="rounded-2xl p-5 mb-4"
        style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
      >
        <div className="flex items-center gap-6">
          {/* Ring */}
          <div className="relative w-[100px] h-[100px] flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#F0EBE4" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50" fill="none" stroke="#5B8A72" strokeWidth="10"
                strokeLinecap="round" strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[28px] font-bold" style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}>{score}</span>
            </div>
          </div>
          {/* Stats */}
          <div className="flex-1">
            <div
              className="inline-block px-3 py-1 rounded-full text-[11px] font-medium mb-2"
              style={{ background: 'rgba(91,138,114,0.1)', color: '#5B8A72' }}
            >
              Rebuilding
            </div>
            <p className="text-[13px]" style={{ color: '#9A938A' }}>7 day streak</p>
          </div>
        </div>
      </div>

      {/* Mood Selector */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
      >
        <p className="text-[14px] font-medium mb-3" style={{ color: '#1F1D1A' }}>How are you feeling?</p>
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[13px]"
              style={{
                background: i === 4 ? '#5B8A72' : '#F3EFE9',
                color: i === 4 ? '#FFFFFF' : '#5C574F',
              }}
            >
              {i}
            </div>
          ))}
        </div>
      </div>

      {/* Insight Card */}
      <div
        className="rounded-2xl p-4"
        style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,151,59,0.1)' }}
          >
            <SparkleIcon className="w-4 h-4" style={{ color: '#D4973B' }} />
          </div>
          <div>
            <p className="text-[13px] font-medium mb-1" style={{ color: '#1F1D1A' }}>Weekly insight</p>
            <p className="text-[12px] leading-relaxed" style={{ color: '#9A938A' }}>
              Your mood tends to be highest on days you journal in the morning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="p-6 flex flex-col" style={{ background: '#F9F6F2', height: '520px' }}>
      {/* Header */}
      <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #F0EBE4' }}>
        <p className="text-[16px] font-semibold" style={{ color: '#1F1D1A' }}>Pace</p>
        <p className="text-[12px]" style={{ color: '#9A938A' }}>Your recovery companion</p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-hidden">
        {/* Pace message 1 */}
        <div className="flex gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#5B8A72' }}
          >
            <span className="text-white text-[12px] font-semibold">P</span>
          </div>
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]"
            style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
          >
            <p className="text-[13px] leading-relaxed" style={{ color: '#1F1D1A' }}>
              Hey Sarah. I noticed your mood has been improving this week. What do you think is helping?
            </p>
          </div>
        </div>

        {/* User message */}
        <div className="flex justify-end">
          <div
            className="rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]"
            style={{ background: '#5B8A72' }}
          >
            <p className="text-[13px] leading-relaxed" style={{ color: '#FFFFFF' }}>
              I think journaling before bed is making a difference
            </p>
          </div>
        </div>

        {/* Pace message 2 */}
        <div className="flex gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#5B8A72' }}
          >
            <span className="text-white text-[12px] font-semibold">P</span>
          </div>
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]"
            style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
          >
            <p className="text-[13px] leading-relaxed" style={{ color: '#1F1D1A' }}>
              That&apos;s a real pattern I&apos;m seeing in your data too. Three of your best days followed evening journal entries.
            </p>
          </div>
        </div>

        {/* Typing indicator */}
        <div className="flex gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#5B8A72' }}
          >
            <span className="text-white text-[12px] font-semibold">P</span>
          </div>
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3"
            style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
          >
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-stone-300 animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-stone-300 animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-stone-300 animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Input hint */}
      <div
        className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
      >
        <span className="text-[13px]" style={{ color: '#9A938A' }}>Ask Pace anything...</span>
      </div>
    </div>
  );
}

function ProgressPreview() {
  const dimensions = [
    { label: 'Emotional Stability', score: 72, color: '#5B8A72' },
    { label: 'Self-Reflection', score: 68, color: '#5B8A72' },
    { label: 'Coping Capacity', score: 84, color: '#5B8A72' },
    { label: 'Behavioral Engagement', score: 45, color: '#D4973B' },
    { label: 'Social Readiness', score: 38, color: '#B86B64' },
  ];

  const weeklyData = [42, 48, 55, 67];

  return (
    <div className="p-6" style={{ background: '#F9F6F2', height: '520px' }}>
      {/* Header */}
      <div className="mb-5">
        <p className="text-[18px] font-semibold" style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}>Your ERS Breakdown</p>
      </div>

      {/* Dimension Bars */}
      <div className="space-y-3 mb-5">
        {dimensions.map((dim) => (
          <div key={dim.label}>
            <div className="flex justify-between text-[12px] mb-1">
              <span style={{ color: '#5C574F' }}>{dim.label}</span>
              <span style={{ color: dim.color, fontWeight: 600 }}>{dim.score}</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: '#F0EBE4' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${dim.score}%`, background: dim.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
      >
        <p className="text-[13px] font-medium mb-3" style={{ color: '#1F1D1A' }}>4-Week Trend</p>
        <div className="flex items-end justify-between h-16 gap-2">
          {weeklyData.map((value, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t"
                style={{
                  height: `${(value / 100) * 64}px`,
                  background: i === weeklyData.length - 1 ? '#5B8A72' : '#D4E8DC',
                }}
              />
              <span className="text-[10px]" style={{ color: '#9A938A' }}>W{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Focus Area */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(91,138,114,0.08)', border: '1px solid rgba(91,138,114,0.15)' }}
      >
        <p className="text-[12px] font-medium mb-1" style={{ color: '#5B8A72' }}>Focus area</p>
        <p className="text-[13px]" style={{ color: '#1F1D1A' }}>
          Your coping capacity improved 12 points this week. Keep it up!
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function LandingPage() {
  const scrollMidpointRef = useRef<HTMLDivElement>(null);
  const hasTrackedScroll = useRef(false);
  const howItWorksRef = useRef<HTMLDivElement>(null);

  // Track landing page view
  useEffect(() => {
    trackConversion('landing_view');
  }, []);

  // Track scroll depth at 50%
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasTrackedScroll.current) {
          hasTrackedScroll.current = true;
          trackConversion('scroll_50');
        }
      },
      { threshold: 0.1 }
    );

    if (scrollMidpointRef.current) {
      observer.observe(scrollMidpointRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleCtaClick = (button: string) => {
    trackConversion('cta_click', { button });
  };

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen" style={{ background: '#F9F6F2' }}>
      <MarketingNav />

      {/* Hero Section */}
      <section className="pt-[88px] pb-16 px-6" style={{ background: '#F9F6F2' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium mb-6"
                style={{ background: 'rgba(91,138,114,0.1)', color: '#5B8A72' }}
              >
                Science-backed emotional recovery
              </div>

              {/* Headline */}
              <h1
                className="text-[42px] sm:text-[52px] leading-[1.1] font-bold mb-5"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Heal at your pace.
                <br />
                <span style={{ color: '#D4973B' }}>See the progress.</span>
              </h1>

              {/* Subtitle */}
              <p
                className="text-[17px] leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0"
                style={{ color: '#5C574F' }}
              >
                Track your emotional journey, understand your patterns, and know
                when you&apos;re ready — backed by clinical research.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <Link
                  href="/auth/signup"
                  onClick={() => handleCtaClick('hero')}
                  className="px-7 py-3.5 text-[16px] font-semibold text-white rounded-full transition-opacity hover:opacity-90"
                  style={{ background: '#5B8A72' }}
                >
                  Begin healing
                </Link>
                <button
                  onClick={scrollToHowItWorks}
                  className="px-7 py-3.5 text-[16px] font-semibold rounded-full transition-colors"
                  style={{
                    background: 'transparent',
                    color: '#5B8A72',
                    border: '2px solid #5B8A72',
                  }}
                >
                  See how it works
                </button>
              </div>

              {/* App Store Badge */}
              <div className="mt-6 flex flex-col items-center lg:items-start gap-2">
                <span className="text-[13px] font-medium" style={{ color: '#9A938A' }}>
                  Now available on iOS
                </span>
                <a
                  href="https://apps.apple.com/app/id6759303837"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80"
                  onClick={() => trackConversion('app_store_click', { location: 'hero' })}
                >
                  <AppStoreBadge className="h-[40px] w-auto" />
                </a>
              </div>

            </div>

            {/* Right - Phone Mockup */}
            <div className="flex-shrink-0">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-12 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
            {/* 5 Dimensions */}
            <div className="text-center lg:border-r lg:border-stone-200 lg:pr-8">
              <div
                className="text-[28px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                5 Dimensions
              </div>
              <div className="text-[13px]" style={{ color: '#9A938A' }}>
                Clinical recovery scoring
              </div>
            </div>

            {/* AI-Powered */}
            <div className="text-center lg:border-r lg:border-stone-200 lg:px-8">
              <div
                className="text-[28px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                AI-Powered
              </div>
              <div className="text-[13px]" style={{ color: '#9A938A' }}>
                Pattern recognition
              </div>
            </div>

            {/* Private by design */}
            <div className="text-center lg:border-r lg:border-stone-200 lg:px-8">
              <div
                className="text-[28px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Private
              </div>
              <div className="text-[13px]" style={{ color: '#9A938A' }}>
                Your data stays yours
              </div>
            </div>

            {/* Adaptive */}
            <div className="text-center lg:pl-8">
              <div
                className="text-[28px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Adaptive
              </div>
              <div className="text-[13px]" style={{ color: '#9A938A' }}>
                Gets smarter with you
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scroll tracking midpoint */}
      <div ref={scrollMidpointRef} className="h-0" aria-hidden="true" />

      {/* How It Works */}
      <section ref={howItWorksRef} className="py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[32px] font-bold text-center mb-4"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            How Paceful works
          </h2>
          <p
            className="text-[16px] text-center mb-12 max-w-xl mx-auto"
            style={{ color: '#5C574F' }}
          >
            A simple daily practice that helps you understand your emotional journey.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div
              className="p-6 rounded-[24px]"
              style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
            >
              <div
                className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-semibold mb-4"
                style={{ background: 'rgba(212,151,59,0.1)', color: '#D4973B' }}
              >
                Step 1
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(91,138,114,0.1)' }}
              >
                <HeartIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />
              </div>
              <h3
                className="text-[18px] font-semibold mb-2"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Track daily
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
                Log your mood and journal your thoughts. It takes just a few minutes each day.
              </p>
            </div>

            {/* Step 2 */}
            <div
              className="p-6 rounded-[24px]"
              style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
            >
              <div
                className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-semibold mb-4"
                style={{ background: 'rgba(212,151,59,0.1)', color: '#D4973B' }}
              >
                Step 2
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(91,138,114,0.1)' }}
              >
                <SparkleIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />
              </div>
              <h3
                className="text-[18px] font-semibold mb-2"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Get insights
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
                AI analyzes your patterns to surface personalized insights about your recovery.
              </p>
            </div>

            {/* Step 3 */}
            <div
              className="p-6 rounded-[24px]"
              style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
            >
              <div
                className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-semibold mb-4"
                style={{ background: 'rgba(212,151,59,0.1)', color: '#D4973B' }}
              >
                Step 3
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(91,138,114,0.1)' }}
              >
                <ChartIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />
              </div>
              <h3
                className="text-[18px] font-semibold mb-2"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                See your path
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
                Watch your ERS score grow and see predictions for when you&apos;ll reach each milestone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-20 px-6" style={{ background: '#F9F6F2' }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[32px] font-bold text-center mb-3"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            This isn&apos;t another mood tracker
          </h2>
          <p
            className="text-[16px] text-center mb-12"
            style={{ color: '#9A938A' }}
          >
            Here&apos;s what makes Paceful different
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-[1080px] mx-auto">
            {/* Card 1: It remembers you */}
            <div
              className="rounded-2xl p-7"
              style={{
                background: '#FFFFFF',
                border: '1px solid #F0EBE4',
                borderTop: '3px solid #5B8A72',
                maxWidth: '340px',
                margin: '0 auto',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(91,138,114,0.1)' }}
              >
                <svg className="w-5 h-5" style={{ color: '#5B8A72' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <h3
                className="text-[17px] font-semibold mb-2"
                style={{ color: '#1F1D1A' }}
              >
                It remembers you
              </h3>
              <p
                className="text-[14px] leading-relaxed"
                style={{ color: '#5C574F' }}
              >
                Pace, your AI companion, builds a persistent understanding of your triggers, patterns, and what helps you heal. Every conversation makes it more attuned to you.
              </p>
            </div>

            {/* Card 2: It measures what matters */}
            <div
              className="rounded-2xl p-7"
              style={{
                background: '#FFFFFF',
                border: '1px solid #F0EBE4',
                borderTop: '3px solid #D4973B',
                maxWidth: '340px',
                margin: '0 auto',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(212,151,59,0.1)' }}
              >
                <svg className="w-5 h-5" style={{ color: '#D4973B' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21l3.75-3.75" />
                </svg>
              </div>
              <h3
                className="text-[17px] font-semibold mb-2"
                style={{ color: '#1F1D1A' }}
              >
                It measures what matters
              </h3>
              <p
                className="text-[14px] leading-relaxed"
                style={{ color: '#5C574F' }}
              >
                Most apps track mood. Paceful scores your recovery across 5 clinical dimensions — from emotional stability to coping capacity — so you can see the full picture.
              </p>
            </div>

            {/* Card 3: It gets smarter over time */}
            <div
              className="rounded-2xl p-7"
              style={{
                background: '#FFFFFF',
                border: '1px solid #F0EBE4',
                borderTop: '3px solid #7E9BB8',
                maxWidth: '340px',
                margin: '0 auto',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(126,155,184,0.1)' }}
              >
                <svg className="w-5 h-5" style={{ color: '#7E9BB8' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                </svg>
              </div>
              <h3
                className="text-[17px] font-semibold mb-2"
                style={{ color: '#1F1D1A' }}
              >
                It gets smarter over time
              </h3>
              <p
                className="text-[14px] leading-relaxed"
                style={{ color: '#5C574F' }}
              >
                Every entry feeds our pattern discovery engine. The longer you use Paceful, the more accurate your insights, predictions, and recommendations become.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* See It In Action */}
      <section className="py-20 px-6" style={{ background: '#F3EFE9' }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[32px] font-bold text-center mb-4"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            See it in action
          </h2>
          <p
            className="text-[16px] text-center mb-10 max-w-xl mx-auto"
            style={{ color: '#5C574F' }}
          >
            A daily companion that understands your journey.
          </p>
          <ProductPreview />
        </div>
      </section>

      {/* ERS Explainer */}
      <section className="py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left - Ring */}
            <div className="flex-shrink-0">
              <div className="relative w-[220px] h-[220px]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 220 220">
                  {/* Healing segment */}
                  <circle
                    cx="110"
                    cy="110"
                    r="90"
                    fill="none"
                    stroke="#7E71B5"
                    strokeWidth="16"
                    strokeDasharray={`${(35 / 100) * 2 * Math.PI * 90} ${2 * Math.PI * 90}`}
                    strokeLinecap="round"
                  />
                  {/* Rebuilding segment */}
                  <circle
                    cx="110"
                    cy="110"
                    r="90"
                    fill="none"
                    stroke="#D4973B"
                    strokeWidth="16"
                    strokeDasharray={`${(30 / 100) * 2 * Math.PI * 90} ${2 * Math.PI * 90}`}
                    strokeDashoffset={`-${(35 / 100) * 2 * Math.PI * 90}`}
                    strokeLinecap="round"
                  />
                  {/* Ready segment */}
                  <circle
                    cx="110"
                    cy="110"
                    r="90"
                    fill="none"
                    stroke="#5B8A72"
                    strokeWidth="16"
                    strokeDasharray={`${(35 / 100) * 2 * Math.PI * 90} ${2 * Math.PI * 90}`}
                    strokeDashoffset={`-${(65 / 100) * 2 * Math.PI * 90}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-[14px] font-medium"
                    style={{ color: '#5C574F' }}
                  >
                    ERS
                  </span>
                </div>
              </div>
            </div>

            {/* Right - Content */}
            <div className="flex-1">
              <h2
                className="text-[32px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Your Emotional Readiness Score
              </h2>
              <p
                className="text-[16px] leading-relaxed mb-6"
                style={{ color: '#5C574F' }}
              >
                The ERS is a comprehensive measure of your emotional recovery progress,
                calculated from 6 key dimensions including emotional stability, self-reflection,
                and social readiness.
              </p>

              {/* Three stages */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: '#7E71B5' }}
                  />
                  <span className="text-[14px] font-medium" style={{ color: '#1F1D1A' }}>
                    Healing (0-35)
                  </span>
                  <span className="text-[13px]" style={{ color: '#9A938A' }}>
                    — Processing and understanding
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: '#D4973B' }}
                  />
                  <span className="text-[14px] font-medium" style={{ color: '#1F1D1A' }}>
                    Rebuilding (35-65)
                  </span>
                  <span className="text-[13px]" style={{ color: '#9A938A' }}>
                    — Growing and strengthening
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: '#5B8A72' }}
                  />
                  <span className="text-[14px] font-medium" style={{ color: '#1F1D1A' }}>
                    Ready (65-100)
                  </span>
                  <span className="text-[13px]" style={{ color: '#9A938A' }}>
                    — Emotionally prepared
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features */}
      <section className="py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-[32px] font-bold text-center mb-4"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            Powered by intelligent analysis
          </h2>
          <p
            className="text-[16px] text-center mb-12 max-w-xl mx-auto"
            style={{ color: '#5C574F' }}
          >
            Advanced AI helps you understand your emotional patterns without judgment.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<BrainIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />}
              title="Personalized insights"
              description="AI analyzes your unique patterns to provide tailored guidance for your recovery journey."
            />
            <FeatureCard
              icon={<DocumentIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />}
              title="Sentiment analysis"
              description="Your journal entries are analyzed to understand emotional themes and track progress over time."
            />
            <FeatureCard
              icon={<TrendUpIcon className="w-6 h-6" style={{ color: '#5B8A72' }} />}
              title="Recovery forecast"
              description="Predict when you'll reach each milestone based on your engagement and progress patterns."
            />
          </div>
        </div>
      </section>

      {/* For Platforms Section */}
      <section className="py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
            {/* Left content */}
            <div className="flex-1 lg:max-w-[60%]">
              <p
                className="text-[12px] uppercase tracking-wider mb-3"
                style={{ color: '#9A938A' }}
              >
                For platforms
              </p>
              <h2
                className="text-[28px] font-bold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
              >
                Bring emotional readiness to your users
              </h2>
              <p
                className="text-[15px] leading-relaxed mb-6"
                style={{ color: '#5C574F' }}
              >
                Paceful&apos;s API lets dating apps, therapy platforms, and HR tools integrate
                emotional readiness scoring directly into their products. One API call returns
                a user&apos;s ERS across 5 dimensions.
              </p>
              <div className="flex gap-6">
                <Link
                  href="/api-docs"
                  className="text-[14px] font-medium flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{ color: '#5B8A72' }}
                >
                  Explore the API
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  href="/design-partners"
                  className="text-[14px] font-medium flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{ color: '#5B8A72' }}
                >
                  Become a partner
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right - Code block */}
            <div className="flex-shrink-0 w-full lg:w-auto lg:max-w-[40%]">
              <div
                className="rounded-2xl p-5 font-mono text-[13px] leading-relaxed overflow-x-auto"
                style={{ background: '#1F1D1A' }}
              >
                <p style={{ color: '#9A938A' }}>GET /api/v1/ers/&#123;userId&#125;</p>
                <br />
                <p style={{ color: '#9A938A' }}>&#123;</p>
                <p className="pl-4">
                  <span style={{ color: '#9A938A' }}>&quot;ers_score&quot;</span>
                  <span style={{ color: '#9A938A' }}>: </span>
                  <span style={{ color: '#D4973B' }}>67</span>
                  <span style={{ color: '#9A938A' }}>,</span>
                </p>
                <p className="pl-4">
                  <span style={{ color: '#9A938A' }}>&quot;stage&quot;</span>
                  <span style={{ color: '#9A938A' }}>: </span>
                  <span style={{ color: '#7BA896' }}>&quot;rebuilding&quot;</span>
                  <span style={{ color: '#9A938A' }}>,</span>
                </p>
                <p className="pl-4">
                  <span style={{ color: '#9A938A' }}>&quot;dimensions&quot;</span>
                  <span style={{ color: '#9A938A' }}>: &#123;</span>
                </p>
                <p className="pl-8">
                  <span style={{ color: '#9A938A' }}>&quot;emotional_stability&quot;</span>
                  <span style={{ color: '#9A938A' }}>: </span>
                  <span style={{ color: '#D4973B' }}>72</span>
                  <span style={{ color: '#9A938A' }}>,</span>
                </p>
                <p className="pl-8">
                  <span style={{ color: '#9A938A' }}>&quot;self_reflection&quot;</span>
                  <span style={{ color: '#9A938A' }}>: </span>
                  <span style={{ color: '#D4973B' }}>58</span>
                  <span style={{ color: '#9A938A' }}>,</span>
                </p>
                <p className="pl-8" style={{ color: '#5C574F' }}>...</p>
                <p className="pl-4" style={{ color: '#9A938A' }}>&#125;</p>
                <p style={{ color: '#9A938A' }}>&#125;</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p
                className="text-[36px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
              >
                5
              </p>
              <p className="text-[14px]" style={{ color: '#5C574F' }}>
                ERS dimensions
              </p>
            </div>
            <div>
              <p
                className="text-[36px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
              >
                AI
              </p>
              <p className="text-[14px]" style={{ color: '#5C574F' }}>
                Powered insights
              </p>
            </div>
            <div>
              <p
                className="text-[36px] font-bold mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#5B8A72' }}
              >
                100%
              </p>
              <p className="text-[14px]" style={{ color: '#5C574F' }}>
                Research-backed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6" style={{ background: '#F3EFE9' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-[36px] font-bold mb-4"
            style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
          >
            You don&apos;t have to do this alone
          </h2>
          <p
            className="text-[16px] mb-8"
            style={{ color: '#5C574F' }}
          >
            Paceful gives you the tools, the insights, and a companion that understands your journey.
          </p>
          <Link
            href="/auth/signup"
            onClick={() => handleCtaClick('footer_cta')}
            className="inline-block px-8 py-4 text-[17px] font-semibold text-white rounded-full transition-opacity hover:opacity-90"
            style={{ background: '#5B8A72' }}
          >
            Begin healing — it&apos;s free
          </Link>
          <p className="mt-4 text-[13px]" style={{ color: '#9A938A' }}>
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      <MarketingFooter />

      {/* Mobile spacer for sticky banner */}
      <div className="h-20 lg:hidden" />

      {/* Mobile App Store Sticky Banner */}
      <div
        className="fixed bottom-0 left-0 right-0 lg:hidden z-50 px-4 py-3 flex items-center justify-between gap-3"
        style={{
          background: 'linear-gradient(to right, #3D6B54, #5B8A72)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-white font-semibold text-[14px] truncate">Get the Paceful app</div>
            <div className="text-white/70 text-[12px]">Free on the App Store</div>
          </div>
        </div>
        <a
          href="https://apps.apple.com/app/id6759303837"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: '#FFFFFF', color: '#5B8A72' }}
          onClick={() => trackConversion('app_store_click', { location: 'mobile_sticky' })}
        >
          Download
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// Component: Feature Card
// ============================================================================

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="p-6 rounded-[24px]"
      style={{ background: '#FFFFFF', border: '1px solid #F0EBE4' }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(91,138,114,0.1)' }}
      >
        {icon}
      </div>
      <h3
        className="text-[18px] font-semibold mb-2"
        style={{ fontFamily: "'Fraunces', serif", color: '#1F1D1A' }}
      >
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed" style={{ color: '#5C574F' }}>
        {description}
      </p>
    </div>
  );
}

