import assert from 'node:assert/strict';
import test from 'node:test';

import { governanceClientCopy } from '../src/lib/governanceCopy.mjs';
import {
  createGovernanceWorkspaceVisuals,
  governanceAxisMinimum,
  heatmapOpacity,
  preferredProfileView,
} from '../src/lib/governanceWorkspaceVisuals.mjs';

test('profile view defaults to radar for up to three countries', () => {
  assert.equal(preferredProfileView(1), 'radar');
  assert.equal(preferredProfileView(3), 'radar');
  assert.equal(preferredProfileView(4), 'heatmap');
  assert.equal(preferredProfileView(5), 'heatmap');
});

test('heatmap opacity is monotonic and clamps governance scores', () => {
  assert.equal(heatmapOpacity(-10), 0.08);
  assert.equal(heatmapOpacity(0), 0.08);
  assert.equal(heatmapOpacity(50), 0.44);
  assert.equal(heatmapOpacity(100), 0.8);
  assert.equal(heatmapOpacity(140), 0.8);
});

test('governance matrix starts at 30 when the lowest relevant score is 30-49', () => {
  const countries = [
    { governance: { index: 42 } },
    { governance: { index: 76 } },
  ];

  assert.equal(governanceAxisMinimum([], {}), 30);
  assert.equal(governanceAxisMinimum(countries, { governance: 54 }), 30);
  assert.equal(
    governanceAxisMinimum([{ governance: { index: 35 } }], { governance: 40 }),
    30
  );
});

test('governance matrix keeps a high floor close to high-scoring data', () => {
  const countries = [
    { governance: { index: 84 } },
    { governance: { index: 97 } },
  ];
  assert.equal(governanceAxisMinimum(countries, { governance: 84 }), 70);
  assert.equal(
    governanceAxisMinimum([{ governance: { index: 62 } }], { governance: 71 }),
    50
  );
});

test('governance matrix safely expands below 30 for low scores or benchmarks', () => {
  assert.equal(
    governanceAxisMinimum([{ governance: { index: 24 } }], { governance: 51 }),
    20
  );
  assert.equal(
    governanceAxisMinimum([{ governance: { index: 8 } }], { governance: 40 }),
    0
  );
  assert.equal(
    governanceAxisMinimum([{ governance: { index: 42 } }], { governance: 27 }),
    20
  );
});

function makeClassList(initial = []) {
  const set = new Set(initial);
  return {
    add: (...names) => names.forEach((name) => set.add(name)),
    remove: (...names) => names.forEach((name) => set.delete(name)),
    toggle: (name, force) => {
      if (force === undefined) {
        if (set.has(name)) {
          set.delete(name);
          return false;
        }
        set.add(name);
        return true;
      }
      if (force) set.add(name);
      else set.delete(name);
      return Boolean(force);
    },
    contains: (name) => set.has(name),
  };
}

function makeButton(dataset = {}) {
  const listeners = new Map();
  const attributes = new Map();
  return {
    dataset,
    classList: makeClassList(),
    onclick: null,
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    addEventListener(type, handler) {
      const list = listeners.get(type) || [];
      list.push(handler);
      listeners.set(type, list);
    },
    click() {
      if (typeof this.onclick === 'function') this.onclick();
      for (const handler of listeners.get('click') || []) handler();
    },
  };
}

