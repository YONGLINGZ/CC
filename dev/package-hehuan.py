#!/usr/bin/env python3
"""Package the current verified build with 晏绮罗's source and artwork."""
from pathlib import Path
import hashlib, json, re, subprocess, zipfile

root = Path(__file__).resolve().parents[1]
subprocess.run(['node', 'dev/hehuan-verify.cjs'], cwd=root, check=True)
html = (root / 'index.html').read_text(encoding='utf-8')
match = re.search(r'globalThis\.NightAssets=(.*?);\n', html)
if not match:
    raise RuntimeError('index.html has no embedded asset manifest')
assets = json.loads(match.group(1))

def paths(value):
    if isinstance(value, dict):
        for child in value.values():
            yield from paths(child)
    elif isinstance(value, list):
        for child in value:
            yield from paths(child)
    elif isinstance(value, str) and value.startswith('assets/'):
        yield value

names = set(paths(assets))
# The single-file build is published separately; keeping it out of the ZIP
# keeps the downloadable directory package below GitHub's per-file limit.
for filename in ['index.html', 'README.md', 'GAME_README.md', 'TESTING.md', 'PERSISTENCE.md', 'LIVE2D_STATUS.md']:
    if (root / filename).is_file():
        names.add(filename)
for folder in ['dev', 'docs']:
    for item in (root / folder).rglob('*'):
        if item.is_file() and item.suffix in {'.js', '.cjs', '.py', '.html', '.md', '.json', '.webp'}:
            names.add(str(item.relative_to(root)))
# Original paintings are published as a separate art archive, not duplicated
# inside the runnable game package.
for filename in ['recovery/events-md-export.zip']:
    if (root / filename).is_file():
        names.add(filename)

output = root / 'recovery' / 'baiyao-hehuan.zip'
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for name in sorted(names):
        info = zipfile.ZipInfo('baiyao-hehuan/' + name, date_time=(2026, 10, 25, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, (root / name).read_bytes())
with zipfile.ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise RuntimeError('package CRC check failed')
    if archive.read('baiyao-hehuan/index.html') != (root / 'index.html').read_bytes():
        raise RuntimeError('package index mismatch')

receipt = {
    'version': 'hehuan-v1',
    'zip': {'file': str(output.relative_to(root)), 'bytes': output.stat().st_size, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest()},
    'files': len(names),
    'runtimeArt': len(set(paths(assets))),
    'verification': 'dev/hehuan-verification-results.json',
    'humanPlaytest': False,
    'physicalPhoneTested': False,
    'directFileBrowserTested': False,
}
(root / 'recovery' / 'hehuan-delivery.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(receipt, ensure_ascii=False))
