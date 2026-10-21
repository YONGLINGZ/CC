#!/usr/bin/env python3
"""Package the verified v6 offline game and editable sources."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def describe(path):
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def report(name):
    return json.loads((ROOT / name).read_text())


def main():
    browser = report('dev/v6-results.json')
    assert len(browser['results']) >= 8 and all(r['ok'] for r in browser['results'])
    assert not browser['errors'] and not browser['externalRequests']
    assert describe(ROOT / 'index.html')['sha256'] == browser['sha256'], 'Browser result is stale'
    assert describe(ROOT / 'baiyao-standalone.html')['sha256'] == browser['inline']['sha256'], 'Inline result is stale'
    exports = report('dev/v6-export-results.json')
    assert exports['passed'] == 4 and exports['failed'] == 0
    assert exports['folderSha256'] == browser['sha256'] and exports['inlineSha256'] == browser['inline']['sha256']
    scene = report('dev/scene-results.json')
    assert scene['passed'] == 12 and scene['failed'] == 0
    assert describe(ROOT / 'dev/scene.js')['sha256'] == scene['runtimeSha256'], 'Scene result is stale'
    regions = report('dev/v6-scene-results.json')
    assert regions['passed'] == 6 and regions['failed'] == 0
    assert describe(ROOT / 'dev/scene.js')['sha256'] == regions['runtimeSha256']
    audio = report('dev/v6-audio-regression-results.json')
    ice_audio = report('dev/v6-sword-audio-results.json')
    story_audio = report('dev/v6-event-audio-results.json')
    assert audio['passed'] == 11 and ice_audio['passed'] == 8 and audio['failed'] == ice_audio['failed'] == 0
    assert story_audio['passed'] == 3 and story_audio['failed'] == 0
    for evidence in (audio, ice_audio, story_audio):
        assert describe(ROOT / 'dev/audio.js')['sha256'] == evidence['audioSha256'], 'Audio result is stale'
    regression = report('dev/v6-regression-results.json')
    assert regression['engine']['passed'] == 123 and regression['engine']['failed'] == 0
    for name, digest in regression['inputs'].items():
        assert describe(ROOT / name)['sha256'] == digest, 'Regression result is stale: ' + name
    full, source = report('recovery/tests.json'), report('recovery/source-tests.json')
    for evidence in (full, source):
        assert evidence['format'] == 'baiyao-recovery-tests-v6' and evidence['failed'] == 0
        assert evidence['release_outputs']['index.html'] == browser['sha256']
        assert evidence['release_outputs']['baiyao-standalone.html'] == browser['inline']['sha256']
    slim_smoke = report('dev/v6-source-browser-results.json')
    assert slim_smoke['passed'] == 2 and slim_smoke['failed'] == 0
    assert describe(ROOT / 'dev/ui.js')['sha256'] == slim_smoke['uiSha256'], 'Source smoke result is stale'
    assert describe(ROOT / 'recovery/restore-source.sh')['sha256'] == slim_smoke['restoreScriptSha256']
    expected = {'portraits': 12, 'cards': 52, 'events': 30, 'relics': 14, 'puppet': 7, 'regions': 3}
    artwork = []
    for folder, count in expected.items():
        images = sorted((ROOT / 'assets' / folder).glob('*.webp'))
        assert len(images) == count, (folder, len(images))
        artwork.extend(images)
    members = [ROOT / n for n in ['index.html', 'baiyao-standalone.html', 'README.md',
                                  'GAME_README.md', 'TESTING.md', 'PERSISTENCE.md', 'LIVE2D_STATUS.md']]
    members += artwork
    members += sorted(p for p in (ROOT / 'dev').iterdir()
                      if p.is_file() and p.suffix in {'.js', '.cjs', '.py', '.md', '.json'})
    members += sorted((ROOT / 'docs/previews').glob('*.webp'))
    members += [ROOT / 'recovery' / n for n in ['manifest.json', 'source-manifest.json',
                                               'tests.json', 'source-tests.json', 'cloud-v4-status.json']]
    archive = ROOT / 'recovery/baiyao-rebuilt.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for item in sorted(set(members)):
            name = 'baiyao-rebuilt/' + item.relative_to(ROOT).as_posix()
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 21, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            package.writestr(info, item.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    with zipfile.ZipFile(archive) as package:
        assert package.testzip() is None
        for item in members:
            assert package.read('baiyao-rebuilt/' + item.relative_to(ROOT).as_posix()) == item.read_bytes()
    play = regression['public_api']
    receipt = {
        'version': '寒渊因缘版', 'date': '2026-10-21', 'based_on': 'user 33.zip and v5 game',
        'game_html': describe(ROOT / 'index.html'),
        'standalone_html': describe(ROOT / 'baiyao-standalone.html'),
        'play_zip': describe(archive), 'zip_crc': 'PASS',
        'runtime_art': {k: {'count': v, 'bytes': sum(p.stat().st_size for p in (ROOT / 'assets' / k).glob('*.webp'))}
                        for k, v in expected.items()},
        'professions': ['影契刺客', '霜华剑修'], 'map_stages': 12, 'regions': 3,
        'story_events': 27, 'linked_story_chains': 3, 'cards': 52, 'sound_profiles': 52, 'event_sound_profiles': 30,
        'formal_cubism_model_exported': False,
        'scene_models': 'procedural WebGL low-poly geometry, articulated parts; not production sculpted/skinned assets',
        'engine_tests': regression['engine'],
        'audio_tests': {'passed': audio['passed'] + ice_audio['passed'] + story_audio['passed'], 'failed': 0},
        'scene_tests': {'passed': scene['passed'] + regions['passed'], 'failed': 0},
        'browser_groups': {'passed': len(browser['results']), 'failed': 0},
        'export_roundtrip_checks': {'passed': exports['passed'], 'failed': 0},
        'public_api_simulations': {k: play[k] for k in ['completed', 'wins', 'defeats']},
        'full_recovery_checks': full['passed'], 'source_recovery_checks': source['passed'],
        'attachment_export_available': False, 'published_new_instance_verified': False,
        'cloud_configuration_updated_for_v6': False, 'cloud_environment_published': False,
        'github_repository': 'YONGLINGZ/CC', 'github_branch': 'main',
    }
    (ROOT / 'recovery/delivery.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
