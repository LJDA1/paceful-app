/**
 * Generate Paceful One-Pager PDF - Professional + Color v8
 * Clean, corporate, with tasteful color accents
 */

const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

const W = 210;
const H = 297;
const M = 20;
const CW = W - (M * 2);

// Professional palette with color
const C = {
  white: [255, 255, 255],
  black: [17, 17, 17],
  primary: [79, 70, 229],       // Indigo
  primaryDark: [55, 48, 163],
  primaryLight: [238, 237, 253],
  accent: [16, 185, 129],       // Emerald
  accentLight: [236, 253, 245],
  warm: [245, 101, 101],        // Coral
  warmLight: [254, 242, 242],
  text: [38, 38, 38],
  secondary: [82, 82, 91],
  muted: [140, 140, 150],
  border: [228, 228, 231],
  bg: [250, 250, 252],
};

let y = 0;

const setC = rgb => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
const setF = rgb => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
const setD = rgb => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

// ═══════════════════════════════════════════════════════════════
// HEADER WITH COLOR ACCENT
// ═══════════════════════════════════════════════════════════════

// Top color bar
setF(C.primary);
doc.rect(0, 0, W, 4, 'F');

y = M;

// Logo with color
doc.setFontSize(20);
doc.setFont('helvetica', 'bold');
setC(C.primary);
doc.text('paceful', M, y);

// Right side - document type
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
setC(C.muted);
doc.text('B2B Partnership Overview', W - M, y, { align: 'right' });

y += 6;

// Divider
setD(C.border);
doc.setLineWidth(0.3);
doc.line(M, y, W - M, y);

y += 14;

// ═══════════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════════

doc.setFontSize(28);
doc.setFont('helvetica', 'bold');
setC(C.text);
doc.text('Emotional Readiness', M, y);
y += 10;
setC(C.primary);
doc.text('Prediction API', M, y);

y += 12;

doc.setFontSize(11);
doc.setFont('helvetica', 'normal');
setC(C.secondary);
doc.text('Machine learning predictions that help dating apps, mental health platforms,', M, y);
y += 5;
doc.text('and HR systems understand when users are ready for meaningful connections.', M, y);

y += 16;

// ═══════════════════════════════════════════════════════════════
// KEY METRICS - Colored numbers
// ═══════════════════════════════════════════════════════════════

// Border box with accent top
setF(C.primary);
doc.roundedRect(M, y, CW, 3, 1.5, 1.5, 'F');
setD(C.border);
doc.setLineWidth(0.3);
doc.roundedRect(M, y, CW, 26, 2, 2, 'S');

const metrics = [
  { value: '84%', label: 'Prediction Accuracy', color: C.accent },
  { value: '50+', label: 'Active Users', color: C.primary },
  { value: '4,400+', label: 'Data Points Collected', color: C.primary },
  { value: '< 2 days', label: 'Average Integration Time', color: C.accent },
];

