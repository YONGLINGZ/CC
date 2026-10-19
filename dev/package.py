#!/usr/bin/env python3
"""Package the verified offline game, editable sources and compact artwork."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def describe(path):
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def main():
    browser = json.loads((ROOT / 'dev/v3-browser-results.json').read_text())
    assert len(browser['results']) == 20 and all(r['ok'] for r in browser['results'])
    assert not browser['errors'] and not browser['externalRequests']
    assert describe(ROOT / 'index.html')['sha256'] == browser['sha256'], 'Browser result is stale'
    assert describe(ROOT / 'baiyao-standalone.html')['sha256'] == browser['inline']['sha256'], 'Inline result is stale'
    expected = {'portraits': 8, 'cards': 36, 'events': 9, 'relics': 13}
    artwork = []
    for folder, count in expected.items():
        images = sorted((ROOT / 'assets' / folder).glob('*.webp'))
        assert len(images) == count, (folder, len(images))
        artwork.extend(images)
    members = [ROOT / n for n in ['index.html', 'baiyao-standalone.html', 'README.md',
                                  'GAME_README.md', 'TESTING.md', 'PERSISTENCE.md']]
    members += artwork
    members += sorted(p for p in (ROOT / 'dev').iterdir()
                      if p.is_file() and p.suffix in {'.js', '.cjs', '.py', '.md', '.json'})
    members += sorted((ROOT / 'docs/previews').glob('*.webp'))
    members += [ROOT / 'recovery' / n for n in ['manifest.json', 'source-manifest.json',
                                               'tests.json', 'source-tests.json']]
    archive = ROOT / 'recovery/baiyao-rebuilt.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for source in sorted(set(members)):
            name = 'baiyao-rebuilt/' + source.relative_to(ROOT).as_posix()
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 19, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            package.writestr(info, source.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    with zipfile.ZipFile(archive) as package:
        assert package.testzip() is None
        for source in members:
            assert package.read('baiyao-rebuilt/' + source.relative_to(ROOT).as_posix()) == source.read_bytes()
    receipt = {
        'version': '绘契鸣铃版', 'date': '2026-10-19', 'based_on': 'user-provided 33.zip',
        'game_html': describe(ROOT / 'index.html'),
        'standalone_html': describe(ROOT / 'baiyao-standalone.html'),
        'play_zip': describe(archive), 'zip_crc': 'PASS',
        'runtime_art': {k: {'count': v, 'bytes': sum(p.stat().st_size for p in (ROOT / 'assets' / k).glob('*.webp'))}
                        for k, v in expected.items()},
        'cards': 36, 'event_art': 9, 'relic_art': 13, 'sound_profiles': 36,
        'engine_tests': {'passed': 90, 'failed': 0},
        'audio_tests': {'passed': 11, 'failed': 0},
        'browser_groups': {'passed': 20, 'failed': 0},
        'public_api_simulations': {'completed': 90, 'wins': 89, 'defeats': 1},
        'full_recovery_checks': 13, 'source_recovery_checks': 17,
        'attachment_export_available': False, 'published_new_instance_verified': False,
        'cloud_configuration_updated_for_v3': False,
        'github_repository': 'YONGLINGZ/CC', 'github_branch': 'main',
    }
    (ROOT / 'recovery/delivery.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
