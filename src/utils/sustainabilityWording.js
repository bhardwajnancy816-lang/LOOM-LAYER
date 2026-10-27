/**
 * Computes dynamic sustainability wording and benchmark status based on actual project metrics
 */
export function getSustainabilityWording({
  utilization = 0,
  waste = 0,
  baselineUtilization = null,
  baselineWaste = null,
  utilizationDeltaPp = null,
  fabricSavedMeters = 0,
  fabricSavedKg = 0,
  hasOptimalConvergence = false,
  markerEfficiency = null,
  baselineMarkerEfficiency = null,
  markerDeltaPp = null,
  fabricSavedCm = 0,
  actualCutLengthM = null,
  baselineCutLengthM = null
}) {
  const effectiveDeltaPp = markerDeltaPp !== null && markerDeltaPp !== undefined
    ? markerDeltaPp
    : utilizationDeltaPp;
  const effectiveUtil = markerEfficiency !== null && markerEfficiency !== undefined
    ? markerEfficiency
    : utilization;
  const effectiveBaseUtil = baselineMarkerEfficiency !== null && baselineMarkerEfficiency !== undefined
    ? baselineMarkerEfficiency
    : baselineUtilization;
  const effectiveWaste = Number((100 - effectiveUtil).toFixed(1));
  const isMarkerMode = markerDeltaPp !== null && markerDeltaPp !== undefined;

  let badgeText = 'Real Calculated Benchmark';
  let badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let statusKey = 'no-baseline';
  let impactSummary = '';

  const savedText = fabricSavedCm > 0
    ? `${fabricSavedCm} cm (~${fabricSavedMeters} m)`
    : `${fabricSavedMeters} meters`;

  if (effectiveDeltaPp !== null) {
    if (effectiveDeltaPp > 0) {
      statusKey = 'improved';
      if (hasOptimalConvergence) {
        badgeText = 'Optimal Geometry Reached';
        badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      } else {
        badgeText = `+${effectiveDeltaPp} pp Yield Gain`;
        badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      }
      if (isMarkerMode && baselineCutLengthM && actualCutLengthM) {
        impactSummary = `The nested layout achieved ${effectiveUtil}% active marker efficiency (vs ${effectiveBaseUtil}% baseline marker), delivering a +${effectiveDeltaPp} pp yield improvement and reducing active cut length from ${baselineCutLengthM}m to ${actualCutLengthM}m. This run conserved ~${savedText} (${fabricSavedKg} kg) of pre-consumer textile stock on the bolt.`;
      } else {
        impactSummary = `The nested layout achieved ${effectiveUtil}% material utilization (vs ${effectiveBaseUtil}% unoptimized baseline), delivering a +${effectiveDeltaPp} pp yield improvement and reducing fabric waste to ${effectiveWaste}%. This run conserved ~${fabricSavedMeters} meters (${fabricSavedKg} kg) of pre-consumer textile stock.`;
      }
    } else if (effectiveDeltaPp === 0) {
      statusKey = 'equal';
      badgeText = 'No Improvement vs Baseline';
      badgeClass = 'bg-stone-100 text-stone-700 border-stone-300';
      impactSummary = `This cutting layout achieved ${effectiveUtil}% material utilization (with ${effectiveWaste}% scrap offcuts), matching the sequential baseline layout with no measurable yield improvement (0 pp change and 0 m fabric saved). Pattern geometry and roll width constraints yielded equivalent material coverage.`;
    } else {
      statusKey = 'below';
      badgeText = 'Below Baseline';
      badgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
      impactSummary = `This cutting layout achieved ${effectiveUtil}% material utilization (with ${effectiveWaste}% scrap offcuts), which is ${Math.abs(effectiveDeltaPp)} pp below the sequential baseline (${effectiveBaseUtil}%). No fabric savings were achieved in this layout configuration.`;
    }
  } else {
    statusKey = 'no-baseline';
    badgeText = 'Real Calculated Benchmark';
    badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    impactSummary = `The cutting layout achieved ${effectiveUtil}% material utilization (with ${effectiveWaste}% scrap offcuts). Baseline marker data is required for comparative savings analysis.`;
  }

  return {
    badgeText,
    badgeClass,
    statusKey,
    impactSummary
  };
}
