// Strict, pure discovery for the immutable canonical Autofix controller.
// GitHub owns the set of open CodeQL alert IDs; checked-in policy never pins IDs.
export function selectOpenCodeqlTargets(alerts, config) {
  if (!Array.isArray(alerts)) throw new Error('CodeQL alert inventory is not an array');
  if (Object.hasOwn(config ?? {}, 'targetAlertNumbers')) {
    throw new Error('Tracked CodeQL policy must not pin alert numbers');
  }
  if (!Number.isInteger(config?.maxAlertsPerRun) || config.maxAlertsPerRun < 1 || config.maxAlertsPerRun > 100) {
    throw new Error('CodeQL maximum alerts per run must be between 1 and 100');
  }
  // One unambiguous bounded inventory request: a full first page could hide more alerts.
  // Never mistake a truncated response for proof of a clean repository.
  if (alerts.length >= 100) throw new Error('CodeQL alert inventory may be truncated; refusing ambiguous discovery');
  const seen = new Set();
  for (const alert of alerts) {
    if (!Number.isInteger(alert?.number) || alert.number < 1 || seen.has(alert.number)) {
      throw new Error('CodeQL alert inventory contains an invalid or duplicate number');
    }
    if (alert.state !== 'open' || alert.tool?.name !== 'CodeQL') {
      throw new Error('CodeQL alert inventory contains a non-open or non-CodeQL alert');
    }
    seen.add(alert.number);
  }
  if (alerts.length === 0) return { state: 'empty', targets: [], queued: 0 };
  // Deterministic, bounded, runtime-only target selection. Excess alerts remain
  // queued for the next healthy controller invocation rather than disappearing.
  const ordered = [...seen].sort((a, b) => a - b);
  return {
    state: 'targets',
    targets: ordered.slice(0, config.maxAlertsPerRun),
    queued: ordered.length - Math.min(ordered.length, config.maxAlertsPerRun),
  };
}
