export const STORAGE_RELATED_TYPES = new Set(['ts', 'storage', 'full-chain']);

export function normalizeFacilityStatus(status) {
  const value = String(status || '')
    .trim()
    .toLowerCase();

  if (value === 'operational' || value === '运行中') return 'operational';
  if (value === 'under construction' || value === '建设中') {
    return 'under-construction';
  }
  if (value === 'planned' || value === '计划中' || value === '规划中') {
    return 'planned';
  }
  if (value === 'cancelled' || value === '已取消') return 'cancelled';
  if (value === 'decommissioned' || value === '已退役') {
    return 'decommissioned';
  }
  if (
    value === 'suspended' ||
    value === '暂停' ||
    value === '已暂停' ||
    value === '已中止'
  ) {
    return 'suspended';
  }

  return value;
}

export function normalizeFacilityType(type) {
  const value = String(type || '')
    .trim()
    .toLowerCase();

  if (value === 'capture' || value === '捕集' || value === '碳捕集') {
    return 'capture';
  }
  if (
    value === 'transport' ||
    value === 'transportation' ||
    value === '运输' ||
    value === '碳运输'
  ) {
    return 'transport';
  }
  if (
    value === 't&s' ||
    value === 'transport & storage' ||
    value === 'transport and storage' ||
    value === '运输与封存' ||
    value === '运输和封存'
  ) {
    return 'ts';
  }
  if (
    value === 'storage' ||
    value === '封存' ||
    value === '储存' ||
    value === '碳封存'
  ) {
    return 'storage';
  }
  if (
    value === 'full chain' ||
    value === 'full-chain' ||
    value === '全链条' ||
    value === '全链' ||
    value === '全流程项目'
  ) {
    return 'full-chain';
  }
  if (value === 'ccu' || value === '利用' || value === '碳利用') {
    return 'ccu';
  }

  return null;
}

export function facilityCapacity(data = {}) {
  const estimatedCapacity = Number(data.estimatedCapacity || 0);
  if (estimatedCapacity > 0) return estimatedCapacity;

  const minCapacity = Number(data.announcedCapacityMin || 0);
  const maxCapacity = Number(data.announcedCapacityMax || 0);

  if (minCapacity && maxCapacity) return (minCapacity + maxCapacity) / 2;
  return minCapacity || maxCapacity || 0;
}

export function summarizeFacilities(facilities, expectedStatus) {
  const matching = facilities.filter(
    (facility) =>
      normalizeFacilityStatus(facility.data?.status) === expectedStatus
  );
  const storageRelated = matching.filter((facility) =>
    STORAGE_RELATED_TYPES.has(normalizeFacilityType(facility.data?.type))
  );

  return {
    totalCount: matching.length,
    totalCapacity: matching.reduce(
      (sum, facility) => sum + facilityCapacity(facility.data),
      0
    ),
    storageRelatedCount: storageRelated.length,
    storageRelatedCapacity: storageRelated.reduce(
      (sum, facility) => sum + facilityCapacity(facility.data),
      0
    ),
  };
}
