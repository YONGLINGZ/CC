#!/usr/bin/env python3
"""Package the verified v8 offline game and editable sources."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import os
import re
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_ART = {
    'portraits': 21, 'cards': 70, 'events': 43, 'relics': 15,
    'puppet': 13, 'regions': 3, 'weapons': 4, 'items': 1,
    'events-sword': 21, 'events-sovereign': 21, 'events-sword_fallen': 21,
}
ZIP_DATE = (2026, 10, 21, 0, 0, 0)


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def root_file(name):
    relative = PurePosixPath(name)
    require(not relative.is_absolute() and '..' not in relative.parts,
            'Unsafe release path: ' + name)
    path = ROOT.joinpath(*relative.parts)
    require(path.is_file() and not any(p.is_symlink() for p in [path, *path.parents]),
            'Missing file or symlink in release path: ' + name)
    return path


def describe(path):
    data = path.read_bytes()
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def report(name):
    value = json.loads(root_file(name).read_text(encoding='utf-8'))
    require(isinstance(value, dict), 'Invalid report: ' + name)
    return value


def verify_hash(name, digest):
    require(isinstance(digest, str) and re.fullmatch(r'[0-9a-f]{64}', digest),
            'Invalid SHA256 for ' + name)
    require(describe(root_file(name))['sha256'] == digest, 'Stale evidence: ' + name)


def verify_inputs(evidence, key='inputs'):
    inputs = evidence.get(key)
    require(isinstance(inputs, dict) and bool(inputs), 'Missing hash-bound ' + key)
    for name, digest in inputs.items():
        verify_hash(name, digest)


def passed(evidence, count, name):
    require(evidence.get('passed') == count and evidence.get('failed') == 0,
            'Incomplete or failed ' + name)
    if 'results' in evidence:
        require(len(evidence['results']) == count and all(r['ok'] for r in evidence['results']),
                'Failed checks in ' + name)
    for key in ('errors', 'externalRequests'):
        require(not evidence.get(key), name + ' has ' + key)


def verify_new_art():
    art = report('dev/v8-art-manifest.json')
    role = report('dev/v8-role-art-manifest.json')
    require(art.get('version') == 8 and len(art['entries']) == 20,
            'Missing v8 expansion art manifest')
    require(role.get('format') == 'baiyao-v8-fallen-role-event-art' and len(role['entries']) == 21,
            'Missing fallen event art manifest')
    paths = set()
    for entry in art['entries'] + role['entries']:
        name = entry.get('file', entry.get('path'))
        require(isinstance(name, str) and name.startswith('assets/') and name.endswith('.webp'),
                'Invalid art manifest path')
        require(name not in paths, 'Duplicate art manifest path: ' + name)
        paths.add(name)
        path = root_file(name)
        verify_hash(name, entry['sha256'])
        data = path.read_bytes()
        require(len(data) == entry['bytes'] and entry['width'] > 0 and entry['height'] > 0,
                'Invalid art dimensions or size: ' + name)
        require(data.startswith(b'RIFF') and data[8:12] == b'WEBP', 'Invalid WebP: ' + name)
        if entry.get('aliasOf'):
            require(data == root_file(entry['aliasOf']).read_bytes(), 'Broken explicit art alias: ' + name)
    require(len(paths) == 41, 'Expected 41 new v8 art files')
    return paths


def verify_recovery(evidence_name, manifest_name, script_name, count, mode, outputs):
    evidence, manifest = report(evidence_name), report(manifest_name)
    require(evidence.get('format') == 'baiyao-recovery-tests-v8', 'Stale recovery test format')
    passed(evidence, count, evidence_name)
    require(len(evidence['checks']) == count, 'Incomplete recovery checks: ' + evidence_name)
    require(manifest.get('format') == 'baiyao-offline-recovery-v8', 'Stale recovery manifest')
    require(evidence['mode'] == manifest['mode'] == mode, 'Recovery mode mismatch')
    require(evidence['release_outputs'] == manifest['release_outputs'] == outputs,
            'Recovery release outputs are stale')
    require(evidence['outputs'] == manifest['outputs'], 'Recovery rebuild output mismatch')
    verify_hash(script_name, evidence['script_sha256'])
    verify_inputs(manifest, 'files')
    verify_inputs(manifest, 'asset_sha256')
    expected_assets = 233 if mode == 'full-webp' else 0
    require(evidence['asset_count_in_payload'] == manifest['asset_count'] == expected_assets,
            'Unexpected recovery payload asset count')
    return evidence, manifest


def main():
    browser = report('dev/v8-results.json')
    require(browser.get('format') == 'baiyao-v8-browser', 'Stale browser format')
    passed(browser, 26, 'full browser integration')
    verify_hash('index.html', browser['sha256'])
    verify_hash('baiyao-standalone.html', browser['inline']['sha256'])
    require(not browser['inline']['requests'], 'Standalone browser run requested a network resource')
    verify_inputs(browser)
    verify_inputs(browser, 'assetInputs')
    natural = browser.get('naturalRuns', {})
    require(set(natural) == {'mark', 'sword', 'sovereign'}, 'Missing three-profession natural DOM runs')
    for starter, attempts in natural.items():
        require(bool(attempts), 'No natural DOM attempts for ' + starter)
        final = attempts[-1]
        require(final['result'] == 'victory' and final['history'] == 30,
                'No full natural DOM victory for ' + starter)
        require([n['floor'] for n in final['route']] == list(range(1, 31)),
                'Incomplete natural 30-step route for ' + starter)
        require(final['arrivals'] == [0, 1, 2] and
                {10, 20, 30}.issubset({b['floor'] for b in final['battles']}),
                'Natural run omitted a chapter or boss: ' + starter)
    require(natural['sovereign'][-1]['power'] == 3, 'Natural sovereign run missed power recovery')
    outputs = {'index.html': browser['sha256'], 'baiyao-standalone.html': browser['inline']['sha256']}

    local_file = report('dev/v8-file-browser-results.json')
    require(local_file['passed'] == 2 and local_file['failed'] == 0 or
            local_file['passed'] == 0 and local_file['failed'] == 1 and
            'ERR_BLOCKED_BY_ADMINISTRATOR' in local_file.get('error', ''),
            'Unexpected local file browser result; investigate before packaging')
    exports = report('dev/v8-export-results.json')
    passed(exports, 4, 'export round trips')
    require(exports['folderSha256'] == outputs['index.html'] and
            exports['inlineSha256'] == outputs['baiyao-standalone.html'], 'Export result is stale')
    audio_reports = [report(name) for name in ['dev/v8-audio-regression-results.json',
                     'dev/v8-sword-audio-results.json', 'dev/v8-audio-results.json']]
    for evidence, count in zip(audio_reports, [11, 8, 4]):
        passed(evidence, count, 'audio regression')
        verify_hash('dev/audio.js', evidence['audioSha256'])

    regression = report('dev/v8-regression-results.json')
    engine = regression['engine']
    require(engine['passed'] == engine['total'] == 161 and engine['failed'] == engine['skipped'] == 0,
            'Expected all 161 engine checks to pass')
    require(engine['legacy_checks'] == 144 and engine['new_checks'] == 17,
            'Legacy or v8 engine checks missing')
    verify_inputs(regression)
    require(regression['public_api']['completed'] == 150 and regression['hidden_api']['completed'] == 24,
            'Public simulation coverage incomplete')
    full, full_manifest = verify_recovery('recovery/tests.json', 'recovery/manifest.json',
                                         'recovery/restore.sh', 17, 'full-webp', outputs)
    source, source_manifest = verify_recovery('recovery/source-tests.json', 'recovery/source-manifest.json',
                                             'recovery/restore-source.sh', 21, 'source-svg', outputs)
    slim_smoke = report('dev/v8-source-browser-results.json')
    passed(slim_smoke, 3, 'source recovery browser smoke')
    verify_hash('dev/ui.js', slim_smoke['uiSha256'])
    verify_hash('recovery/restore-source.sh', slim_smoke['restoreScriptSha256'])
    require(slim_smoke['slimSha256'] == source_manifest['outputs']['index.html'],
            'Source browser smoke tested a stale rebuild')

    artwork = []
    for folder, count in EXPECTED_ART.items():
        images = sorted((ROOT / 'assets' / folder).glob('*.webp'))
        require(len(images) == count, 'Unexpected runtime art count: ' + folder)
        artwork.extend(images)
    require(len(artwork) == 233, 'Expected 233 runtime WebPs')
    artifact_paths = {p.relative_to(ROOT).as_posix() for p in artwork}
    require(set(browser['assetInputs']) == artifact_paths, 'Browser did not verify every runtime art file')
    require(set(full_manifest['asset_sha256']) == set(source_manifest['asset_sha256']) == artifact_paths,
            'Recovery art coverage differs from runtime art')
    decoded = browser.get('allAssetDecode', [])
    require(len(decoded) >= 233 and all(x['width'] > 0 and x['height'] > 0 for x in decoded),
            'Runtime image decoding was not verified')
    new_art = verify_new_art()
    require(new_art.issubset(artifact_paths), 'New v8 art is missing from runtime package')
    for html in ('index.html', 'baiyao-standalone.html'):
        text = root_file(html).read_text(encoding='utf-8')
        require(not any(token in text for token in ('NightScene', 'WebGLRenderer', 'THREE.',
                    'assets/scenes/', 'three.module', '<model-viewer', 'scene.js')),
                '3D runtime found in ' + html)
    require(not any(p.suffix.lower() in {'.glb', '.gltf', '.obj', '.fbx', '.vrm'}
                    for p in (ROOT / 'assets').rglob('*')), '3D runtime model assets found')

    members = [root_file(n) for n in ['index.html', 'baiyao-standalone.html', 'README.md',
               'GAME_README.md', 'TESTING.md', 'PERSISTENCE.md', 'LIVE2D_STATUS.md']]
    members += artwork
    members += sorted(p for p in (ROOT / 'dev').iterdir() if p.is_file() and
                      p.suffix in {'.html', '.js', '.cjs', '.py', '.md', '.json'})
    members += sorted((ROOT / 'docs/previews').glob('*.webp'))
    members += [root_file('recovery/' + n) for n in ['manifest.json', 'source-manifest.json',
                'tests.json', 'source-tests.json', 'cloud-v4-status.json', 'config-status.json']]
    members = sorted(set(members))
    require(ROOT / 'dev/shell.html' in members, 'Editable HTML shell missing from ZIP')
    payload = {p.relative_to(ROOT).as_posix(): root_file(p.relative_to(ROOT).as_posix()).read_bytes()
               for p in members}
    archive = ROOT / 'recovery/baiyao-rebuilt.zip'
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(prefix='.baiyao-package-', suffix='.zip',
                                         dir=archive.parent, delete=False) as stream:
            temporary = Path(stream.name)
        with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
            for relative, data in sorted(payload.items()):
                info = zipfile.ZipInfo('baiyao-rebuilt/' + relative, date_time=ZIP_DATE)
                info.create_system = 3
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                package.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        with zipfile.ZipFile(temporary) as package:
            require(package.testzip() is None, 'ZIP CRC verification failed')
            require(len(package.namelist()) == len(payload), 'Duplicate or missing ZIP members')
            require(set(package.namelist()) == {'baiyao-rebuilt/' + n for n in payload},
                    'ZIP member list differs from release payload')
            for relative, data in payload.items():
                require(package.read('baiyao-rebuilt/' + relative) == data == root_file(relative).read_bytes(),
                        'ZIP member differs from current release: ' + relative)
        temporary.chmod(0o644)
        os.replace(temporary, archive)
        temporary = None
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)

    play = regression['public_api']
    evidence_names = ['dev/v8-results.json', 'dev/v8-export-results.json',
                      'dev/v8-audio-regression-results.json', 'dev/v8-sword-audio-results.json',
                      'dev/v8-audio-results.json', 'dev/v8-regression-results.json',
                      'dev/v8-source-browser-results.json', 'dev/v8-art-manifest.json',
                      'dev/v8-role-art-manifest.json', 'dev/v8-file-browser-results.json', 'recovery/tests.json',
                      'recovery/source-tests.json', 'recovery/manifest.json', 'recovery/source-manifest.json']
    receipt = {
        'version': '蚀心长夜版', 'date': '2026-10-21', 'based_on': 'user 33.zip and v7 game',
        'game_html': describe(root_file('index.html')),
        'standalone_html': describe(root_file('baiyao-standalone.html')),
        'play_zip': describe(archive), 'zip_crc': 'PASS', 'zip_every_member_byte_exact': True,
        'zip_members': len(payload), 'editable_shell_in_zip': True,
        'runtime_art': {folder: {'count': count, 'bytes': sum(p.stat().st_size for p in
                        (ROOT / 'assets' / folder).glob('*.webp'))} for folder, count in EXPECTED_ART.items()},
        'runtime_art_total': 233, 'new_v8_art_files': 41,
        'professions': ['影契刺客', '霜华剑修', '无相宫主'],
        'map_stages': 30, 'steps_per_chapter': 10, 'regions': 3,
        'route_templates': 20, 'chapter_templates_selected_independently': True,
        'nodes_per_chapter': [42, 46], 'nodes_per_run': [126, 138], 'random_node_types': True,
        'story_events': 40, 'linked_story_chains': 3, 'cards': 70, 'sound_profiles': 70,
        'event_sound_profiles': 43, 'role_specific_event_variants': 63, 'weapons': 4,
        'quest_items': 1, 'meta_unlock_storage': True, 'formal_cubism_model_exported': False,
        'runtime_3d': False, 'scene_models': 'removed; painted regional backgrounds, 2D routes and static character art',
        'engine_tests': engine, 'audio_tests': {'passed': 23, 'failed': 0},
        'browser_groups': {'passed': 26, 'failed': 0}, 'natural_dom_professions': 3,
        'export_roundtrip_checks': {'passed': exports['passed'], 'failed': 0},
        'public_api_simulations': {k: play[k] for k in ['completed', 'wins', 'defeats']},
        'hidden_route_simulations': regression['hidden_api'],
        'full_recovery_checks': full['passed'], 'source_recovery_checks': source['passed'],
        'source_browser_checks': slim_smoke['passed'],
        'local_file_browser': {'passed': local_file['passed'], 'failed': local_file['failed'],
            'status': 'blocked by cloud browser administrator before game load; no desktop double-click verification' if local_file['failed'] else 'verified'},
        'verification_inputs': {name: describe(root_file(name))['sha256'] for name in evidence_names},
        'attachment_export_available': False, 'published_new_instance_verified': False,
        'cloud_configuration_updated_for_v8': False, 'cloud_environment_published': False,
        'github_repository': 'YONGLINGZ/CC', 'github_branch': 'main',
    }
    (ROOT / 'recovery/delivery.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n',
                                               encoding='utf-8')
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