function createWorkspaceDomStub() {
  const radarCanvas = { id: 'compare-radar-canvas' };
  const matrixCanvas = { id: 'maturity-matrix-canvas' };
  const radarSummary = { id: 'governance-radar-summary', innerHTML: '' };
  const benchmarkChip = { classList: makeClassList(['is-hidden']) };
  const axisNote = { textContent: '', classList: makeClassList(['is-hidden']) };
  const evidenceContent = { innerHTML: '' };
  const profileViewButtons = [
    makeButton({ profileView: 'radar' }),
    makeButton({ profileView: 'heatmap' }),
  ];
  const profileVisualPanels = [
    { dataset: { profileVisual: 'radar' }, classList: makeClassList() },
    { dataset: { profileVisual: 'heatmap' }, classList: makeClassList() },
  ];
  const mobileTabs = [
    makeButton({ governanceTab: 'profile' }),
    makeButton({ governanceTab: 'deployment' }),
  ];
  const mobilePanels = [
    { dataset: { governancePanel: 'profile' }, classList: makeClassList() },
    { dataset: { governancePanel: 'deployment' }, classList: makeClassList() },
  ];

  let sortButtons = [];
  let evidenceButtons = [];
  let heatmapHtml = '';
  const heatmap = {
    id: 'governance-heatmap',
    get innerHTML() {
      return heatmapHtml;
    },
    set innerHTML(html) {
      heatmapHtml = String(html);
      sortButtons = [...heatmapHtml.matchAll(/data-sort="([^"]+)"/g)].map(
        ([, key]) => makeButton({ sort: key })
      );
      evidenceButtons = [
        ...heatmapHtml.matchAll(
          /data-evidence-country="([^"]+)"(?:\s+data-evidence-dimension="([^"]+)")?/g
        ),
      ].map(([, country, dimension]) =>
        makeButton(
          dimension
            ? { evidenceCountry: country, evidenceDimension: dimension }
            : { evidenceCountry: country }
        )
      );
    },
    querySelectorAll(selector) {
      if (selector === '[data-sort]') return sortButtons;
      if (selector === '[data-evidence-country]') return evidenceButtons;
      return [];
    },
  };

  const byId = {
    'compare-radar-canvas': radarCanvas,
    'maturity-matrix-canvas': matrixCanvas,
    'governance-heatmap': heatmap,
    'governance-radar-summary': radarSummary,
  };

  const doc = {
    getElementById(id) {
      return byId[id] || null;
    },
    querySelector(selector) {
      if (selector === '[data-benchmark-chip]') return benchmarkChip;
      if (selector === '[data-axis-note]') return axisNote;
      if (selector === '#governance-evidence-panel [data-evidence-content]') {
        return evidenceContent;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-profile-view]') return profileViewButtons;
      if (selector === '[data-profile-visual]') return profileVisualPanels;
      if (selector === '[data-governance-tab]') return mobileTabs;
      if (selector === '[data-governance-panel]') return mobilePanels;
      return [];
    },
  };

  return {
    doc,
    radarCanvas,
    matrixCanvas,
    heatmap,
    radarSummary,
    benchmarkChip,
    axisNote,
    evidenceContent,
    profileViewButtons,
    getSortButton: (key) => sortButtons.find((btn) => btn.dataset.sort === key),
    getEvidenceButton: (country, dimension) =>
      evidenceButtons.find(
        (btn) =>
          btn.dataset.evidenceCountry === country &&
          (dimension === undefined ||
            btn.dataset.evidenceDimension === dimension)
      ),
  };
}

function createFakeChartClass() {
  const registry = new Map();
  return class FakeChart {
    constructor(canvas, config) {
      this.canvas = canvas;
      this.data = config.data;
      this.options = config.options;
      this.destroyed = false;
      this.destroyCalls = 0;
      this.resizeCalls = 0;
      this.updateCalls = 0;
      registry.set(canvas, this);
    }

    static getChart(canvas) {
      return registry.get(canvas);
    }

    static registerOrphan(canvas, chart) {
      registry.set(canvas, chart);
    }

    destroy() {
      this.destroyed = true;
      this.destroyCalls += 1;
      if (registry.get(this.canvas) === this) {
        registry.delete(this.canvas);
      }
    }

    resize() {
      this.resizeCalls += 1;
    }

    update() {
      this.updateCalls += 1;
    }
  };
}

