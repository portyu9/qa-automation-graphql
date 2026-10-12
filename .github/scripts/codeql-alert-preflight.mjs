// Pure, read-only CodeQL alert discovery guard for the pinned canonical controller.
// The GitHub API call itself stays in the trusted default-branch workflow.
export function selectOpenCodeqlTargets(alerts, config) {
  if (!Array.isArray(alerts)) throw new Error('CodeQL alert inventory is not an array');
  if (!Array.isArray(config?.targetAlertNumbers) || !Number.isInteger(config?.maxAlertsPerRun)) {
    throw new Error('CodeQL caller policy is invalid');
  }
  // The caller requests the first 100 results. Never assume a possibly truncated
  // inventory means there are no other active alerts.
  if (alerts.length >= 100) throw new Error('CodeQL open-alert inventory may be truncated; refusing ambiguous discovery');
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
  if (alerts.length === 0) return { state: 'empty', targets: [] };
  const untargeted = alerts.map((alert) => alert.number).filter((number) => !config.targetAlertNumbers.includes(number));
  if (untargeted.length > 0) {
    throw new Error(`Open CodeQL alerts are not authorized by the explicit caller policy: ${untargeted.join(', ')}`);
  }
  const targets = config.targetAlertNumbers.filter((number) => seen.has(number));
  if (targets.length === 0 || targets.length > config.maxAlertsPerRun) {
    throw new Error('Open CodeQL target selection violates the bounded caller policy');
  }
  return { state: 'targets', targets };
}
