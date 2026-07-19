import {
  facilityCapacity,
  normalizeFacilityStatus,
} from './capacityMetrics.mjs';

export const PIPELINE_STATUSES = new Set([
  'planned',
  'operational',
  'under-construction',
]);

export const COMMITTED_STATUSES = new Set([
  'operational',
  'under-construction',
]);

const STATUS_KEYS = ['operational', 'under-construction', 'planned'];

const emptyRegion = (name) => ({
  name,
  pipelineCount: 0,
  committedCount: 0,
  pipelineCapacity: 0,
  committedCapacity: 0,
  capacityRecordCount: 0,
  committedCapacityRecordCount: 0,
});

const regionMetric = (region, mode, field) =>
  mode === 'projects'
    ? region[`${field}Count`]
    : region[`${field}Capacity`];

export function collapseRegions(
  regions,
  mode,
  topN = 6,
  otherLabel = 'Other regions'
) {
  const sorted = [...regions].sort(
    (a, b) =>
      regionMetric(b, mode, 'pipeline') - regionMetric(a, mode, 'pipeline') ||
      a.name.localeCompare(b.name)
  );

  const visible = sorted.slice(0, topN);
  const remainder = sorted.slice(topN);

  if (remainder.length > 0) {
    const other = remainder.reduce((summary, region) => {
      summary.pipelineCount += region.pipelineCount;
      summary.committedCount += region.committedCount;
      summary.pipelineCapacity += region.pipelineCapacity;
      summary.committedCapacity += region.committedCapacity;
      summary.capacityRecordCount += region.capacityRecordCount;
      summary.committedCapacityRecordCount += region.committedCapacityRecordCount;
      return summary;
    }, emptyRegion(otherLabel));
    visible.push(other);
  }

  const maxPipeline = Math.max(
    ...visible.map((region) => regionMetric(region, mode, 'pipeline')),
    1
  );

  return visible.map((region) => {
    const pipelineValue = regionMetric(region, mode, 'pipeline');
    const committedValue = regionMetric(region, mode, 'committed');

    return {
      ...region,
      pipelineValue,
      committedValue,
      pipelinePercent: (pipelineValue / maxPipeline) * 100,
      committedPercent: (committedValue / maxPipeline) * 100,
      committedShare:
        pipelineValue > 0 ? (committedValue / pipelineValue) * 100 : 0,
    };
  });
}

export function buildProjectLandscape(
  facilities,
  { topRegions = 6, otherLabel = 'Other regions' } = {}
) {
  const status = Object.fromEntries(
    STATUS_KEYS.map((key) => [key, { count: 0, capacity: 0 }])
  );
  const regionsByName = new Map();
  let activeCount = 0;
  let activeCapacity = 0;
  let capacityRecordCount = 0;

  facilities.forEach((facility) => {
    const data = facility?.data || facility || {};
    const normalizedStatus = normalizeFacilityStatus(data.status);
    if (!PIPELINE_STATUSES.has(normalizedStatus)) return;

    const capacity = facilityCapacity(data);
    const hasCapacity = capacity > 0;
    const regionName =
      String(data.region || '').trim() ||
      String(data.country || '').trim() ||
      'Unspecified';

    activeCount += 1;
    activeCapacity += capacity;
    if (hasCapacity) capacityRecordCount += 1;

    status[normalizedStatus].count += 1;
    status[normalizedStatus].capacity += capacity;

    const region = regionsByName.get(regionName) || emptyRegion(regionName);
    region.pipelineCount += 1;
    region.pipelineCapacity += capacity;
    if (hasCapacity) region.capacityRecordCount += 1;

    if (COMMITTED_STATUSES.has(normalizedStatus)) {
      region.committedCount += 1;
      region.committedCapacity += capacity;
      if (hasCapacity) region.committedCapacityRecordCount += 1;
    }

    regionsByName.set(regionName, region);
  });

  const regions = [...regionsByName.values()];
  const committedCount =
    status.operational.count + status['under-construction'].count;
  const committedCapacity =
    status.operational.capacity + status['under-construction'].capacity;

  const largestPipelineRegion = [...regions].sort(
    (a, b) =>
      b.pipelineCapacity - a.pipelineCapacity ||
      b.pipelineCount - a.pipelineCount
  )[0] || emptyRegion('—');

  const largestCommittedRegion = [...regions].sort(
    (a, b) =>
      b.committedCapacity - a.committedCapacity ||
      b.committedCount - a.committedCount
  )[0] || emptyRegion('—');

  return {
    status,
    activeCount,
    activeCapacity,
    excludedCount: Math.max(facilities.length - activeCount, 0),
    committedCount,
    committedCapacity,
    committedCountShare:
      activeCount > 0 ? (committedCount / activeCount) * 100 : 0,
    committedCapacityShare:
      activeCapacity > 0 ? (committedCapacity / activeCapacity) * 100 : 0,
    capacityCoverage: {
      count: capacityRecordCount,
      total: activeCount,
      share: activeCount > 0 ? (capacityRecordCount / activeCount) * 100 : 0,
    },
    regions,
    regionViews: {
      capacity: collapseRegions(regions, 'capacity', topRegions, otherLabel),
      projects: collapseRegions(regions, 'projects', topRegions, otherLabel),
    },
    largestPipelineRegion,
    largestCommittedRegion,
  };
}
