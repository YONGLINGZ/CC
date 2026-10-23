#!/usr/bin/env python3
"""Package the verified v11 offline game and editable sources."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import os
import re
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_ART = {
    'portraits': 31, 'cards': 70, 'events': 88, 'relics': 15,
    'puppet': 13, 'regions': 7, 'weapons': 4, 'items': 1,
    'events-sword': 21, 'events-sovereign': 21, 'events-sword_fallen': 21,
}
ZIP_DATE = (2026, 10, 23, 0, 0, 0)


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
    portraits, scenes = report('dev/v11-art-manifest.json'), report('dev/v11-scene-art-manifest.json')
    require(len(portraits['entries']) == 12, 'Expected nine independent boss and three elite portraits')
    require(len(scenes['entries']) == 16, 'Expected four backgrounds and twelve independent event paintings')
    paths = set()
    for entry in portraits['entries'] + scenes['entries']:
        name = entry.get('file', entry.get('path'))
        require(isinstance(name, str) and name.startswith('assets/') and name.endswith('.webp'), 'Invalid new art path')
        require(name not in paths, 'Duplicate new art path')
        paths.add(name)
        path = root_file(name)
        verify_hash(name, entry['sha256'])
        require(path.stat().st_size == entry['bytes'] and entry['width'] >= 768 and entry['height'] >= 768,
                'New art size or dimensions invalid: ' + name)
        data=path.read_bytes()
        require(data.startswith(b'RIFF') and data[8:12] == b'WEBP', 'Invalid WebP: ' + name)
    # Old art stays checked except explicitly superseded, newly generated portraits.
    for previous in ('dev/v8-art-manifest.json', 'dev/v8-role-art-manifest.json'):
        for entry in report(previous)['entries']:
            name=entry.get('file', entry.get('path'))
            if name not in paths:
                verify_hash(name, entry['sha256'])
    return paths


def verify_recovery(evidence_name, manifest_name, script_name, count, mode, outputs):
    evidence, manifest = report(evidence_name), report(manifest_name)
    require(evidence.get('format') == 'baiyao-recovery-tests-v11', 'Stale recovery test format')
    passed(evidence, count, evidence_name)
    require(len(evidence['checks']) == count, 'Incomplete recovery checks: ' + evidence_name)
    require(manifest.get('format') == 'baiyao-offline-recovery-v11', 'Stale recovery manifest')
    require(evidence['mode'] == manifest['mode'] == mode, 'Recovery mode mismatch')
    require(evidence['release_outputs'] == manifest['release_outputs'] == outputs,
            'Recovery release outputs are stale')
    require(evidence['outputs'] == manifest['outputs'], 'Recovery rebuild output mismatch')
    verify_hash(script_name, evidence['script_sha256'])
    verify_inputs(manifest, 'files')
    verify_inputs(manifest, 'asset_sha256')
    expected_assets = 292 if mode == 'full-webp' else 0
    require(evidence['asset_count_in_payload'] == manifest['asset_count'] == expected_assets,
            'Unexpected recovery payload asset count')
    return evidence, manifest


def main():
    browser = report('dev/v11-results.json')
    require(browser.get('format') == 'baiyao-v11-browser', 'Stale browser format')
    require(browser['passed'] >= 10, 'Insufficient current browser coverage')
    passed(browser, browser['passed'], 'full browser integration')
    verify_hash('index.html', browser['sha256'])
    verify_hash('baiyao-standalone.html', browser['inline']['sha256'])
    require(not browser['inline']['requests'], 'Standalone browser run requested a network resource')
    verify_inputs(browser)
    verify_inputs(browser, 'assetInputs')
    require(browser.get('automaton') and len(browser['automaton']['turns']) == 4 and len(browser['automaton']['sound']) == 5,
            'Missing actual household-boss effect/audio browser checks')
    natural = browser.get('naturalRuns', {})
    require('sword' in natural, 'Missing sword natural DOM run')
    final = natural['sword'][-1]
    require(final['result'] == 'victory' and final['history'] == 70,
            'No full natural sword DOM victory')
    require([n['floor'] for n in final['route']] == list(range(1, 71)),
            'Incomplete natural 70-step route')
    require(final['arrivals'] == list(range(7)) and
            set(range(10,71,10)).issubset({b['floor'] for b in final['battles']}),
            'Natural run omitted a chapter or boss')
    outputs = {'index.html': browser['sha256'], 'baiyao-standalone.html': browser['inline']['sha256']}

    batch_a = report('dev/batch-a-browser-results.json')
    require(batch_a.get('format') == 'baiyao-batch-a-browser', 'Missing Batch A browser evidence')
    passed(batch_a, 11, 'Batch A focused browser acceptance')
    verify_inputs(batch_a)
    tales = report('dev/tales-browser-results.json')
    passed(tales, 10, 'linked stories, cave and fallen-path integration')
    verify_inputs(tales)
    new_tales_art = report('dev/tales-art-manifest.json')['entries']
    require(len(new_tales_art) == 34, 'Missing independent cave/tale/patrol art')
    for entry in new_tales_art:
        verify_hash(entry['target'], entry['sha256'])
        require(entry['reviewed'] and min(entry['width'], entry['height']) >= 768,
                'Unreviewed or small story art')

    local_file = report('dev/v8-file-browser-results.json')
    require(local_file['passed'] == 2 and local_file['failed'] == 0 or
            local_file['passed'] == 0 and local_file['failed'] == 1 and
            'ERR_BLOCKED_BY_ADMINISTRATOR' in local_file.get('error', ''),
            'Unexpected local file browser result; investigate before packaging')
    exports = report('dev/v11-export-results.json')
    passed(exports, 4, 'export round trips')
    require(exports['folderSha256'] == outputs['index.html'] and
            exports['inlineSha256'] == outputs['baiyao-standalone.html'], 'Export result is stale')
    audio_reports = [report(name) for name in ['dev/v8-audio-regression-results.json',
                     'dev/v8-sword-audio-results.json', 'dev/v8-audio-results.json']]
    for evidence, count in zip(audio_reports, [11, 8, 4]):
        passed(evidence, count, 'audio regression')
        verify_hash('dev/audio.js', evidence['audioSha256'])

    regression = report('dev/v11-regression-results.json')
    engine = regression['engine']
    require(engine['passed'] == engine['total'] and engine['total'] > 219 and engine['failed'] == engine['skipped'] == 0,
            'Expected retained and new engine checks to pass')
    require(engine['legacy_checks'] == 219 and engine['new_checks'] == engine['total'] - 219,
            'Retained or v11 engine checks missing')
    verify_inputs(regression)
    require(regression['public_api']['completed'] == 150 and regression['hidden_api']['completed'] == 24,
            'Public simulation coverage incomplete')
    full, full_manifest = verify_recovery('recovery/tests.json', 'recovery/manifest.json',
                                         'recovery/restore.sh', 17, 'full-webp', outputs)
    source, source_manifest = verify_recovery('recovery/source-tests.json', 'recovery/source-manifest.json',
                                             'recovery/restore-source.sh', 21, 'source-svg', outputs)
    slim_smoke = report('dev/v11-source-browser-results.json')
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
    require(len(artwork) == 292, 'Expected 292 runtime WebPs')
    artifact_paths = {p.relative_to(ROOT).as_posix() for p in artwork}
    require(set(browser['assetInputs']) == artifact_paths, 'Browser did not verify every runtime art file')
    require(set(full_manifest['asset_sha256']) == set(source_manifest['asset_sha256']) == artifact_paths,
            'Recovery art coverage differs from runtime art')
    decoded = browser.get('allAssetDecode', [])
    require(len(decoded) >= 292 and all(x['width'] > 0 and x['height'] > 0 for x in decoded),
            'Runtime image decoding was not verified')
    new_art = verify_new_art()
    require(new_art.issubset(artifact_paths), 'New v11 art is missing from runtime package')
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
    members += sorted((ROOT / 'docs').glob('*.md'))
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
    vectors = json.loads(subprocess.check_output(['node', '-e',
        "require('./dev/art.js');console.log(JSON.stringify({icons:Object.keys(YokaiArt.icons),items:Object.keys(YokaiArt.items||{}),cave:!!YokaiArt.events.cave}))"],
        cwd=ROOT, text=True))
    require(vectors['cave'] and len(vectors['items']) >= 7, 'Missing cave or consumable vector artwork')
    require(set(['fight','elite','boss','rest','shop','fox','event','cave']).issubset(vectors['icons']),
            'Missing universal route symbol')
    evidence_names = ['dev/tales-browser-results.json', 'dev/tales-art-manifest.json', 'dev/batch-a-browser-results.json', 'dev/v11-results.json', 'dev/v11-export-results.json',
                      'dev/v8-audio-regression-results.json', 'dev/v8-sword-audio-results.json',
                      'dev/v8-audio-results.json', 'dev/v11-regression-results.json',
                      'dev/v11-source-browser-results.json', 'dev/v11-art-manifest.json', 'dev/v11-scene-art-manifest.json',
                      'dev/v8-role-art-manifest.json', 'dev/v8-file-browser-results.json', 'recovery/tests.json',
                      'recovery/source-tests.json', 'recovery/manifest.json', 'recovery/source-manifest.json']
    receipt = {
        'version': '寒渊七境 · 十段人间事', 'date': '2026-10-23', 'based_on': 'user 33.zip, v10 and audited numerical proposal',
        'game_html': describe(root_file('index.html')),
        'standalone_html': describe(root_file('baiyao-standalone.html')),
        'play_zip': describe(archive), 'zip_crc': 'PASS', 'zip_every_member_byte_exact': True,
        'zip_members': len(payload), 'editable_shell_in_zip': True,
        'runtime_art': {folder: {'count': count, 'bytes': sum(p.stat().st_size for p in
                        (ROOT / 'assets' / folder).glob('*.webp'))} for folder, count in EXPECTED_ART.items()},
        'runtime_art_total': 292, 'new_generated_art_files': 34, 'retained_v11_generated_art_files': 28, 'inline_vector_icons': len(vectors['icons']), 'universal_map_icons': 8, 'inline_cave_scene': True, 'inline_item_art': len(vectors['items']), 'map_direction': 'bottom-to-top', 'map_node_shape':'pentagon', 'hidden_narrative_counters': True, 'status_details_on_click_only': True, 'core_resources_always_labelled': True,
        'tales': {'browser_groups': tales['passed'], 'new_rule_checks': 23, 'cave_painted': True, 'fall_portrait_existing_three_states_verified': True, 'resume_rest_after_patrol_reward': True, 'new_art_files':34},
        'batch_a': {'browser_groups': batch_a['passed'], 'new_rule_checks': 15,
                    'existing_starters': 5, 'mobile_css_widths': [360,390,430],
                    'motion_modes': ['full','fast','reduced'], 'core_resource_zeroes_visible': True,
                    'rule_layer_preview': True, 'single_run_save_implemented': False,
                    'new_proposed_story_endings_implemented': False,
                    'physical_phone_tested': False, 'cross_browser_tested': False},
        'professions': ['影契刺客', '霜华剑修', '无相宫主'],
        'map_stages': 70, 'steps_per_chapter': 10, 'regions': 7,
        'route_templates': 20, 'chapter_templates_selected_independently': True,
        'nodes_per_chapter': [42, 46], 'nodes_per_run': [294, 322], 'random_node_types': True,
        'story_events': 84, 'linked_story_chains': 13, 'new_chains': 10, 'new_linked_events': 30, 'chains_sampled_per_run': 3, 'travel_interruptions': 2, 'cards': 70, 'sound_profiles': 70,
        'event_sound_profiles': 76, 'role_specific_event_variants': 63, 'weapons': 4,
        'reworked_boss': {'id':'lotus_boss','name':'故宅机仆·缄红','new_portraits':1,'household_tools':4,'revenge_threshold':0.5,'revenge_per_hit':1,'new_sound_cues':5,'focused_rule_checks':12},
        'boss_roster': {'early':5,'middle':3,'final':1}, 'enemies':25, 'boss_illustrations':9, 'quest_items': 1, 'meta_unlock_storage': True, 'formal_cubism_model_exported': False,
        'consumables':7, 'cave_loot_fixed_on_entry':True, 'combat_consumable_limit_per_turn':1,
        'frost':{'cap':10,'decay_after_enemy_turn':1,'slow_threshold':5,'damage_reduction_per_hit':1,'freeze_threshold':10,'freeze_chance':0.1,'elite_applications_per_stack':2},
        'bleed':{'cap':7,'chance_per_stack':0.03,'damage':'uniform 1..stacks, bypass shield','tick':'enemy turn start'},
        'runtime_3d': False, 'scene_models': 'removed; painted regional backgrounds, 2D routes and static character art',
        'numeric_calibration':regression['calibration'], 'engine_tests': engine, 'audio_tests': {'passed': 23, 'failed': 0, 'rerun_for_current_release': True, 'new_encounter_waveforms': 33, 'scope': 'Actual AudioContext and OfflineAudioContext; no human listening evaluation'},
        'browser_groups': {'passed': browser['passed'], 'failed': 0}, 'natural_dom_professions': 1,
        'export_roundtrip_checks': {'passed': exports['passed'], 'failed': 0},
        'public_api_simulations': {k: play[k] for k in ['completed', 'wins', 'defeats']},
        'hidden_route_simulations': regression['hidden_api'],
        'full_recovery_checks': full['passed'], 'source_recovery_checks': source['passed'],
        'source_browser_checks': slim_smoke['passed'],
        'local_file_browser': {'passed': local_file['passed'], 'failed': local_file['failed'],
            'evidence_scope': 'Historical v8 cloud-browser file URL probe; v11 verified through local HTTP and direct standalone HTML.',
            'status': 'blocked by cloud browser administrator before game load; no desktop double-click verification' if local_file['failed'] else 'verified'},
        'verification_inputs': {name: describe(root_file(name))['sha256'] for name in evidence_names},
        'attachment_export_available': False, 'published_new_instance_verified': False,
        'cloud_configuration_updated_for_v11': False, 'cloud_environment_published': False,
        'github_repository': 'YONGLINGZ/CC', 'github_branch': 'main',
    }
    (ROOT / 'recovery/delivery.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n',
                                               encoding='utf-8')
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