function makeCountrySystem(canonical, index, committedCapacity, policyCount) {
  return {
    country: canonical,
    canonicalCountry: canonical,
    displayCountry: canonical,
    color: { border: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
    governance: {
      index,
      policyCount,
      scores: [index, index - 5, index - 10, index - 2, index - 8],
      strongestDimension: 'incentive',
      dimensions: {
        incentive: { score: index, contributors: [] },
        statutory: { score: index - 5, contributors: [] },
        market: { score: index - 10, contributors: [] },
        strategic: { score: index - 2, contributors: [] },
        mrv: { score: index - 8, contributors: [] },
      },
    },
    deployment: {
      committedCapacity,
      plannedCapacity: 5,
      matrixX: committedCapacity,
    },
    regulatory: {
      pore_space_rights: 'Defined by statute',
    },
  };
}

function withMockDocument(doc, fn) {
  const hadDocument = Object.prototype.hasOwnProperty.call(
    globalThis,
    'document'
  );
  const previousDocument = globalThis.document;
  globalThis.document = doc;
  try {
    return fn();
  } finally {
    if (hadDocument) globalThis.document = previousDocument;
    else delete globalThis.document;
  }
}

test('createGovernanceWorkspaceVisuals clear() resets all 6 state fields and destroys charts', () => {
  const stub = createWorkspaceDomStub();
  const FakeChart = createFakeChartClass();
  const countries = [
    makeCountrySystem('United States', 85, 25, 12),
    makeCountrySystem('China', 72, 10, 18),
  ];
  const benchmarks = { governance: 70, deployment: 15 };

  withMockDocument(stub.doc, () => {
    const workspace = createGovernanceWorkspaceVisuals({ Chart: FakeChart });

    const initial = workspace.getState();
    assert.equal(Object.isFrozen(initial), true);
    assert.equal(Object.isFrozen(initial.heatmapSort), true);
    assert.deepEqual(initial, {
      profileChart: null,
      deploymentChart: null,
      selectedCountryKey: null,
      activeProfileView: null,
      currentState: null,
      heatmapSort: { key: 'governance', dir: 'desc' },
    });

    workspace.render({
      countrySystems: countries,
      benchmarks,
      text: governanceClientCopy.en,
      lang: 'en',
    });

    // Mutate activeProfileView, heatmapSort, and selectedCountryKey via UI bindings.
    stub.profileViewButtons[1].click(); // switch to 'heatmap'
    stub.getSortButton('policies').click(); // sort by policies desc
    stub.getSortButton('policies').click(); // flip to policies asc
    stub.getEvidenceButton('China', 'incentive').click();

    const populated = workspace.getState();
    assert.ok(populated.profileChart);
    assert.ok(populated.deploymentChart);
    assert.equal(populated.selectedCountryKey, 'China');
    assert.equal(populated.activeProfileView, 'heatmap');
    assert.ok(populated.currentState);
    assert.deepEqual(populated.heatmapSort, { key: 'policies', dir: 'asc' });

    const prevProfileChart = populated.profileChart;
    const prevDeploymentChart = populated.deploymentChart;

    workspace.clear();

    assert.equal(prevProfileChart.destroyed, true);
    assert.equal(prevDeploymentChart.destroyed, true);
    assert.deepEqual(workspace.getState(), {
      profileChart: null,
      deploymentChart: null,
      selectedCountryKey: null,
      activeProfileView: null,
      currentState: null,
      heatmapSort: { key: 'governance', dir: 'desc' },
    });
    assert.equal(stub.heatmap.innerHTML, '');
    assert.equal(stub.radarSummary.innerHTML, '');
    assert.equal(stub.benchmarkChip.classList.contains('is-hidden'), true);
    assert.equal(stub.axisNote.textContent, '');
    assert.equal(stub.axisNote.classList.contains('is-hidden'), true);

    // Re-rendering after clear() should not inherit leaked activeProfileView or heatmapSort.
    workspace.render({
      countrySystems: countries,
      benchmarks,
      text: governanceClientCopy.en,
      lang: 'en',
    });
    assert.equal(workspace.getState().activeProfileView, 'radar');
    assert.deepEqual(workspace.getState().heatmapSort, {
      key: 'governance',
      dir: 'desc',
    });
  });
});

test('createGovernanceWorkspaceVisuals instances stay isolated from each other', () => {
  const stub = createWorkspaceDomStub();
  const FakeChart = createFakeChartClass();
  const twoCountries = [
    makeCountrySystem('United States', 85, 25, 12),
    makeCountrySystem('Norway', 80, 12, 7),
  ];
  const fourCountries = [
    ...twoCountries,
    makeCountrySystem('China', 72, 10, 18),
    makeCountrySystem('United Kingdom', 78, 8, 9),
  ];
  const benchmarks = { governance: 70, deployment: 15 };

  withMockDocument(stub.doc, () => {
    const workspaceA = createGovernanceWorkspaceVisuals({ Chart: FakeChart });
    const workspaceB = createGovernanceWorkspaceVisuals({ Chart: FakeChart });

    workspaceA.render({
      countrySystems: twoCountries,
      benchmarks,
      text: governanceClientCopy.en,
      lang: 'en',
    });
    stub.getSortButton('committed').click();
    stub.getEvidenceButton('Norway', 'incentive').click();

    // workspaceB has not been rendered yet and must remain completely clean.
    assert.deepEqual(workspaceB.getState(), {
      profileChart: null,
      deploymentChart: null,
      selectedCountryKey: null,
      activeProfileView: null,
      currentState: null,
      heatmapSort: { key: 'governance', dir: 'desc' },
    });

    workspaceB.render({
      countrySystems: fourCountries,
      benchmarks,
      text: governanceClientCopy.en,
      lang: 'en',
    });

    assert.equal(workspaceA.getState().selectedCountryKey, 'Norway');
    assert.deepEqual(workspaceA.getState().heatmapSort, {
      key: 'committed',
      dir: 'desc',
    });
    assert.equal(workspaceB.getState().selectedCountryKey, null);
    assert.equal(workspaceB.getState().activeProfileView, 'heatmap');
    assert.deepEqual(workspaceB.getState().heatmapSort, {
      key: 'governance',
      dir: 'desc',
    });

    // Clearing workspaceA must not reset workspaceB's state.
    workspaceA.clear();
    assert.equal(workspaceA.getState().currentState, null);
    assert.equal(workspaceB.getState().activeProfileView, 'heatmap');
    assert.equal(workspaceB.getState().currentState.countrySystems.length, 4);
  });
});

test('render destroys orphaned charts registered on canvases via Chart.getChart', () => {
  const stub = createWorkspaceDomStub();
  const FakeChart = createFakeChartClass();
  const orphanRadar = {
    destroyed: false,
    destroy() {
      this.destroyed = true;
    },
  };
  const orphanMatrix = {
    destroyed: false,
    destroy() {
      this.destroyed = true;
    },
  };
  FakeChart.registerOrphan(stub.radarCanvas, orphanRadar);
  FakeChart.registerOrphan(stub.matrixCanvas, orphanMatrix);

  const countries = [makeCountrySystem('Norway', 80, 12, 7)];
  withMockDocument(stub.doc, () => {
    const workspace = createGovernanceWorkspaceVisuals({ Chart: FakeChart });
    workspace.render({
      countrySystems: countries,
      benchmarks: { governance: 70, deployment: 10 },
      text: governanceClientCopy.en,
      lang: 'en',
    });
    assert.equal(orphanRadar.destroyed, true);
    assert.equal(orphanMatrix.destroyed, true);
  });
});

test('createGovernanceWorkspaceVisuals works safely without document (headless Node)', () => {
  const workspace = createGovernanceWorkspaceVisuals();
  const countries = [makeCountrySystem('Norway', 80, 12, 7)];

  workspace.render({
    countrySystems: countries,
    benchmarks: { governance: 70, deployment: 10 },
    text: governanceClientCopy.en,
    lang: 'en',
  });
  assert.equal(workspace.getState().activeProfileView, 'radar');
  assert.ok(workspace.getState().currentState);

  workspace.clear();
  assert.deepEqual(workspace.getState(), {
    profileChart: null,
    deploymentChart: null,
    selectedCountryKey: null,
    activeProfileView: null,
    currentState: null,
    heatmapSort: { key: 'governance', dir: 'desc' },
  });
});