const mw = CW / 4;
metrics.forEach((m, i) => {
  const mx = M + (i * mw) + (mw / 2);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  setC(m.color);
  doc.text(m.value, mx, y + 12, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  setC(C.muted);
  doc.text(m.label, mx, y + 19, { align: 'center' });

  // Vertical divider
  if (i < 3) {
    setD(C.border);
    doc.line(M + ((i + 1) * mw), y + 6, M + ((i + 1) * mw), y + 21);
  }
});

y += 36;

// ═══════════════════════════════════════════════════════════════
// TWO COLUMNS: Problem & Solution with color
// ═══════════════════════════════════════════════════════════════

const colW = (CW - 12) / 2;

// Problem box
setF(C.warmLight);
doc.roundedRect(M, y, colW, 38, 3, 3, 'F');
setF(C.warm);
doc.roundedRect(M, y, 3, 38, 1.5, 0, 'F');

doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
setC(C.warm);
doc.text('The Problem', M + 10, y + 10);

doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
setC(C.text);

const problems = [
  'Users matched when emotionally unavailable',
  'No objective way to measure recovery',
  'Burnout detected after it\'s too late',
];

let py = y + 18;
problems.forEach(p => {
  doc.text('•  ' + p, M + 10, py);
  py += 6;
});

// Solution box
const solX = M + colW + 12;
setF(C.accentLight);
doc.roundedRect(solX, y, colW, 38, 3, 3, 'F');
setF(C.accent);
doc.roundedRect(solX, y, 3, 38, 1.5, 0, 'F');

doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
setC(C.accent);
doc.text('The Solution', solX + 10, y + 10);

doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
setC(C.text);

const solutions = [
  'Emotional Readiness Score (0-100)',
  'Timeline, outcome & risk predictions',
  'Simple REST API, real-time results',
];

let sy = y + 18;
solutions.forEach(s => {
  setC(C.accent);
  doc.text('✓', solX + 10, sy);
  setC(C.text);
  doc.text(s, solX + 16, sy);
  sy += 6;
});

y += 46;

// ═══════════════════════════════════════════════════════════════
// TARGET MARKETS
// ═══════════════════════════════════════════════════════════════

doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
setC(C.text);
doc.text('Target Markets', M, y);

y += 8;

const markets = [
  { name: 'Dating Apps', use: 'Filter and prioritize matches based on emotional readiness', dot: C.warm },
  { name: 'Mental Health', use: 'Track patient recovery with objective, data-driven metrics', dot: C.accent },
  { name: 'HR & Wellness', use: 'Identify at-risk employees and enable early intervention', dot: C.primary },
];

markets.forEach((m, i) => {
  // Colored dot
  setF(m.dot);
  doc.circle(M + 3, y + 1, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setC(C.text);
  doc.text(m.name, M + 10, y + 2);

  doc.setFont('helvetica', 'normal');
  setC(C.secondary);
  doc.text(m.use, M + 45, y + 2);

  y += 9;
});

y += 6;

// ═══════════════════════════════════════════════════════════════
// PARTNERSHIP OFFER
// ═══════════════════════════════════════════════════════════════

// Box with gradient-like effect
setF(C.primaryLight);
doc.roundedRect(M, y, CW, 40, 4, 4, 'F');
setF(C.primary);
doc.roundedRect(M, y, 4, 40, 2, 0, 'F');

// Badge
setF(C.primary);
doc.roundedRect(M + 12, y + 6, 52, 7, 3, 3, 'F');
doc.setFontSize(6);
doc.setFont('helvetica', 'bold');
setC(C.white);
doc.text('DESIGN PARTNER PROGRAM', M + 38, y + 11, { align: 'center' });

doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
setC(C.text);
doc.text('We\'re selecting 5 partners for early access with preferred terms:', M + 12, y + 22);

// Benefits with colored checkmarks
const benefits = [
  '60-day free pilot',
  '$2K/mo (vs $5K)',
  'Custom models',
  'Case study'
];

let bx = M + 12;
benefits.forEach(b => {
  setC(C.accent);
  doc.text('✓', bx, y + 32);
  setC(C.text);
  doc.text(b, bx + 5, y + 32);
  bx += 40;
});

// Spots badge
setF(C.primary);
doc.roundedRect(W - M - 28, y + 10, 20, 20, 4, 4, 'F');
doc.setFontSize(16);
doc.setFont('helvetica', 'bold');
setC(C.white);
doc.text('5', W - M - 18, y + 22, { align: 'center' });
doc.setFontSize(6);
doc.text('LEFT', W - M - 18, y + 27, { align: 'center' });

y += 48;

// ═══════════════════════════════════════════════════════════════
// INTEGRATION
// ═══════════════════════════════════════════════════════════════

doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
setC(C.text);
doc.text('Integration Example', M, y);

y += 6;

// Code block with colored accents
setF([25, 25, 35]);
doc.roundedRect(M, y, CW, 18, 3, 3, 'F');

// Dots
[[239, 68, 68], [234, 179, 8], [34, 197, 94]].forEach((col, i) => {
  setF(col);
  doc.circle(M + 8 + (i * 6), y + 5, 1.5, 'F');
});

doc.setFontSize(8);
doc.setFont('courier', 'normal');
setC([147, 197, 253]);
doc.text('POST', M + 24, y + 7);
setC([180, 180, 190]);
doc.text('/api/b2b/predictions', M + 40, y + 7);

setC([134, 239, 172]);
doc.text('→  { "score": 72, "stage": "rebuilding", "ready_in_weeks": 3 }', M + 24, y + 13);

y += 26;

// ═══════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════

// Footer divider with color accent
setF(C.primary);
doc.rect(M, y, 30, 1, 'F');
setF(C.border);
doc.rect(M + 30, y, CW - 30, 0.3, 'F');

y += 10;

// Three column footer
const footerColW = CW / 3;

// Column 1: Next Steps
doc.setFontSize(9);
doc.setFont('helvetica', 'bold');
setC(C.primary);
doc.text('Next Steps', M, y);

doc.setFontSize(8);
doc.setFont('helvetica', 'normal');
setC(C.secondary);
doc.text('1. Schedule intro call (15 min)', M, y + 6);
doc.text('2. Review technical requirements', M, y + 11);
doc.text('3. Begin 60-day pilot', M, y + 16);

// Column 2: Contact
doc.setFontSize(9);
doc.setFont('helvetica', 'bold');
setC(C.primary);
doc.text('Contact', M + footerColW, y);

doc.setFontSize(8);
doc.setFont('helvetica', 'normal');
setC(C.secondary);
doc.text('partners@paceful.com', M + footerColW, y + 6);
doc.text('paceful.vercel.app', M + footerColW, y + 11);

// Column 3: Resources
doc.setFontSize(9);
doc.setFont('helvetica', 'bold');
setC(C.primary);
doc.text('Resources', M + (footerColW * 2), y);

doc.setFontSize(8);
doc.setFont('helvetica', 'normal');
setC(C.secondary);
doc.text('API Docs: /api-docs', M + (footerColW * 2), y + 6);
doc.text('Partner Info: /design-partners', M + (footerColW * 2), y + 11);

// Bottom bar
y = H - 10;

setF(C.primary);
doc.rect(0, H - 6, W, 6, 'F');

doc.setFontSize(7);
doc.setFont('helvetica', 'normal');
setC(C.muted);
doc.text('© 2026 Paceful, Inc.', M, y - 4);
doc.text('Confidential', W - M, y - 4, { align: 'right' });

// Save
const out = path.join(__dirname, 'paceful_one_pager.pdf');
fs.writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
console.log(`✓ Professional + Color v8 generated: ${out}`);
