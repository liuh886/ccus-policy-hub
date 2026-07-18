import {
  facilityCapacity,
  normalizeFacilityStatus,
} from './capacityMetrics.mjs';

export const GOVERNANCE_DIMENSIONS = Object.freeze([
  'incentive',
  'statutory',
  'market',
  'strategic',
  'mrv',
]);

export const ACTIVE_POLICY_STATUSES = new Set([
  'active',
  'operational',
  'running',
  '运行中',
  '现行',
]);

const COMMITTED_STATUSES = new Set(['operational', 'under-construction']);

export function clampGovernanceScore(value) {
  return Math.min(100, Math.max(0, Number(value || 0)));
}

export function normalizePolicyStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

export function isActivePolicy(policy) {
  const rawStatus = policy?.data?.status ?? policy?.status;
  const normalized = normalizePolicyStatus(rawStatus);
  return (
    ACTIVE_POLICY_STATUSES.has(normalized) ||
    ACTIVE_POLICY_STATUSES.has(String(rawStatus || '').trim())
  );
}

export function calculateGovernanceCapability(policies = []) {
  const activePolicies = policies.filter(isActivePolicy);
  const dimensions = {};
  const contributorIds = new Set();

  for (const dimension of GOVERNANCE_DIMENSIONS) {
    let peakScore = 0;
    let contributors = [];

    for (const policy of activePolicies) {
      const score = clampGovernanceScore(
        policy?.data?.analysis?.[dimension]?.score ??
          policy?.analysis?.[dimension]?.score
      );
      if (score > peakScore) {
        peakScore = score;
        contributors = score > 0 ? [policy] : [];
      } else if (score > 0 && score === peakScore) {
        contributors.push(policy);
      }
    }

    contributors.forEach((policy) => contributorIds.add(String(policy.id)));
    dimensions[dimension] = {
      score: peakScore,
      contributors,
    };
  }

  const scores = GOVERNANCE_DIMENSIONS.map(
    (dimension) => dimensions[dimension].score
  );
  const index = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;
  const maxScore = scores.length ? Math.max(...scores) : 0;
  const minScore = scores.length ? Math.min(...scores) : 0;
  const strongestDimension =
    GOVERNANCE_DIMENSIONS[scores.indexOf(maxScore)] || GOVERNANCE_DIMENSIONS[0];
  const weakestDimension =
    GOVERNANCE_DIMENSIONS[scores.indexOf(minScore)] || GOVERNANCE_DIMENSIONS[0];

  const contributors = activePolicies
    .filter((policy) => contributorIds.has(String(policy.id)))
    .sort(
      (a, b) =>
        Number(b?.data?.year || b?.year || 0) -
        Number(a?.data?.year || a?.year || 0)
    );

  return {
    policyCount: activePolicies.length,
    dimensions,
    scores,
    index,
    spread: maxScore - minScore,
    strongestDimension,
    weakestDimension,
    contributors,
  };
}

export function calculateDeploymentMetrics(facilities = []) {
  const result = {
    operationalCount: 0,
    operationalCapacity: 0,
    constructionCount: 0,
    constructionCapacity: 0,
    plannedCount: 0,
    plannedCapacity: 0,
    committedCount: 0,
    committedCapacity: 0,
  };

  for (const facility of facilities) {
    const data = facility?.data ?? facility ?? {};
    const status = normalizeFacilityStatus(data.status);
    const capacity = facilityCapacity(data);

    if (status === 'operational') {
      result.operationalCount += 1;
      result.operationalCapacity += capacity;
    } else if (status === 'under-construction') {
      result.constructionCount += 1;
      result.constructionCapacity += capacity;
    } else if (status === 'planned') {
      result.plannedCount += 1;
      result.plannedCapacity += capacity;
    }

    if (COMMITTED_STATUSES.has(status)) {
      result.committedCount += 1;
      result.committedCapacity += capacity;
    }
  }

  return result;
}

export function median(values = []) {
  const sorted = values
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function calculateGlobalBenchmarks(countrySystems = []) {
  const governanceValues = countrySystems
    .map((item) => item?.governance?.index)
    .filter((value) => Number.isFinite(value));
  const deploymentValues = countrySystems
    .map((item) => item?.deployment?.committedCapacity)
    .filter((value) => Number.isFinite(value) && value > 0);

  return {
    governance: median(governanceValues),
    deployment: median(deploymentValues),
  };
}

export function classifyGovernanceDeployment(
  governanceIndex,
  committedCapacity,
  benchmarks
) {
  const governanceHigh =
    Number(governanceIndex) >= Number(benchmarks.governance);
  const deploymentHigh =
    Number(committedCapacity) >= Number(benchmarks.deployment);

  if (governanceHigh && deploymentHigh) return 'integrated-leaders';
  if (governanceHigh) return 'policy-led';
  if (deploymentHigh) return 'deployment-led';
  return 'foundation-building';
}
