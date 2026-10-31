"""Deterministically derive self-contained Colab notebooks from canonical Python.

--check guards committed notebooks; --verify-export checks a downloaded Drive
notebook's actual code cells without trusting its name or metadata.
"""
import argparse
import ast
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
COLLECTORS = {'policy': ('ccus_policy_primary_archive.py', 'CCUS_Policy_Primary_Source_Archive_Colab.ipynb'),
              'gccsi': ('gccsi_bulk_archive.py', 'GCCSI_Bulk_Archive_Colab.ipynb')}


def standalone_source(text):
    lines = text.splitlines(keepends=True)
    remove = set()
    for node in ast.parse(text).body:
        imports_core = isinstance(node, ast.ImportFrom) and node.module == 'archive_core'
        guarded_import = isinstance(node, ast.Try) and any(isinstance(n, ast.ImportFrom) and
                          n.module == 'archive_core' for n in node.body)
        main_guard = isinstance(node, ast.If) and '__name__' in ast.unparse(node.test)
        if imports_core or guarded_import or main_guard:
            remove.update(range(node.lineno - 1, node.end_lineno))
    result = ''.join(line for i, line in enumerate(lines) if i not in remove)
    compile(result, '<standalone collector>', 'exec')
    return result


def notebook(kind):
    filename, _ = COLLECTORS[kind]
    core = (ROOT / 'archive_core.py').read_text(encoding='utf-8')
    collector = (ROOT / filename).read_text(encoding='utf-8')
    def code(identity, text):
        compile(text, identity, 'exec')
        return {'cell_type': 'code', 'id': identity, 'metadata': {},
                'execution_count': None, 'outputs': [], 'source': text.splitlines(keepends=True)}
    return {'nbformat': 4, 'nbformat_minor': 5, 'metadata': {
        'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
        'ccus_sources': {name: hashlib.sha256(text.encode()).hexdigest()
                         for name, text in [('archive_core.py', core), (filename, collector)]}},
        'cells': [{'cell_type': 'markdown', 'id': 'scope', 'metadata': {}, 'source': [
            '# CCUS private source acquisition\n',
            'Generated from canonical Git Python modules. Run all only in your authorized Colab/Drive session.\n',
            'Uploads are transfer states, not legal verification. No SQLite or public source mutation.\n']},
            code('dependencies', 'import subprocess, sys\nsubprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "requests>=2.32,<3", "beautifulsoup4", "google-api-python-client", "google-auth-httplib2"])\n'),
            code('archive-core', core), code('collector', standalone_source(collector)),
            code('run', 'main()\n')]}


def code_cells(value):
    result = []
    for cell in value['cells']:
        if cell.get('cell_type') == 'code':
            text = ''.join(cell['source']) if isinstance(cell['source'], list) else cell['source']
            compile(text, '<notebook code>', 'exec')
            result.append(text)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--verify-export', type=Path)
    parser.add_argument('--collector', choices=COLLECTORS)
    args = parser.parse_args()
    if args.verify_export:
        if not args.collector:
            parser.error('--verify-export requires --collector')
        actual = json.loads(args.verify_export.read_text(encoding='utf-8-sig'))
        if code_cells(actual) != code_cells(notebook(args.collector)):
            raise SystemExit('Notebook/source code drift: exported code cells differ.')
        print('Exported notebook code matches canonical modules; not a live Colab acceptance.')
        return
    for kind, (_, filename) in COLLECTORS.items():
        output = ROOT / 'notebooks' / filename
        expected = json.dumps(notebook(kind), ensure_ascii=False, indent=2) + '\n'
        if args.check:
            if not output.exists() or output.read_text(encoding='utf-8') != expected:
                raise SystemExit(f'Notebook/source drift: {filename}')
        else:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(expected, encoding='utf-8', newline='\n')
        print(('CHECK ' if args.check else 'BUILD ') + filename)


if __name__ == '__main__':
    main()
