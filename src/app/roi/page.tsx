'use client';

/**
 * Paceful ROI Calculator — /roi
 */

import React, { useState } from 'react';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 10_000) return `$${Math.round(num / 1000)}K`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${Math.round(num).toLocaleString()}`;
}

function formatDelta(num: number): string {
  return (num >= 0 ? '+' : '−') + formatMoney(Math.abs(num));
}

// ─── Calculations ─────────────────────────────────────────────────────────────

function calcInsurance({ claims, escRate, escCost, regComplaints, regCost, bfExposure, tier }: {
  claims: number; escRate: number; escCost: number; regComplaints: number;
  regCost: number; bfExposure: number; tier: number;
}) {
  const rate = escRate / 100;
  const escSavings = claims * rate * escCost * 0.20;
  const regSavings = regComplaints * regCost * 0.25;
  const bfSavings = bfExposure * 0.15;
  const totalSavings = escSavings + regSavings + bfSavings;
  const netValue = totalSavings - tier;
  const roiMult = tier > 0 ? totalSavings / tier : 0;
  const formula =
    `(${claims.toLocaleString()} × ${(rate * 100).toFixed(1)}% × ${formatMoney(escCost)} × 20%) ` +
    `+ (${regComplaints} × ${formatMoney(regCost)} × 25%) ` +
    `+ (${formatMoney(bfExposure)} × 15%) − ${formatMoney(tier)}`;
  return { escSavings, regSavings, bfSavings, totalSavings, netValue, roiMult, formula };
}

function calcCX({ customers, arpu, churn, tickets, escRate, escCost, tier }: {
  customers: number; arpu: number; churn: number; tickets: number;
  escRate: number; escCost: number; tier: number;
}) {
  const churnRate = churn / 100;
  const escRateDec = escRate / 100;
  const savedCustomers = customers * churnRate * 0.15;
  const churnSavings = savedCustomers * arpu;
  const escSavings = tickets * escRateDec * escCost * 0.25;
  const advSavings = customers * arpu * 0.02;
  const totalValue = churnSavings + escSavings + advSavings;
  const netValue = totalValue - tier;
  const roiMult = tier > 0 ? totalValue / tier : 0;
  const formula =
    `(${Math.round(savedCustomers)} saved × ${formatMoney(arpu)}) ` +
    `+ (${Math.round(tickets * escRateDec).toLocaleString()} escalations × ${formatMoney(escCost)} × 25%) ` +
    `+ (${formatMoney(customers * arpu)} × 2%) − ${formatMoney(tier)}`;
  return { churnSavings, escSavings, advSavings, totalValue, netValue, roiMult, formula };
}

function calcGambling({ players, harmRate, regFine, interventionCost, auditCost, tier }: {
  players: number; harmRate: number; regFine: number; interventionCost: number;
  auditCost: number; tier: number;
}) {
  const rate = harmRate / 100;
  const harmSavings = players * rate * interventionCost * 0.30;
  const regSavings = regFine * 0.20;
  const auditSavings = auditCost * 0.35;
  const totalSavings = harmSavings + regSavings + auditSavings;
  const netValue = totalSavings - tier;
  const roiMult = tier > 0 ? totalSavings / tier : 0;
  const formula =
    `(${players.toLocaleString()} × ${(rate * 100).toFixed(1)}% × ${formatMoney(interventionCost)} × 30%) ` +
    `+ (${formatMoney(regFine)} × 20%) ` +
    `+ (${formatMoney(auditCost)} × 35%) − ${formatMoney(tier)}`;
  return { harmSavings, regSavings, auditSavings, totalSavings, netValue, roiMult, formula };
}

function calcDating({ mau, reportsPerYear, reportCost, safetyChurnPct, arpu, legalExposure, tier }: {
  mau: number; reportsPerYear: number; reportCost: number; safetyChurnPct: number;
  arpu: number; legalExposure: number; tier: number;
}) {
  const churnRate = safetyChurnPct / 100;
  const reportSavings = reportsPerYear * reportCost * 0.35;
  const churnSavings = mau * churnRate * arpu * 0.20;
  const legalSavings = legalExposure * 0.15;
  const totalValue = reportSavings + churnSavings + legalSavings;
  const netValue = totalValue - tier;
  const roiMult = tier > 0 ? totalValue / tier : 0;
  const formula =
    `(${reportsPerYear.toLocaleString()} reports × ${formatMoney(reportCost)} × 35%) ` +
    `+ (${Math.round(mau * churnRate).toLocaleString()} at-risk users × ${formatMoney(arpu)} × 20%) ` +
    `+ (${formatMoney(legalExposure)} × 15%) − ${formatMoney(tier)}`;
  return { reportSavings, churnSavings, legalSavings, totalValue, netValue, roiMult, formula };
}

function calcHealthcare({ patients, dropoutRate, sessionValue, adherenceGap, clinicianHoursPerWeek, clinicianRate, tier }: {
  patients: number; dropoutRate: number; sessionValue: number; adherenceGap: number;
  clinicianHoursPerWeek: number; clinicianRate: number; tier: number;
}) {
  const dropout = dropoutRate / 100;
  const dropoutSavings = patients * dropout * sessionValue * 3 * 0.15;
  const adherenceSavings = patients * (adherenceGap / 100) * sessionValue * 0.20;
  const clinicianSavings = clinicianHoursPerWeek * 52 * clinicianRate * 0.25;
  const totalValue = dropoutSavings + adherenceSavings + clinicianSavings;
  const netValue = totalValue - tier;
  const roiMult = tier > 0 ? totalValue / tier : 0;
  const formula =
    `(${Math.round(patients * dropout)} dropouts × ${formatMoney(sessionValue)} × 3 sessions × 15%) ` +
    `+ (${patients.toLocaleString()} × ${adherenceGap}% gap × ${formatMoney(sessionValue)} × 20%) ` +
    `+ (${clinicianHoursPerWeek}h/wk × 52 × ${formatMoney(clinicianRate)}/hr × 25%) − ${formatMoney(tier)}`;
  return { dropoutSavings, adherenceSavings, clinicianSavings, totalValue, netValue, roiMult, formula };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ROIPage() {
  const [mode, setMode] = useState('insurance');

  const [ins, setIns] = useState({
    claims: 50000, escRate: 8, escCost: 12000, regComplaints: 40,
    regCost: 45000, bfExposure: 750000, tier: 86400,
  });
  const [cx, setCX] = useState({
    customers: 25000, arpu: 1200, churn: 12, tickets: 80000,
    escRate: 6, escCost: 85, tier: 86400,
  });
  const [gambling, setGambling] = useState({
    players: 100000, harmRate: 3, regFine: 500000,
    interventionCost: 200, auditCost: 150000, tier: 86400,
  });
  const [dating, setDating] = useState({
    mau: 200000, reportsPerYear: 12000, reportCost: 40,
    safetyChurnPct: 1.5, arpu: 120, legalExposure: 200000, tier: 86400,
  });
  const [healthcare, setHealthcare] = useState({
    patients: 8000, dropoutRate: 20, sessionValue: 175,
    adherenceGap: 25, clinicianHoursPerWeek: 15, clinicianRate: 150, tier: 86400,
  });

  const insR = calcInsurance(ins);
  const cxR = calcCX(cx);
  const gamblingR = calcGambling(gambling);
  const datingR = calcDating(dating);
  const healthcareR = calcHealthcare(healthcare);

  const setInsField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setIns((prev) => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }));
  const setCXField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setCX((prev) => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }));
  const setGamblingField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setGambling((prev) => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }));
  const setDatingField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDating((prev) => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }));
  const setHealthcareField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setHealthcare((prev) => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }));

  const TIER_OPTIONS = (
    <>
      <option value="86400">Launch Pricing — $7,200/mo ($86.4K/year) — first 5 customers</option>
      <option value="30000">Signal — $2,500/mo ($30K/year)</option>
      <option value="144000">Safeguard — $12,000/mo ($144K/year)</option>
      <option value="480000">Sovereign — from $40,000/mo ($480K/year)</option>
    </>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
      <MarketingNav />

      <main style={{ flex: 1, paddingTop: '72px' }}>
        <style>{`
          .roi-page *, .roi-page *::before, .roi-page *::after { box-sizing: border-box; }
          .roi-page a { text-decoration: none; color: inherit; }
          .roi-page button { font-family: inherit; cursor: pointer; border: none; background: none; }
          .roi-page .header { padding: 4rem 0 3rem; }
          .roi-page .eyebrow { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 11px; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; color: #78716C; margin-bottom: 1.5rem; }
          .roi-page .eyebrow .line { width: 2rem; height: 1px; background: #A8A29E; display: inline-block; }
          .roi-page h1 { font-family: var(--font-fraunces); font-size: 2.5rem; line-height: 1.1; color: #1C1917; margin: 0 0 1rem; letter-spacing: -0.02em; }
          @media (min-width: 1024px) { .roi-page h1 { font-size: 3.5rem; } }
          .roi-page .header .sub { font-size: 1.125rem; color: #57534E; line-height: 1.6; max-width: 42rem; margin: 0; }
          .roi-page .mode-toggle { display: flex; flex-wrap: wrap; gap: 4px; background: #F5F5F4; padding: 4px; border: 1px solid #E7E5E4; margin: 2rem 0 3rem; }
          .roi-page .mode-btn { padding: 0.625rem 1.25rem; font-size: 0.8125rem; font-weight: 500; color: #78716C; transition: all 0.2s; white-space: nowrap; }
          .roi-page .mode-btn.active { background: #1C1917; color: #FAFAF9; }
          .roi-page .calc { display: grid; grid-template-columns: 1fr; gap: 2rem; margin-bottom: 5rem; }
          @media (min-width: 1024px) { .roi-page .calc { grid-template-columns: 1fr 1fr; gap: 3rem; } }
          .roi-page .inputs { background: #FAFAF9; border: 1px solid #E7E5E4; padding: 2rem; }
          @media (min-width: 1024px) { .roi-page .inputs { padding: 2.5rem; } }
          .roi-page .inputs h2 { font-family: var(--font-fraunces); font-size: 1.5rem; color: #1C1917; margin: 0 0 0.5rem; }
          .roi-page .inputs .note { font-size: 0.875rem; color: #78716C; margin: 0 0 2rem; }
          .roi-page .field { margin-bottom: 1.75rem; }
          .roi-page .field label { display: block; font-size: 0.875rem; font-weight: 500; color: #1C1917; margin-bottom: 0.5rem; }
          .roi-page .field .hint { font-size: 0.75rem; color: #78716C; margin-top: 0.375rem; }
          .roi-page .field input, .roi-page .field select {
            width: 100%; padding: 0.75rem 1rem; border: 1px solid #D6D3D1;
            font-size: 1rem; background: #FFFFFF; color: #1C1917; transition: border 0.2s;
            -webkit-appearance: none; appearance: none;
          }
          .roi-page .field input { font-family: 'SF Mono', Monaco, Consolas, monospace; }
          .roi-page .field input:focus, .roi-page .field select:focus { outline: none; border-color: #1C1917; }
          .roi-page .field .prefix-wrap { position: relative; }
          .roi-page .field .prefix { position: absolute; top: 50%; transform: translateY(-50%); color: #78716C; font-family: 'SF Mono', monospace; font-size: 1rem; pointer-events: none; }
          .roi-page .field .prefix.left { left: 1rem; }
          .roi-page .field .prefix.right { right: 1rem; }
          .roi-page .field .has-prefix-left { padding-left: 2rem; }
          .roi-page .field .has-prefix-right { padding-right: 2rem; }
          .roi-page .results { background: #1C1917; color: #FAFAF9; padding: 2rem; }
          @media (min-width: 1024px) { .roi-page .results { padding: 2.5rem; } }
          .roi-page .results-label { font-size: 11px; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; color: #78716C; margin-bottom: 0.75rem; }
          .roi-page .results h2 { font-family: var(--font-fraunces); font-size: 1.5rem; color: #FAFAF9; margin: 0 0 2rem; }
          .roi-page .big-number { margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #44403C; }
          .roi-page .big-number .label { font-size: 0.875rem; color: #A8A29E; margin-bottom: 0.5rem; }
          .roi-page .big-number .value { font-family: var(--font-fraunces); font-size: 4rem; line-height: 1; color: #FBBF24; letter-spacing: -0.02em; }
          @media (min-width: 1024px) { .roi-page .big-number .value { font-size: 5rem; } }
          .roi-page .big-number .value-small { font-size: 1.125rem; color: #A8A29E; margin-left: 0.5rem; }
          .roi-page .big-number .sub-value { font-size: 0.875rem; color: #A8A29E; margin-top: 0.5rem; }
          .roi-page .breakdown { margin-bottom: 2rem; }
          .roi-page .breakdown-item { display: flex; justify-content: space-between; align-items: baseline; padding: 0.875rem 0; border-bottom: 1px solid #292524; }
          .roi-page .breakdown-item:last-child { border-bottom: none; }
          .roi-page .breakdown-item .key { font-size: 0.875rem; color: #D6D3D1; }
          .roi-page .breakdown-item .val { font-family: 'SF Mono', monospace; font-size: 0.875rem; color: #FAFAF9; font-weight: 500; }
          .roi-page .breakdown-item .val.positive { color: #4ADE80; }
          .roi-page .breakdown-item .val.negative { color: #F87171; }
          .roi-page .net-row { display: flex; justify-content: space-between; align-items: baseline; padding: 1rem 0 0; margin-top: 0.5rem; border-top: 1px solid #44403C; }
          .roi-page .net-row .key { font-size: 0.875rem; font-weight: 500; color: #FBBF24; text-transform: uppercase; letter-spacing: 0.1em; }
          .roi-page .net-row .val { font-family: var(--font-fraunces); font-size: 1.75rem; color: #FBBF24; }
          .roi-page .roi-line { margin-top: 2rem; padding: 1rem 1.25rem; background: #292524; border-left: 3px solid #FBBF24; }
          .roi-page .roi-line .label { font-size: 0.75rem; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: #78716C; margin-bottom: 0.375rem; }
          .roi-page .roi-line .formula { font-family: 'SF Mono', monospace; font-size: 0.8rem; color: #E7E5E4; line-height: 1.6; word-break: break-word; }
          .roi-page .assumptions { background: #F5F5F4; padding: 2.5rem; margin-bottom: 4rem; border-left: 3px solid #1C1917; }
          .roi-page .assumptions h3 { font-family: var(--font-fraunces); font-size: 1.25rem; color: #1C1917; margin: 0 0 1rem; }
          .roi-page .assumptions ul { margin: 0; padding: 0 0 0 1.25rem; }
          .roi-page .assumptions li { font-size: 0.875rem; color: #57534E; line-height: 1.7; margin-bottom: 0.5rem; }
          .roi-page .assumptions .source { font-size: 0.75rem; color: #A8A29E; margin-top: 1rem; font-style: italic; }
          .roi-page .cta-section { text-align: center; padding: 3rem 0 5rem; }
          .roi-page .cta-section h3 { font-family: var(--font-fraunces); font-size: 2rem; color: #1C1917; margin: 0 0 1rem; }
          .roi-page .cta-section p { font-size: 1rem; color: #57534E; max-width: 32rem; margin: 0 auto 2rem; line-height: 1.6; }
          .roi-page .cta-buttons { display: flex; flex-direction: column; gap: 0.75rem; justify-content: center; align-items: center; }
          @media (min-width: 640px) { .roi-page .cta-buttons { flex-direction: row; } }
          .roi-page .cta-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.875rem 2rem; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
          .roi-page .cta-btn.primary { background: #1C1917; color: #FAFAF9; }
          .roi-page .cta-btn.primary:hover { background: #292524; }
          .roi-page .cta-btn.outline { border: 1px solid #1C1917; color: #1C1917; }
          .roi-page .cta-btn.outline:hover { background: #1C1917; color: #FAFAF9; }
          .roi-page .mode-panel { display: none; }
          .roi-page .mode-panel.active { display: block; }
        `}</style>

        <div className="roi-page">
          {/* ── HEADER ── */}
          <section className="header wrap">
            <div className="eyebrow">
              <span className="line" />
              Value Calculator
            </div>
            <h1>
              See what Paceful is worth
              <br />
              <em style={{ fontFamily: "var(--font-fraunces)", fontStyle: 'italic', color: '#57534E' }}>
                to your business.
              </em>
            </h1>
            <p className="sub">
              Plug in your numbers. See what one avoided bad-faith verdict, churned customer, or regulator
              complaint is costing you today — and what Paceful prevents.
            </p>

            <div className="mode-toggle">
              <button className={`mode-btn${mode === 'insurance' ? ' active' : ''}`} onClick={() => setMode('insurance')}>Insurance Claims</button>
              <button className={`mode-btn${mode === 'cx' ? ' active' : ''}`} onClick={() => setMode('cx')}>Customer Experience</button>
              <button className={`mode-btn${mode === 'gambling' ? ' active' : ''}`} onClick={() => setMode('gambling')}>Gambling Safeguarding</button>
              <button className={`mode-btn${mode === 'dating' ? ' active' : ''}`} onClick={() => setMode('dating')}>Dating Safety</button>
              <button className={`mode-btn${mode === 'healthcare' ? ' active' : ''}`} onClick={() => setMode('healthcare')}>Healthcare & Therapy</button>
            </div>
          </section>

          {/* ═══════════════ INSURANCE PANEL ═══════════════ */}
          <section className={`wrap mode-panel${mode === 'insurance' ? ' active' : ''}`}>
            <div className="calc">
              <div className="inputs">
                <h2>Your claims operations</h2>
                <p className="note">Conservative defaults loaded. Adjust based on your actual numbers.</p>
                <div className="field"><label>Annual claims volume</label><input type="number" value={ins.claims} min="1000" step="1000" onChange={setInsField('claims')} /><div className="hint">Total claims your team handles per year</div></div>
                <div className="field"><label>Average escalation rate</label><div className="prefix-wrap"><input type="number" value={ins.escRate} min="0.1" max="50" step="0.1" onChange={setInsField('escRate')} className="has-prefix-right" /><span className="prefix right">%</span></div><div className="hint">% of claims escalated to supervisor, legal, or regulator review</div></div>
                <div className="field"><label>Avg cost per escalated claim</label><div className="prefix-wrap"><span className="prefix left">$</span><input type="number" value={ins.escCost} min="100" step="500" onChange={setInsField('escCost')} className="has-prefix-left" /></div><div className="hint">Staff hours, legal review, settlement inflation per escalation</div></div>
                <div className="field"><label>Annual regulatory complaints</label><input type="number" value={ins.regComplaints} min="0" step="1" onChange={setInsField('regComplaints')} /><div className="hint">DOI filings, ombudsman cases, formal complaints</div></div>
                <div className="field"><label>Avg cost per regulatory complaint</label><div className="prefix-wrap"><span className="prefix left">$</span><input type="number" value={ins.regCost} min="1000" step="1000" onChange={setInsField('regCost')} className="has-prefix-left" /></div><div className="hint">Investigation time, response preparation, potential fines</div></div>
                <div className="field"><label>Annual bad-faith exposure (expected value)</label><div className="prefix-wrap"><span className="prefix left">$</span><input type="number" value={ins.bfExposure} min="0" step="10000" onChange={setInsField('bfExposure')} className="has-prefix-left" /></div><div className="hint">Expected value of bad-faith verdicts × probability (industry avg: $500K–$3M)</div></div>
                <div className="field"><label>Paceful tier</label><select value={String(ins.tier)} onChange={setInsField('tier')}>{TIER_OPTIONS}</select></div>
              </div>
              <div className="results">
                <div className="results-label">Projected annual impact</div>
                <h2>Your savings with Paceful</h2>
                <div className="big-number"><div className="label">Estimated annual savings</div><div className="value">{formatMoney(insR.totalSavings)}<span className="value-small">/year</span></div><div className="sub-value">{insR.roiMult.toFixed(1)}x ROI on Paceful investment</div></div>
                <div className="breakdown">
                  <div className="breakdown-item"><span className="key">Escalation prevention</span><span className="val positive">{formatDelta(insR.escSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Regulatory complaint reduction</span><span className="val positive">{formatDelta(insR.regSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Bad-faith exposure reduction</span><span className="val positive">{formatDelta(insR.bfSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Paceful investment</span><span className="val negative">−{formatMoney(ins.tier)}</span></div>
                  <div className="net-row"><span className="key">Net annual value</span><span className="val">{insR.netValue >= 0 ? '+' : '−'}{formatMoney(Math.abs(insR.netValue))}</span></div>
                </div>
                <div className="roi-line"><div className="label">The math</div><div className="formula">{insR.formula}</div></div>
              </div>
            </div>
            <div className="assumptions">
              <h3>The assumptions behind these numbers</h3>
              <ul>
                <li><strong>20% escalation reduction.</strong> Conservative. Early partners report 25–35% reductions after 90 days of adjuster training on Paceful signals.</li>
                <li><strong>25% regulatory complaint reduction.</strong> Based on early identification of escalation-intent language before complaints are filed.</li>
                <li><strong>15% bad-faith exposure reduction.</strong> Assumes Paceful catches 1 in 6 communication patterns matching historical bad-faith precedents.</li>
                <li><strong>Industry data:</strong> 62.5% of insurance complaints filed in 2024 were claims handling issues. Bad-faith verdicts in 2025 ranged from $2.8M (Farmers) to $145M (Norguard).</li>
              </ul>
              <p className="source">All assumptions are intentionally conservative. Actual customer outcomes vary based on integration depth and team adoption.</p>
            </div>
          </section>

          {/* ═══════════════ CX PANEL ═══════════════ */}
          <section className={`wrap mode-panel${mode === 'cx' ? ' active' : ''}`}>
            <div className="calc">
              <div className="inputs">
                <h2>Your support operations</h2>
                <p className="note">Conservative defaults loaded. Adjust based on your actual numbers.</p>
                <div className="field"><label>Active customers</label><input type="number" value={cx.customers} min="100" step="100" onChange={setCXField('customers')} /><div className="hint">Total paying customers in your base</div></div>
                <div className="field"><label>Average revenue per customer (ARPU)</label><div className="prefix-wrap"><span className="prefix left">$</span><input type="number" value={cx.arpu} min="10" step="50" onChange={setCXField('arpu')} className="has-prefix-left" /></div><div className="hint">Annual revenue per customer</div></div>
                <div className="field"><label>Annual churn rate</label><div className="prefix-wrap"><input type="number" value={cx.churn} min="0.1" max="50" step="0.1" onChange={setCXField('churn')} className="has-prefix-right" /><span className="prefix right">%</span></div><div className="hint">% of customers who leave per year</div></div>
                <div className="field"><label>Annual support tickets</label><input type="number" value={cx.tickets} min="1000" step="1000" onChange={setCXField('tickets')} /><div className="hint">Total tickets across all channels</div></div>
                <div className="field"><label>% tickets escalated to senior/manager</label><div className="prefix-wrap"><input type="number" value={cx.escRate} min="0.1" max="50" step="0.1" onChange={setCXField('escRate')} className="has-prefix-right" /><span className="prefix right">%</span></div><div className="hint">Tickets requiring supervisor or team lead involvement</div></div>
                <div className="field"><label>Avg cost per escalated ticket</label><div className="prefix-wrap"><span className="prefix left">$</span><input type="number" value={cx.escCost} min="10" step="5" onChange={setCXField('escCost')} className="has-prefix-left" /></div><div className="hint">Extra agent time, manager time, follow-up cost</div></div>
                <div className="field"><label>Paceful tier</label><select value={String(cx.tier)} onChange={setCXField('tier')}>{TIER_OPTIONS}</select></div>
              </div>
              <div className="results">
                <div className="results-label">Projected annual impact</div>
                <h2>Your savings with Paceful</h2>
                <div className="big-number"><div className="label">Estimated annual value</div><div className="value">{formatMoney(cxR.totalValue)}<span className="value-small">/year</span></div><div className="sub-value">{cxR.roiMult.toFixed(1)}x ROI on Paceful investment</div></div>
                <div className="breakdown">
                  <div className="breakdown-item"><span className="key">Churn reduction (retention)</span><span className="val positive">{formatDelta(cxR.churnSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Escalation cost reduction</span><span className="val positive">{formatDelta(cxR.escSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Advocacy/referral lift</span><span className="val positive">{formatDelta(cxR.advSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Paceful investment</span><span className="val negative">−{formatMoney(cx.tier)}</span></div>
                  <div className="net-row"><span className="key">Net annual value</span><span className="val">{cxR.netValue >= 0 ? '+' : '−'}{formatMoney(Math.abs(cxR.netValue))}</span></div>
                </div>
                <div className="roi-line"><div className="label">The math</div><div className="formula">{cxR.formula}</div></div>
              </div>
            </div>
            <div className="assumptions">
              <h3>The assumptions behind these numbers</h3>
              <ul>
                <li><strong>15% churn reduction.</strong> Assumes Paceful flags at-risk customers in time for retention intervention on ~15% of would-be churners.</li>
                <li><strong>25% escalation cost reduction.</strong> Real-time trajectory analysis prevents Tier-1 tickets from becoming Tier-3 escalations.</li>
                <li><strong>2% revenue lift from advocacy.</strong> Recovery opportunities and advocacy signals identify customers who become net promoters and drive referrals.</li>
                <li><strong>Industry data:</strong> 65% of Tier-1 support is now AI-resolved, meaning 80%+ of human-handled cases are emotionally complex. AI customer service market projected at $15.1B in 2026.</li>
              </ul>
              <p className="source">All assumptions are intentionally conservative. Actual customer outcomes vary based on integration depth and team adoption.</p>
            </div>
          </section>

          {/* ═══════════════ GAMBLING PANEL ═══════════════ */}
          <section className={`wrap mode-panel${mode === 'gambling' ? ' active' : ''}`}>
            <div className="calc">
              <div className="inputs">
                <h2>Your player operations</h2>
                <p className="note">Conservative defaults loaded. Adjust based on your platform scale.</p>
                <div className="field"><label>Annual active player accounts</label><input type="number" value={gambling.players} min="1000" step="1000" onChange={setGamblingField('players')} /><div className="hint">Total unique accounts placing bets per year</div></div>
                <div className="field"><label>% of players showing harm indicators</label><div className="prefix-wrap"><input type="number" value={gambling.harmRate} min="0.1" max="20" step="0.1" onChange={setGamblingField('harmRate')} className="has-prefix-right" /><span className="prefix right">%</span></div><div className="hint">Industry average: 2–4% of active players exhibit problem gambling signals</div></div>
                <div className="field"><label>Expected regulatory fine risk (annual)</label><div className="prefix-wrap"><span className="prefix left">$</span><input type="number" value={gambling.regFine} min="0" step="50000" onChange={setGamblingField('regFine')} className="has-prefix-left" /></div><div className="hint">Expected value of fines from inadequate safeguarding (UK GC, MGA, state regulators)</div></div>
                <div className="field"><label>Avg cost per harm intervention</label><div className="prefix-wrap"><span className="prefix left">$</span><input type="number" value={gambling.interventionCost} min="10" step="10" onChange={setGamblingField('interventionCost')} className="has-prefix-left" /></div><div className="hint">Staff time, outreach, and documentation per flagged player</div></div>
                <div className="field"><label>Annual compliance audit cost</label><div className="prefix-wrap"><span className="prefix left">$</span><input type="number" value={gambling.auditCost} min="0" step="10000" onChange={setGamblingField('auditCost')} className="has-prefix-left" /></div><div className="hint">Third-party audit, internal compliance team time, documentation overhead</div></div>
                <div className="field"><label>Paceful tier</label><select value={String(gambling.tier)} onChange={setGamblingField('tier')}>{TIER_OPTIONS}</select></div>
              </div>
              <div className="results">
                <div className="results-label">Projected annual impact</div>
                <h2>Your savings with Paceful</h2>
                <div className="big-number"><div className="label">Estimated annual savings</div><div className="value">{formatMoney(gamblingR.totalSavings)}<span className="value-small">/year</span></div><div className="sub-value">{gamblingR.roiMult.toFixed(1)}x ROI on Paceful investment</div></div>
                <div className="breakdown">
                  <div className="breakdown-item"><span className="key">Harm intervention savings</span><span className="val positive">{formatDelta(gamblingR.harmSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Regulatory fine risk reduction</span><span className="val positive">{formatDelta(gamblingR.regSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Compliance audit efficiency</span><span className="val positive">{formatDelta(gamblingR.auditSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Paceful investment</span><span className="val negative">−{formatMoney(gambling.tier)}</span></div>
                  <div className="net-row"><span className="key">Net annual value</span><span className="val">{gamblingR.netValue >= 0 ? '+' : '−'}{formatMoney(Math.abs(gamblingR.netValue))}</span></div>
                </div>
                <div className="roi-line"><div className="label">The math</div><div className="formula">{gamblingR.formula}</div></div>
              </div>
            </div>
            <div className="assumptions">
              <h3>The assumptions behind these numbers</h3>
              <ul>
                <li><strong>30% earlier intervention rate.</strong> Paceful signals flag harm-indicative language before it reaches formal complaint stage, enabling earlier and cheaper interventions.</li>
                <li><strong>20% regulatory fine risk reduction.</strong> Documented signal detection and timestamped review records provide auditable evidence of player communication oversight.</li>
                <li><strong>35% compliance audit efficiency gain.</strong> Automated signal logs reduce the manual effort of compiling evidence packs for regulatory review.</li>
                <li><strong>Industry data:</strong> UK Gambling Commission fines totalled £50M+ in 2024. Average fine per operator: £3.5M. Harm intervention cost rises 6× when flagged reactively vs. proactively.</li>
              </ul>
              <p className="source">All assumptions are intentionally conservative. Actual customer outcomes vary based on integration depth and team adoption.</p>
            </div>
          </section>

          {/* ═══════════════ DATING PANEL ═══════════════ */}
          <section className={`wrap mode-panel${mode === 'dating' ? ' active' : ''}`}>
            <div className="calc">
              <div className="inputs">
                <h2>Your trust &amp; safety operations</h2>
                <p className="note">Conservative defaults loaded. Adjust based on your platform scale.</p>
                <div className="field"><label>Monthly active users (MAU)</label><input type="number" value={dating.mau} min="1000" step="10000" onChange={setDatingField('mau')} /><div className="hint">Total active users sending messages per month</div></div>
                <div className="field"><label>Annual T&amp;S escalation reports</label><input type="number" value={dating.reportsPerYear} min="100" step="500" onChange={setDatingField('reportsPerYear')} /><div className="hint">Reports escalated to human T&amp;S review per year</div></div>
                <div className="field"><label>Avg cost per escalated report</label><div className="prefix-wrap"><span className="prefix left">$</span><input type="number" value={dating.reportCost} min="5" step="5" onChange={setDatingField('reportCost')} className="has-prefix-left" /></div><div className="hint">Analyst time, legal review, and documentation per report</div></div>
                <div className="field"><label>Annual churn from safety incidents</label><div className="prefix-wrap"><input type="number" value={dating.safetyChurnPct} min="0.1" max="10" step="0.1" onChange={setDatingField('safetyChurnPct')} className="has-prefix-right" /><span className="prefix right">%</span></div><div className="hint">% of MAU who leave due to harassment or safety concerns per year</div></div>
                <div className="field"><label>Annual revenue per user (ARPU)</label><div className="prefix-wrap"><span className="prefix left">$</span><input type="number" value={dating.arpu} min="10" step="10" onChange={setDatingField('arpu')} className="has-prefix-left" /></div><div className="hint">Average annual subscription revenue per active user</div></div>
                <div className="field"><label>Legal exposure (expected value, annual)</label><div className="prefix-wrap"><span className="prefix left">$</span><input type="number" value={dating.legalExposure} min="0" step="10000" onChange={setDatingField('legalExposure')} className="has-prefix-left" /></div><div className="hint">Expected value of litigation from platform safety failures</div></div>
                <div className="field"><label>Paceful tier</label><select value={String(dating.tier)} onChange={setDatingField('tier')}>{TIER_OPTIONS}</select></div>
              </div>
              <div className="results">
                <div className="results-label">Projected annual impact</div>
                <h2>Your savings with Paceful</h2>
                <div className="big-number"><div className="label">Estimated annual value</div><div className="value">{formatMoney(datingR.totalValue)}<span className="value-small">/year</span></div><div className="sub-value">{datingR.roiMult.toFixed(1)}x ROI on Paceful investment</div></div>
                <div className="breakdown">
                  <div className="breakdown-item"><span className="key">T&amp;S escalation cost reduction</span><span className="val positive">{formatDelta(datingR.reportSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Safety-driven churn prevention</span><span className="val positive">{formatDelta(datingR.churnSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Legal exposure reduction</span><span className="val positive">{formatDelta(datingR.legalSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Paceful investment</span><span className="val negative">−{formatMoney(dating.tier)}</span></div>
                  <div className="net-row"><span className="key">Net annual value</span><span className="val">{datingR.netValue >= 0 ? '+' : '−'}{formatMoney(Math.abs(datingR.netValue))}</span></div>
                </div>
                <div className="roi-line"><div className="label">The math</div><div className="formula">{datingR.formula}</div></div>
              </div>
            </div>
            <div className="assumptions">
              <h3>The assumptions behind these numbers</h3>
              <ul>
                <li><strong>35% T&amp;S cost reduction.</strong> Early signal detection routes lower-severity messages to automated responses, reducing human review load on each escalated report.</li>
                <li><strong>20% safety-churn prevention.</strong> Proactive intervention before harassment escalates prevents 1 in 5 at-risk users from leaving the platform.</li>
                <li><strong>15% legal exposure reduction.</strong> Timestamped signal detection and documented review records demonstrate platform due diligence, reducing litigation success rates.</li>
                <li><strong>Industry data:</strong> 38% of dating app users report experiencing harassment. Safety-related churn is the top cited reason for leaving paid dating platforms (2025 survey data).</li>
              </ul>
              <p className="source">All assumptions are intentionally conservative. Actual customer outcomes vary based on integration depth and team adoption.</p>
            </div>
          </section>

          {/* ═══════════════ HEALTHCARE PANEL ═══════════════ */}
          <section className={`wrap mode-panel${mode === 'healthcare' ? ' active' : ''}`}>
            <div className="calc">
              <div className="inputs">
                <h2>Your clinical operations</h2>
                <p className="note">Conservative defaults loaded. Adjust based on your patient population.</p>
                <div className="field"><label>Active patients / members</label><input type="number" value={healthcare.patients} min="100" step="500" onChange={setHealthcareField('patients')} /><div className="hint">Total patients or members actively engaged in care</div></div>
                <div className="field"><label>Annual treatment dropout rate</label><div className="prefix-wrap"><input type="number" value={healthcare.dropoutRate} min="1" max="60" step="1" onChange={setHealthcareField('dropoutRate')} className="has-prefix-right" /><span className="prefix right">%</span></div><div className="hint">% of patients who disengage from treatment before completion</div></div>
                <div className="field"><label>Average session / appointment value</label><div className="prefix-wrap"><span className="prefix left">$</span><input type="number" value={healthcare.sessionValue} min="50" step="25" onChange={setHealthcareField('sessionValue')} className="has-prefix-left" /></div><div className="hint">Billed rate per therapy session or clinical appointment</div></div>
                <div className="field"><label>Patient adherence gap</label><div className="prefix-wrap"><input type="number" value={healthcare.adherenceGap} min="1" max="60" step="1" onChange={setHealthcareField('adherenceGap')} className="has-prefix-right" /><span className="prefix right">%</span></div><div className="hint">% of patients missing or repeatedly rescheduling sessions</div></div>
                <div className="field"><label>Clinician case-review hours per week</label><input type="number" value={healthcare.clinicianHoursPerWeek} min="1" step="1" onChange={setHealthcareField('clinicianHoursPerWeek')} /><div className="hint">Hours spent per week reviewing patient communications and flagging deterioration</div></div>
                <div className="field"><label>Clinician hourly rate</label><div className="prefix-wrap"><span className="prefix left">$</span><input type="number" value={healthcare.clinicianRate} min="50" step="25" onChange={setHealthcareField('clinicianRate')} className="has-prefix-left" /></div><div className="hint">Fully-loaded hourly cost of clinical staff time</div></div>
                <div className="field"><label>Paceful tier</label><select value={String(healthcare.tier)} onChange={setHealthcareField('tier')}>{TIER_OPTIONS}</select></div>
              </div>
              <div className="results">
                <div className="results-label">Projected annual impact</div>
                <h2>Your savings with Paceful</h2>
                <div className="big-number"><div className="label">Estimated annual value</div><div className="value">{formatMoney(healthcareR.totalValue)}<span className="value-small">/year</span></div><div className="sub-value">{healthcareR.roiMult.toFixed(1)}x ROI on Paceful investment</div></div>
                <div className="breakdown">
                  <div className="breakdown-item"><span className="key">Treatment dropout prevention</span><span className="val positive">{formatDelta(healthcareR.dropoutSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Adherence improvement</span><span className="val positive">{formatDelta(healthcareR.adherenceSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Clinician time recovered</span><span className="val positive">{formatDelta(healthcareR.clinicianSavings)}</span></div>
                  <div className="breakdown-item"><span className="key">Paceful investment</span><span className="val negative">−{formatMoney(healthcare.tier)}</span></div>
                  <div className="net-row"><span className="key">Net annual value</span><span className="val">{healthcareR.netValue >= 0 ? '+' : '−'}{formatMoney(Math.abs(healthcareR.netValue))}</span></div>
                </div>
                <div className="roi-line"><div className="label">The math</div><div className="formula">{healthcareR.formula}</div></div>
              </div>
            </div>
            <div className="assumptions">
              <h3>The assumptions behind these numbers</h3>
              <ul>
                <li><strong>15% dropout prevention.</strong> Early detection of disengagement language and treatment resistance enables clinician outreach before patients formally drop out. Each prevented dropout recovers ~3 sessions of revenue.</li>
                <li><strong>20% adherence improvement.</strong> Distress trajectory signals flag patients at risk of missed sessions, enabling proactive scheduling interventions.</li>
                <li><strong>25% clinician time recovered.</strong> Automated signal flagging replaces manual communication review, freeing clinical time for direct patient care.</li>
                <li><strong>Industry data:</strong> Treatment dropout rates in outpatient mental health average 20–47%. No-show and late-cancellation rates cost US mental health practices an estimated $150B annually.</li>
              </ul>
              <p className="source">All assumptions are intentionally conservative. Actual customer outcomes vary based on integration depth and team adoption.</p>
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="cta-section wrap">
            <h3>These numbers are a starting point.</h3>
            <p>
              The real value depends on your team, your data, and your use case. Let&apos;s walk through it
              together and build a model that matches your actual operation.
            </p>
            <div className="cta-buttons">
              <a href="mailto:hello@paceful.com?subject=ROI%20Calculator%20Follow-up" className="cta-btn primary">
                Book a 20-min working session
              </a>
              <a href="/pricing" className="cta-btn outline">See pricing</a>
            </div>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
