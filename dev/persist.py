#!/usr/bin/env python3
"""Package and test non-destructive, offline v9 game recovery.

Python 3 and Node.js are needed only for rebuilding/recovery. Playing either
finished HTML product needs only a browser. This tool never changes cloud
configuration, uploads data, or includes the old full-size PNG originals.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE_NAMES = (
    "dev/shell.html", "dev/art.js", "dev/audio.js", "dev/engine.js",
    "dev/ui.js", "dev/build.cjs", "dev/build.py",
    "dev/expansion.js",
)
ASSET_GROUPS = {
    "items": ("clearheart_jade",),
    "events-sword_fallen": ("well", "shrine", "dreamshop", "theatre", "umbrella", "pawnshop", "riftwatch", "supply", "cultlab", "swordgrave", "pilgrims", "prisoner", "echo", "broker", "fox", "rest", "shop", "moon_trace", "sealed_name", "moon_vow", "armory"),
    "events-sword": ("well", "shrine", "dreamshop", "theatre", "umbrella", "pawnshop", "riftwatch", "supply", "cultlab", "swordgrave", "pilgrims", "prisoner", "echo", "broker", "fox", "rest", "shop", "moon_trace", "sealed_name", "moon_vow", "armory"),
    "events-sovereign": ("well", "shrine", "dreamshop", "theatre", "umbrella", "pawnshop", "riftwatch", "supply", "cultlab", "swordgrave", "pilgrims", "prisoner", "echo", "broker", "fox", "rest", "shop", "moon_trace", "sealed_name", "moon_vow", "armory"),
    "weapons": ("training", "rime", "divine", "spirit"),
    "regions": ("fog_gate", "broken_camp", "ritual_core"),
    "portraits": ("cat", "fox", "snake", "paper", "lantern", "ape", "bone", "yaksha", "raider", "liu", "ji", "wen", "feiye", "feiye_echo", "retainer", "heart", "snake_ascended", "sword_fallen", "gate_boss", "camp_boss", "apothecary"),
    "cards": tuple(f"C{number:02}" for number in range(1, 37)) + tuple(f"S{number:02}" for number in range(1, 17)) + tuple(f"F{number:02}" for number in range(1, 13)) + tuple(f"D{number:02}" for number in range(1, 7)),
    "events": ("well", "shrine", "dreamshop", "theatre", "umbrella", "pawnshop", "riftwatch", "supply", "cultlab", "swordgrave", "pilgrims", "prisoner", "echo", "broker", "fox", "rest", "shop", "liu_first", "liu_return", "liu_final", "ji_first", "ji_return", "ji_final", "wen_first", "wen_return", "wen_final", "sect_duel", "herb_caravan", "relic_dispute", "night_watch", "moon_trace", "sealed_name", "moon_vow", "armory", "sovereign_wake", "sovereign_recall", "sovereign_memory", "tainted_mercy", "demonic_offer", "demonic_warning", "mirror_trial", "demon_manual", "fallen_hunt"),
    "relics": ("bell", "jade", "moon", "fox", "fang", "silk", "vial", "bloodstone", "moonheart", "mirror", "dream", "godblood", "ninelives", "frostseal", "veil"),
    "puppet": ("cat-normal", "cat-wounded", "cat-critical", "cat-blink", "sword-normal", "sword-wounded", "sword-critical", "feiye-normal", "feiye-wounded", "feiye-critical", "sword_fallen-normal", "sword_fallen-wounded", "sword_fallen-critical"),
}
ASSET_NAMES = tuple(f"assets/{group}/{name}.webp" for group, names in ASSET_GROUPS.items() for name in names)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def collect(names: tuple[str, ...], *, assets: bool = False) -> dict[str, bytes]:
    files = {}
    for name in names:
        path = ROOT / name
        if not path.is_file() or any(part.is_symlink() for part in [path, *path.parents]):
            raise SystemExit("Missing file or symlink in release path: " + name)
        data = path.read_bytes()
        if assets and not (data.startswith(b"RIFF") and data[8:12] == b"WEBP"):
            raise SystemExit("Invalid WebP header: " + name)
        files[name] = data
    return files


def write_files(root: Path, contents: dict[str, bytes]) -> None:
    for name, data in contents.items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def build_at(root: Path, *, slim: bool = False) -> dict[str, bytes]:
    command = ["node", str(root / "dev/build.cjs"), "--strict"]
    if slim:
        command.append("--slim")
    result = subprocess.run(command, cwd=root, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    outputs = {"index.html": (root / "index.html").read_bytes()}
    if not slim:
        result = subprocess.run(command + ["--inline", "--output", "baiyao-standalone.html"],
                                cwd=root, capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError(result.stdout + result.stderr)
        outputs["baiyao-standalone.html"] = (root / "baiyao-standalone.html").read_bytes()
    return outputs


def package_bytes(files: dict[str, bytes]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return buffer.getvalue()


def script_body(payload: str, manifest: dict) -> str:
    # The literal quoted heredoc permits no shell interpolation of project data.
    template = r'''#!/bin/sh
# 百妖夜契 v9 离线恢复。仅补缺失文件；已有改动、符号链接均拒绝。
# 需要 Python 3 和 Node.js；游玩生成的 HTML 无需安装任何依赖。
# 可选：BAIYAO_RESTORE_ROOT=/absolute/empty/directory sh restore.sh
set -eu
python3 - <<'BAIYAO_RECOVERY_PY'
import base64
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tempfile
import zipfile

MANIFEST = json.loads(__MANIFEST__)
PAYLOAD = """__PAYLOAD__"""

def digest(value):
    return hashlib.sha256(value).hexdigest()

def fail(message):
    raise SystemExit("百妖夜契恢复失败：" + message)

def check_path(path):
    for component in [path, *path.parents]:
        if component.is_symlink():
            fail("路径含符号链接，未写入：" + str(component))

def safe_name(name):
    relative = PurePosixPath(name)
    if (not name or relative.is_absolute() or ".." in relative.parts or
            "\\" in name or str(relative) != name):
        fail("非法恢复路径：" + name)

root = Path(os.environ.get("BAIYAO_RESTORE_ROOT", "/workspace/CC"))
if not root.is_absolute() or root == Path("/") or ".." in root.parts:
    fail("BAIYAO_RESTORE_ROOT 必须是非根目录的绝对路径")
check_path(root)
if root.exists() and not root.is_dir():
    fail("目标目录被同名文件占用：" + str(root))
node = shutil.which("node")
if node is None:
    fail("恢复需要 Node.js；直接游玩已下载的 HTML 不需要安装 Node.js")
archive_bytes = base64.b64decode(PAYLOAD, validate=False)
if digest(archive_bytes) != MANIFEST["archive_sha256"]:
    fail("恢复包 SHA256 不符")
contents = {}
with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
    if archive.testzip() is not None:
        fail("恢复包 CRC 不符")
    if len(archive.namelist()) != len(MANIFEST["files"]) or set(archive.namelist()) != set(MANIFEST["files"]):
        fail("恢复包文件清单不符")
    for name, expected in MANIFEST["files"].items():
        safe_name(name)
        data = archive.read(name)
        if digest(data) != expected:
            fail("源文件 SHA256 不符：" + name)
        contents[name] = data

# Source-only restoration never writes images. Verify any present known assets
# before preserving a release folder HTML; incomplete assets use standalone SVG.
assets_complete = True
if MANIFEST["mode"] == "source-svg":
    for name, expected in MANIFEST["asset_sha256"].items():
        safe_name(name)
        path = root / name
        check_path(path)
        if path.exists():
            if not path.is_file() or digest(path.read_bytes()) != expected:
                fail("已有资源有修改，保留原文件并停止：" + str(path))
        else:
            assets_complete = False

# Rebuild in isolation and require byte-exact accepted outputs before touching
# the destination. No images.js or old PNG originals are needed in either mode.
with tempfile.TemporaryDirectory(prefix="baiyao-v9-verify-") as folder:
    staging = Path(folder)
    for name, data in contents.items():
        path = staging / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    for name, expected in MANIFEST["outputs"].items():
        safe_name(name)
        command = [node, str(staging / "dev/build.cjs"), "--strict", "--output", name]
        if MANIFEST["mode"] == "source-svg":
            command.append("--slim")
        elif name == "baiyao-standalone.html":
            command.append("--inline")
        result = subprocess.run(command, cwd=staging, capture_output=True, text=True)
        if result.returncode:
            fail("HTML 重建失败：\n" + result.stdout[-2000:] + result.stderr[-2000:])
        output = staging / name
        if not output.is_file() or digest(output.read_bytes()) != expected:
            fail("重建成品 SHA256 与验收版不一致：" + name)
        contents[name] = output.read_bytes()

if MANIFEST["mode"] == "source-svg":
    existing = root / "index.html"
    check_path(existing)
    if existing.is_file():
        data = existing.read_bytes()
        existing_hash = digest(data)
        if existing_hash == MANIFEST["release_outputs"]["baiyao-standalone.html"]:
            # An inline release copied/renamed to index.html needs no assets.
            contents["index.html"] = data
        elif existing_hash == MANIFEST["release_outputs"]["index.html"]:
            if not assets_complete:
                fail("已有目录版 HTML 缺少资源；请使用完整恢复包或在空目录恢复 SVG 版，未覆盖任何文件")
            contents["index.html"] = data

# Preflight ALL project destinations before creating any missing file.
for name, data in contents.items():
    destination = root / name
    check_path(destination)
    for parent in destination.parents:
        if parent == root.parent:
            break
        if parent.exists() and not parent.is_dir():
            fail("父目录被文件占用，未写入：" + str(parent))
    if destination.exists() and (not destination.is_file() or destination.read_bytes() != data):
        fail("同名文件有修改，已保留且未写入任何项目文件：" + str(destination))

created = 0
for name, data in contents.items():
    destination = root / name
    if destination.exists():
        continue
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        with destination.open("xb") as handle:
            handle.write(data)
    except FileExistsError:
        if not destination.is_file() or destination.read_bytes() != data:
            fail("恢复期间目标发生变化，保留该文件：" + str(destination))
        continue
    created += 1
for name, data in contents.items():
    if (root / name).read_bytes() != data:
        fail("写入后核验失败：" + name)
print("百妖夜契 v9 离线恢复成功：" + str(root))
print("模式：" + MANIFEST["mode"] + "；新增 " + str(created) + " 个文件；核验 " + str(len(contents)) + " 个文件。")
for name in MANIFEST["outputs"]:
    print(name + " SHA256: " + digest(contents[name]))
BAIYAO_RECOVERY_PY
'''
    return template.replace("__MANIFEST__", repr(json.dumps(manifest, ensure_ascii=True, sort_keys=True))).replace("__PAYLOAD__", payload)


def build(source_only: bool = False) -> tuple[Path, dict]:
    sources = collect(SOURCE_NAMES)
    assets = collect(ASSET_NAMES, assets=True)
    # Verify current release products first. Stale root HTML must never become
    # the reference hash for a newly generated recovery package.
    with tempfile.TemporaryDirectory(prefix="baiyao-v9-package-", dir="/tmp") as folder:
        staging = Path(folder)
        write_files(staging, {**sources, **assets})
        full_outputs = build_at(staging)
        for name, data in full_outputs.items():
            path = ROOT / name
            if not path.is_file() or path.read_bytes() != data:
                raise SystemExit("Release HTML is stale or missing; rebuild before packaging: " + name)
        if source_only:
            # Test absence of all images, rather than merely using --slim while
            # the assets are accidentally still present in the staging folder.
            shutil.rmtree(staging / "assets")
            outputs = build_at(staging, slim=True)
        else:
            outputs = full_outputs
    files = sources if source_only else {**sources, **assets}
    archive = package_bytes(files)
    manifest = {
        "format": "baiyao-offline-recovery-v9",
        "mode": "source-svg" if source_only else "full-webp",
        "files": {name: sha256(data) for name, data in sorted(files.items())},
        "outputs": {name: sha256(data) for name, data in outputs.items()},
        "release_outputs": {name: sha256(data) for name, data in full_outputs.items()},
        "asset_sha256": {name: sha256(data) for name, data in sorted(assets.items())},
        "asset_count": 0 if source_only else len(assets),
        "source_count": len(sources),
        "archive_sha256": sha256(archive),
        "archive_bytes": len(archive),
        "uncompressed_bytes": sum(map(len, files.values())),
        "requires_for_restore": ["POSIX shell", "Python 3", "Node.js"],
        "requires_for_play": ["browser"],
        "cloud_configuration_modified": False,
    }
    raw = base64.b64encode(archive).decode("ascii")
    encoded = "\n".join(raw[start:start + 100] for start in range(0, len(raw), 100))
    recovery = ROOT / "recovery"
    recovery.mkdir(exist_ok=True)
    stem = "restore-source" if source_only else "restore"
    prefix = "source-" if source_only else ""
    script = recovery / (stem + ".sh")
    script.write_text(script_body(encoded, manifest), encoding="utf-8")
    script.chmod(0o755)
    (recovery / (prefix + "manifest.json")).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (recovery / (stem + ".sha256")).write_text(sha256(script.read_bytes()) + "  " + stem + ".sh\n", encoding="ascii")
    # Reports are versioned and removed on rebuild; old passes cannot validate
    # a new payload when the newly generated script has not been exercised.
    report = recovery / (prefix + "tests.json")
    if report.exists():
        report.unlink()
    print(json.dumps({"script": str(script), "script_bytes": script.stat().st_size,
                      "mode": manifest["mode"], "assets": manifest["asset_count"],
                      "outputs": manifest["outputs"]}, ensure_ascii=False, indent=2))
    return script, manifest


def run_restore(script: Path, destination: Path | str) -> subprocess.CompletedProcess:
    environment = os.environ.copy()
    environment["BAIYAO_RESTORE_ROOT"] = str(destination)
    return subprocess.run(["sh", str(script)], env=environment, capture_output=True, text=True)


def snapshot(root: Path) -> dict:
    return {str(path.relative_to(root)): (sha256(path.read_bytes()), path.stat().st_mtime_ns)
            for path in root.rglob("*") if path.is_file() and not path.is_symlink()}


def succeeded(result: subprocess.CompletedProcess) -> None:
    assert result.returncode == 0, result.stdout + result.stderr


def exercise(script: Path, manifest: dict) -> dict:
    checks = []
    source_only = manifest["mode"] == "source-svg"
    with tempfile.TemporaryDirectory(prefix="baiyao-v9-recovery-test-", dir="/tmp") as folder:
        area = Path(folder)
        game = area / "game"
        succeeded(run_restore(script, game))
        for name, expected in {**manifest["files"], **manifest["outputs"]}.items():
            assert sha256((game / name).read_bytes()) == expected, name
        assert not (game / "dev/images.js").exists()
        assert not list(game.rglob("*.png"))
        if source_only:
            assert not (game / "assets").exists()
        checks.append("fresh empty directory: all payload files and generated outputs match exact SHA256; no images.js or PNG needed")

        before = snapshot(game)
        result = run_restore(script, game)
        succeeded(result)
        assert snapshot(game) == before
        assert "新增 0 个文件" in result.stdout
        checks.append("idempotent restore: zero files rewritten and all timestamps preserved")

        removed = ["dev/audio.js", "dev/expansion.js", *manifest["outputs"]]
        if not source_only:
            removed += ["assets/cards/C01.webp", "assets/events/well.webp", "assets/puppet/cat-critical.webp", "assets/puppet/cat-blink.webp", "assets/puppet/sword-critical.webp"]
        for name in removed:
            (game / name).unlink()
        succeeded(run_restore(script, game))
        assert snapshot(game).keys() == before.keys()
        for name, expected in {**manifest["files"], **manifest["outputs"]}.items():
            assert sha256((game / name).read_bytes()) == expected, name
        checks.append("missing source including expansion rules, outputs and selected assets including sword critical portrait: reconstructed byte-exactly")

        (game / "dev/ui.js").write_bytes(b"user source modification\n")
        (game / "index.html").unlink()
        before_conflict = snapshot(game)
        assert run_restore(script, game).returncode != 0
        assert snapshot(game) == before_conflict
        checks.append("modified source: refused before any writes; missing HTML remains missing")
        (game / "dev/ui.js").unlink()
        succeeded(run_restore(script, game))
        checks.append("after user removes conflicting source: restoration succeeds")

        (game / "index.html").write_bytes(b"user HTML modification\n")
        (game / "dev/audio.js").unlink()
        before_conflict = snapshot(game)
        assert run_restore(script, game).returncode != 0
        assert snapshot(game) == before_conflict
        checks.append("modified HTML: refused before any writes; missing source remains missing")

        linked = area / "linked"
        linked.mkdir()
        (linked / "dev").symlink_to(game / "dev", target_is_directory=True)
        assert run_restore(script, linked).returncode != 0
        assert not (linked / "index.html").exists()
        checks.append("symlinked source directory: refused without writes")

        dangling = area / "dangling"
        dangling.mkdir()
        (dangling / "index.html").symlink_to(area / "absent.html")
        assert run_restore(script, dangling).returncode != 0
        assert not (dangling / "dev").exists()
        assert not (area / "absent.html").exists()
        checks.append("dangling HTML symlink: refused without writes to target")

        blocked = area / "blocked"
        blocked.mkdir()
        (blocked / "dev").write_bytes(b"user file occupying directory\n")
        assert run_restore(script, blocked).returncode != 0
        assert (blocked / "dev").read_bytes() == b"user file occupying directory\n"
        assert not (blocked / "index.html").exists()
        checks.append("source parent occupied by a file: refused before writes")

        for target in ("relative/recovery", "/", str(area / "parent/../escape")):
            result = run_restore(script, target)
            assert result.returncode != 0
            assert "非根目录的绝对路径" in result.stderr
        assert not (area / "escape").exists()
        checks.append("relative, root and parent-traversal destinations: rejected")

        changed_asset = area / "changed-asset"
        write_files(changed_asset, {"assets/cards/C01.webp": b"user image edit\n"})
        before_asset = snapshot(changed_asset)
        assert run_restore(script, changed_asset).returncode != 0
        assert snapshot(changed_asset) == before_asset
        checks.append("modified card WebP: refused without any source or HTML writes")

        changed_puppet = area / "changed-puppet"
        write_files(changed_puppet, {"assets/puppet/cat-wounded.webp": b"user puppet image edit\n"})
        before_puppet = snapshot(changed_puppet)
        assert run_restore(script, changed_puppet).returncode != 0
        assert snapshot(changed_puppet) == before_puppet
        checks.append("modified wounded puppet WebP: refused before any source or HTML writes")

        changed_rig = area / "changed-rig"
        write_files(changed_rig, {"dev/audio.js": b"user audio edit\n"})
        before_rig = snapshot(changed_rig)
        assert run_restore(script, changed_rig).returncode != 0
        assert snapshot(changed_rig) == before_rig
        checks.append("modified audio source: refused and preserved before any file writes")

        changed_scene = area / "changed-scene"
        write_files(changed_scene, {"dev/expansion.js": b"user expansion edit\n"})
        before_scene = snapshot(changed_scene)
        assert run_restore(script, changed_scene).returncode != 0
        assert snapshot(changed_scene) == before_scene
        checks.append("modified expansion rules: refused and preserved before any source, resource or HTML writes")

        changed_sword = area / "changed-sword"
        write_files(changed_sword, {"assets/puppet/sword-wounded.webp": b"user sword heroine image edit\n"})
        before_sword = snapshot(changed_sword)
        assert run_restore(script, changed_sword).returncode != 0
        assert snapshot(changed_sword) == before_sword
        checks.append("modified sword heroine WebP: refused and preserved before any source or HTML writes")

        linked_assets = area / "linked-assets"
        linked_assets.mkdir()
        (linked_assets / "assets").symlink_to(changed_asset / "assets", target_is_directory=True)
        assert run_restore(script, linked_assets).returncode != 0
        assert not (linked_assets / "dev").exists()
        checks.append("symlinked assets directory: refused before writes")

        if source_only:
            partial = area / "partial-assets"
            subset = ("assets/portraits/cat.webp", "assets/cards/C01.webp", "assets/cards/S01.webp", "assets/events/well.webp", "assets/events/riftwatch.webp", "assets/puppet/cat-normal.webp", "assets/puppet/cat-blink.webp", "assets/puppet/sword-normal.webp")
            write_files(partial, {name: (ROOT / name).read_bytes() for name in subset})
            assets_before = snapshot(partial / "assets")
            succeeded(run_restore(script, partial))
            assert snapshot(partial / "assets") == assets_before
            assert sha256((partial / "index.html").read_bytes()) == manifest["outputs"]["index.html"]
            checks.append("partial WebP collection: no assets rewritten, exact single-file SVG fallback generated")

            renamed_inline = area / "inline-index"
            write_files(renamed_inline, {"index.html": (ROOT / "baiyao-standalone.html").read_bytes()})
            before_inline = snapshot(renamed_inline)
            succeeded(run_restore(script, renamed_inline))
            assert snapshot(renamed_inline)["index.html"] == before_inline["index.html"]
            assert not (renamed_inline / "assets").exists()
            checks.append("existing full inline HTML renamed index.html: preserved without external images")

            folder_release = area / "folder-release"
            write_files(folder_release, {"index.html": (ROOT / "index.html").read_bytes(),
                                        **{name: (ROOT / name).read_bytes() for name in ASSET_NAMES}})
            before_release = snapshot(folder_release)
            succeeded(run_restore(script, folder_release))
            after_release = snapshot(folder_release)
            assert all(after_release[name] == value for name, value in before_release.items())
            checks.append("existing folder release with all 233 WebPs: preserved byte-for-byte while sources restored")

            incomplete = area / "incomplete-folder-release"
            write_files(incomplete, {"index.html": (ROOT / "index.html").read_bytes(),
                                    "assets/cards/C01.webp": (ROOT / "assets/cards/C01.webp").read_bytes()})
            before_incomplete = snapshot(incomplete)
            assert run_restore(script, incomplete).returncode != 0
            assert snapshot(incomplete) == before_incomplete
            checks.append("existing folder release with missing WebPs: safely refused and untouched; requires full recovery or empty directory")

            standalone = area / "standalone-preserved"
            write_files(standalone, {"baiyao-standalone.html": (ROOT / "baiyao-standalone.html").read_bytes()})
            before_standalone = snapshot(standalone)
            succeeded(run_restore(script, standalone))
            assert snapshot(standalone)["baiyao-standalone.html"] == before_standalone["baiyao-standalone.html"]
            checks.append("existing standalone release: preserved while independent slim index is restored")
        else:
            changed_inline = area / "changed-inline"
            write_files(changed_inline, {"baiyao-standalone.html": b"user standalone edit\n"})
            before_inline = snapshot(changed_inline)
            assert run_restore(script, changed_inline).returncode != 0
            assert snapshot(changed_inline) == before_inline
            checks.append("modified standalone HTML: refused before writing any source, resource or folder index")
    report = {
        "format": "baiyao-recovery-tests-v9", "mode": manifest["mode"],
        "passed": len(checks), "failed": 0, "checks": checks,
        "script_sha256": sha256(script.read_bytes()), "outputs": manifest["outputs"],
        "release_outputs": manifest["release_outputs"],
        "asset_count_in_payload": manifest["asset_count"],
        "new_cloud_instance_tested": False, "draft_save_tested": False,
    }
    prefix = "source-" if source_only else ""
    (ROOT / "recovery" / (prefix + "tests.json")).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return report


def copy_backup() -> Path:
    backup = Path("/workspace/scratch/baiyao-recovery")
    backup.mkdir(parents=True, exist_ok=True)
    for name in ("restore.sh", "manifest.json", "restore.sha256", "tests.json",
                 "restore-source.sh", "source-manifest.json", "restore-source.sha256",
                 "source-tests.json", "config-status.json"):
        source = ROOT / "recovery" / name
        if source.is_file():
            target = backup / name
            shutil.copyfile(source, target)
            assert source.read_bytes() == target.read_bytes()
    print("Verified same-instance backup: " + str(backup))
    return backup


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--test", action="store_true", help="perform real recovery exercises in /tmp")
    parser.add_argument("--backup", action="store_true", help="copy recovery artifacts outside the checkout in this same instance")
    parser.add_argument("--source-only", action="store_true", help="package sources only; restore a playable image-free SVG HTML")
    args = parser.parse_args()
    script, manifest = build(source_only=args.source_only)
    if args.test:
        exercise(script, manifest)
    if args.backup:
        copy_backup()


if __name__ == "__main__":
    main()
