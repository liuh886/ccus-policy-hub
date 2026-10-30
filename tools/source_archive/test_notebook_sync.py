"""Code cells, not Notebook names or metadata, establish source parity."""
import copy
import build_notebooks as m


def test_source_cells_are_self_contained_and_drift_visible():
    for kind in m.COLLECTORS:
        expected = m.notebook(kind)
        cells = m.code_cells(expected)
        assert 'from archive_core import' not in cells[2]
        assert 'from ccus_archive_core import' not in cells[2]
        changed = copy.deepcopy(expected)
        changed['cells'][3]['source'].append('\nDRIFT_SENTINEL = True\n')
        assert m.code_cells(changed) != cells
        changed = copy.deepcopy(expected)
        changed['cells'][3]['outputs'] = [{'output_type': 'stream', 'text': 'runtime output'}]
        assert m.code_cells(changed) == cells


if __name__ == '__main__':
    test_source_cells_are_self_contained_and_drift_visible()
    print('PASS source cells, mutation detection, output-independent export comparison')
