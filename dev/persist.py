#!/usr/bin/env python3
"""Build and exercise a complete, offline, non-destructive recovery script.

The payload contains editable sources and original PNG portraits, rather than a
second copy of the generated HTML. The embedded sources rebuild index.html in a
temporary directory and verify its exact SHA-256 before anything is restored.
Only Python's standard library is required. This tool never changes cloud
configuration and never uploads project data.
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
    "dev/shell.html",
    "dev/art.js",
    "dev/engine.js",
    "dev/ui.js",
    "dev/build.py",
)
PORTRAIT_NAMES = (
    "assets/cat.png", "assets/fox.png", "assets/snake.png",
    "assets/paper.png", "assets/lantern.png", "assets/ape.png",
    "assets/bone.png", "assets/yaksha.png",
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def script_body(payload: str, manifest: dict) -> str:
    # No shell interpolation occurs in the quoted heredoc. Base64 is data and
    # the restore root is taken directly from the process environment in Python.
    template = r'''#!/bin/sh
# 百妖夜契：完整离线恢复包。仅补齐缺失文件，不覆盖现有修改。
# 可选：BAIYAO_RESTORE_ROOT=/absolute/target sh restore.sh
set -eu
python3 - <<'BAIYAO_RECOVERY_PY'
import base64
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import sys
import tempfile
import zipfile

MANIFEST = json.loads(__MANIFEST__)
PAYLOAD = """__PAYLOAD__"""

def digest(value):
    return hashlib.sha256(value).hexdigest()

def fail(message):
    raise SystemExit("百妖夜契恢复失败：" + message)

def check_path(path):
    # Reject existing symlinks, including dangling links and parent links.
    for component in [path, *path.parents]:
        if component.is_symlink():
            fail("路径含符号链接，未写入：" + str(component))

root = Path(os.environ.get("BAIYAO_RESTORE_ROOT", "/workspace/CC"))
if not root.is_absolute() or root == Path("/") or ".." in root.parts:
    fail("BAIYAO_RESTORE_ROOT 必须是非根目录的绝对路径")
check_path(root)
if root.exists() and not root.is_dir():
    fail("目标目录被同名文件占用：" + str(root))
archive = base64.b64decode(PAYLOAD, validate=False)
if digest(archive) != MANIFEST["archive_sha256"]:
    fail("恢复包 SHA256 不符")
with zipfile.ZipFile(io.BytesIO(archive), "r") as package:
    if package.testzip() is not None:
        fail("恢复包 CRC 校验失败")
    if set(package.namelist()) != set(MANIFEST["files"]):
        fail("恢复包文件清单不符")
    contents = {}
    for name, expected in MANIFEST["files"].items():
        relative = PurePosixPath(name)
        if relative.is_absolute() or ".." in relative.parts or "\\" in name:
            fail("非法恢复路径：" + name)
        data = package.read(name)
        if digest(data) != expected:
            fail("源文件 SHA256 不符：" + name)
        contents[name] = data

# Build in isolation. A broken/tampered build cannot overwrite existing files.
with tempfile.TemporaryDirectory(prefix="baiyao-verify-") as directory:
    staging = Path(directory)
    for name, data in contents.items():
        destination = staging / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
    result = subprocess.run([sys.executable, str(staging / "dev/build.py")],
                            cwd=str(staging), capture_output=True, text=True)
    if result.returncode:
        fail("HTML 重建失败（退出码 " + str(result.returncode) + "）：\n" +
             result.stdout[-3000:] + result.stderr[-3000:])
    generated = staging / "index.html"
    if not generated.is_file():
        fail("构建未生成 index.html")
    html = generated.read_bytes()
    if digest(html) != MANIFEST["index_sha256"]:
        fail("重建 index.html 的 SHA256 与已验收成品不一致")
    contents["index.html"] = html

# Preflight the entire destination before creating any project file.
for name, data in contents.items():
    destination = root / name
    check_path(destination)
    for parent in destination.parents:
        if parent == root.parent:
            break
        if parent.exists() and not parent.is_dir():
            fail("目标父目录被文件占用，未写入：" + str(parent))
    if destination.exists():
        if not destination.is_file() or destination.read_bytes() != data:
            fail("检测到同名文件有修改，已保留且未写入任何项目文件：" + str(destination))

created = 0
for name, data in contents.items():
    destination = root / name
    if destination.exists():
        continue
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation also protects against a file appearing after preflight.
    try:
        with destination.open("xb") as handle:
            handle.write(data)
    except FileExistsError:
        if destination.read_bytes() != data:
            fail("恢复期间目标发生变化，已保留该文件：" + str(destination))
        continue
    created += 1

for name, data in contents.items():
    if (root / name).read_bytes() != data:
        fail("写入后核验失败：" + name)
print("百妖夜契完整离线恢复成功：" + str(root))
print("新增 " + str(created) + " 个文件；核验 " + str(len(contents)) + " 个文件（含原始 PNG 立绘）。")
print("index.html SHA256: " + MANIFEST["index_sha256"])
BAIYAO_RECOVERY_PY
'''
    return template.replace("__MANIFEST__", repr(json.dumps(manifest, ensure_ascii=True, sort_keys=True))).replace("__PAYLOAD__", payload)


def collect() -> dict[str, bytes]:
    files = {}
    for name in SOURCE_NAMES:
        path = ROOT / name
        if not path.is_file() or path.is_symlink():
            raise SystemExit("Required source is missing or is a symlink: " + name)
        files[name] = path.read_bytes()
    portraits = [ROOT / name for name in PORTRAIT_NAMES]
    missing_portraits = {path.name for path in portraits if not path.is_file()}
    if missing_portraits:
        raise SystemExit("Refusing an incomplete artwork backup. Missing portraits: " +
                         ", ".join(sorted(missing_portraits)))
    for path in portraits:
        if path.is_symlink():
            raise SystemExit("Refusing a symlinked portrait: " + str(path))
        data = path.read_bytes()
        if not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise SystemExit("Invalid PNG signature: " + str(path))
        files[path.relative_to(ROOT).as_posix()] = data
    return files


def source_script_body(payload: str, manifest: dict) -> str:
    """Restore sources, using all verified PNGs or the uniform SVG fallback.

    Exactly two known HTML hashes suffice: all originals, or no originals. A
    partial image collection stays untouched but is not used for the build.
    Existing known full-art HTML is preserved in either case.
    """
    script = script_body(payload, manifest)
    before_build = '''# Source fallback: original PNG portraits are NOT embedded here.
# Reuse existing, unmodified originals when present; never write image files.
portrait_contents = {}
for name in MANIFEST["png_sha256"]:
    portrait = root / name
    check_path(portrait)
    if portrait.exists():
        if not portrait.is_file():
            fail("立绘路径不是文件：" + str(portrait))
        data = portrait.read_bytes()
        if digest(data) != MANIFEST["png_sha256"][name]:
            fail("已有立绘内容不同，保留原文件并停止：" + str(portrait))
        portrait_contents[name] = data
full_art = len(portrait_contents) == len(MANIFEST["png_sha256"])
if not full_art:
    # Leave partial originals untouched. Rebuild one known, complete SVG UI,
    # avoiding a different generated product for every PNG availability mask.
    portrait_contents = {}

'''
    marker = "# Build in isolation. A broken/tampered build cannot overwrite existing files.\n"
    assert script.count(marker) == 1
    script = script.replace(marker, before_build + marker)
    marker = '    result = subprocess.run([sys.executable, str(staging / "dev/build.py")],'
    assert script.count(marker) == 1
    script = script.replace(marker, '''    for name, data in portrait_contents.items():
        destination = staging / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
''' + marker)
    marker = '    if digest(html) != MANIFEST["index_sha256"]:'
    assert script.count(marker) == 1
    script = script.replace(marker, '    if digest(html) != MANIFEST["variant_sha256"]["full" if full_art else "svg"]:')
    marker = '    contents["index.html"] = html\n'
    assert script.count(marker) == 1
    script = script.replace(marker, marker + '''    # A self-contained full-art HTML remains fully playable without external
    # images. Preserve that exact known product even when source PNGs are absent.
    existing_html = root / "index.html"
    check_path(existing_html)
    if existing_html.is_file():
        existing_bytes = existing_html.read_bytes()
        if digest(existing_bytes) == MANIFEST["full_index_sha256"]:
            contents["index.html"] = existing_bytes
''')
    script = script.replace(
        '# 百妖夜契：完整离线恢复包。仅补齐缺失文件，不覆盖现有修改。',
        '# 百妖夜契：源码/SVG 离线恢复包。仅补齐缺失文件，不覆盖现有修改。\n'
        '# 保存完整游戏规则与界面；8张PNG齐全时使用原图，否则使用内联SVG。\n'
        '# 本包不含PNG原件；生成本包不会更新云配置草稿。')
    script = script.replace('print("百妖夜契完整离线恢复成功：" + str(root))',
                            'print("百妖夜契源码/SVG离线恢复成功：" + str(root))')
    script = script.replace('" 个文件（含原始 PNG 立绘）。"',
                            '" 个文件；本恢复包不含PNG，缺图时使用内联SVG。"')
    script = script.replace('print("index.html SHA256: " + MANIFEST["index_sha256"])',
                            'print("index.html SHA256: " + digest(contents["index.html"]))')
    return script


def build_source_only() -> tuple[Path, dict]:
    all_files = collect()
    files = {name: all_files[name] for name in SOURCE_NAMES}
    pngs = {name: data for name, data in all_files.items() if name.endswith(".png")}
    variant_hashes = {}
    with tempfile.TemporaryDirectory(prefix="baiyao-svg-variants-", dir="/tmp") as folder:
        staging = Path(folder)
        for name, data in files.items():
            target = staging / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        for variant in ("svg", "full"):
            if variant == "full":
                for name, data in pngs.items():
                    target = staging / name
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(data)
            subprocess.run([os.sys.executable, str(staging / "dev/build.py")],
                           cwd=str(staging), capture_output=True, check=True)
            variant_hashes[variant] = sha256((staging / "index.html").read_bytes())
    assert variant_hashes["full"] == sha256((ROOT / "index.html").read_bytes()), "Frozen full HTML is stale"
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            package.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    archive = buffer.getvalue()
    manifest = {"format": "baiyao-offline-source-svg-recovery-v2", "mode": "source-svg",
                "files": {name: sha256(data) for name, data in sorted(files.items())},
                "png_sha256": {name: sha256(data) for name, data in sorted(pngs.items())},
                "variant_sha256": variant_hashes, "index_sha256": variant_hashes["svg"],
                "full_index_sha256": variant_hashes["full"],
                "archive_sha256": sha256(archive), "archive_bytes": len(archive),
                "portrait_count": 0,
                "limitation": "本包不含PNG；全部8张原图齐全则重建全图版，否则重建统一SVG版。生成本包不会更新云配置草稿。"}
    raw = base64.b64encode(archive).decode("ascii")
    encoded = "\n".join(raw[start:start + 100] for start in range(0, len(raw), 100))
    recovery = ROOT / "recovery"
    recovery.mkdir(exist_ok=True)
    script = recovery / "restore-source.sh"
    script.write_text(source_script_body(encoded, manifest), encoding="utf-8")
    script.chmod(0o755)
    (recovery / "source-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (recovery / "restore-source.sha256").write_text(sha256(script.read_bytes()) + "  restore-source.sh\n", encoding="ascii")
    report = recovery / "source-tests.json"
    if report.exists():
        report.unlink()
    print(json.dumps({"script": str(script), "script_bytes": script.stat().st_size,
                      "svg_index_sha256": variant_hashes["svg"],
                      "full_index_sha256": variant_hashes["full"],
                      "png_count_in_payload": 0}, ensure_ascii=False, indent=2))
    return script, manifest


def exercise_source_only(script: Path, manifest: dict) -> dict:
    checks = []
    with tempfile.TemporaryDirectory(prefix="baiyao-svg-recovery-test-", dir="/tmp") as folder:
        root = Path(folder)
        svg = root / "svg"
        result = run_restore(script, svg)
        assert result.returncode == 0, result.stdout + result.stderr
        assert sha256((svg / "index.html").read_bytes()) == manifest["index_sha256"]
        assert not (svg / "assets").exists(), "SVG recovery unexpectedly wrote PNGs"
        for name, expected in manifest["files"].items():
            assert sha256((svg / name).read_bytes()) == expected
        checks.append("fresh restore without PNG: five full sources + exact SVG HTML; no PNG written")
        before = {str(path): path.stat().st_mtime_ns for path in svg.rglob("*") if path.is_file()}
        result = run_restore(script, svg)
        assert result.returncode == 0, result.stdout + result.stderr
        assert before == {str(path): path.stat().st_mtime_ns for path in svg.rglob("*") if path.is_file()}
        checks.append("repeat SVG restore: zero files rewritten")
        (svg / "index.html").unlink()
        result = run_restore(script, svg)
        assert result.returncode == 0, result.stdout + result.stderr
        assert sha256((svg / "index.html").read_bytes()) == manifest["index_sha256"]
        checks.append("missing SVG HTML: exact hash rebuilt")
        for include_png in (False, True):
            full = root / ("full-with-png" if include_png else "full-without-png")
            full.mkdir()
            shutil.copyfile(ROOT / "index.html", full / "index.html")
            if include_png:
                (full / "assets").mkdir()
                for name in manifest["png_sha256"]:
                    shutil.copyfile(ROOT / name, full / name)
            before_bytes = (full / "index.html").read_bytes()
            before_time = (full / "index.html").stat().st_mtime_ns
            result = run_restore(script, full)
            assert result.returncode == 0, result.stdout + result.stderr
            assert (full / "index.html").read_bytes() == before_bytes
            assert (full / "index.html").stat().st_mtime_ns == before_time
            checks.append("existing full-art HTML preserved byte-for-byte, " + ("with" if include_png else "without") + " source PNGs")
        full_new = root / "new-full"
        (full_new / "assets").mkdir(parents=True)
        for name in manifest["png_sha256"]:
            shutil.copyfile(ROOT / name, full_new / name)
        result = run_restore(script, full_new)
        assert result.returncode == 0, result.stdout + result.stderr
        assert sha256((full_new / "index.html").read_bytes()) == manifest["full_index_sha256"]
        checks.append("all eight original PNGs: rebuilt exact full-art HTML")
        partial = root / "partial-png"
        (partial / "assets").mkdir(parents=True)
        for name in ("assets/cat.png", "assets/snake.png", "assets/paper.png"):
            shutil.copyfile(ROOT / name, partial / name)
        png_before = {path.name: (path.read_bytes(), path.stat().st_mtime_ns)
                      for path in (partial / "assets").iterdir()}
        result = run_restore(script, partial)
        assert result.returncode == 0, result.stdout + result.stderr
        assert sha256((partial / "index.html").read_bytes()) == manifest["index_sha256"]
        assert png_before == {path.name: (path.read_bytes(), path.stat().st_mtime_ns)
                              for path in (partial / "assets").iterdir()}
        checks.append("partial PNG collection: exact SVG HTML rebuilt; every original left untouched")
        partial_full = root / "partial-with-full-html"
        (partial_full / "assets").mkdir(parents=True)
        shutil.copyfile(ROOT / "assets/snake.png", partial_full / "assets/snake.png")
        shutil.copyfile(ROOT / "index.html", partial_full / "index.html")
        html_time = (partial_full / "index.html").stat().st_mtime_ns
        result = run_restore(script, partial_full)
        assert result.returncode == 0, result.stdout + result.stderr
        assert sha256((partial_full / "index.html").read_bytes()) == manifest["full_index_sha256"]
        assert (partial_full / "index.html").stat().st_mtime_ns == html_time
        checks.append("partial PNG collection with full HTML: full HTML preserved without rewriting")
        changed_png = root / "changed-png"
        (changed_png / "assets").mkdir(parents=True)
        (changed_png / "assets/paper.png").write_bytes(b"user image edit\n")
        result = run_restore(script, changed_png)
        assert result.returncode != 0
        assert (changed_png / "assets/paper.png").read_bytes() == b"user image edit\n"
        assert not (changed_png / "dev").exists()
        assert not (changed_png / "index.html").exists()
        checks.append("changed non-protagonist PNG: refused and preserved before any source or HTML write")
        symlink = root / "symlink-svg"
        symlink.mkdir()
        (symlink / "assets").symlink_to(partial / "assets", target_is_directory=True)
        result = run_restore(script, symlink)
        assert result.returncode != 0
        assert not (symlink / "dev").exists()
        assert not (symlink / "index.html").exists()
        checks.append("symlinked PNG directory: refused before any source or HTML write")
        (svg / "index.html").write_bytes(b"user HTML edit\n")
        (svg / "dev/ui.js").unlink()
        result = run_restore(script, svg)
        assert result.returncode != 0
        assert (svg / "index.html").read_bytes() == b"user HTML edit\n"
        assert not (svg / "dev/ui.js").exists()
        checks.append("modified HTML refused and preserved; no missing source written")
        modified = root / "modified-source"
        (modified / "dev").mkdir(parents=True)
        (modified / "dev/ui.js").write_bytes(b"user source edit\n")
        result = run_restore(script, modified)
        assert result.returncode != 0
        assert (modified / "dev/ui.js").read_bytes() == b"user source edit\n"
        assert not (modified / "index.html").exists()
        checks.append("modified source refused and preserved; no HTML written")
    report = {"passed": len(checks), "failed": 0, "checks": checks,
              "script_sha256": sha256(script.read_bytes()),
              "svg_index_sha256": manifest["index_sha256"],
              "full_index_sha256": manifest["full_index_sha256"],
              "png_in_payload": False, "new_cloud_instance_tested": False,
              "draft_save_tested": False}
    (ROOT / "recovery/source-tests.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return report


def build() -> tuple[Path, dict]:
    files = collect()
    index = ROOT / "index.html"
    if not index.is_file():
        raise SystemExit("Build index.html before generating recovery artifacts.")
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            package.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    archive = buffer.getvalue()
    manifest = {
        "format": "baiyao-offline-source-recovery-v2",
        "files": {name: sha256(data) for name, data in sorted(files.items())},
        "index_sha256": sha256(index.read_bytes()),
        "archive_sha256": sha256(archive),
        "uncompressed_source_bytes": sum(map(len, files.values())),
        "archive_bytes": len(archive),
        "portrait_count": sum(name.endswith(".png") for name in files),
    }
    # Slice directly: textwrap on a multi-megabyte unbroken base64 word can
    # repeatedly copy its remainder and become quadratic in payload size.
    encoded_raw = base64.b64encode(archive).decode("ascii")
    encoded = "\n".join(encoded_raw[offset:offset + 100]
                        for offset in range(0, len(encoded_raw), 100))
    script = script_body(encoded, manifest).encode("utf-8")
    recovery = ROOT / "recovery"
    recovery.mkdir(exist_ok=True)
    output = recovery / "restore.sh"
    output.write_bytes(script)
    output.chmod(0o755)
    (recovery / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (recovery / "restore.sha256").write_text(sha256(script) + "  restore.sh\n", encoding="ascii")
    # A previous run's report must never appear to validate a newer payload.
    previous_report = recovery / "tests.json"
    if previous_report.exists():
        previous_report.unlink()
    print(json.dumps({"script": str(output), "script_bytes": len(script), **manifest}, ensure_ascii=False, indent=2))
    return output, manifest


def run_restore(script: Path, destination: Path) -> subprocess.CompletedProcess:
    environment = os.environ.copy()
    environment["BAIYAO_RESTORE_ROOT"] = str(destination)
    return subprocess.run(["sh", str(script)], env=environment, capture_output=True, text=True)


def exercise(script: Path, manifest: dict) -> dict:
    results = []
    with tempfile.TemporaryDirectory(prefix="baiyao-recovery-test-", dir="/tmp") as directory:
        destination = Path(directory) / "game"
        first = run_restore(script, destination)
        assert first.returncode == 0, first.stdout + first.stderr
        assert sha256((destination / "index.html").read_bytes()) == manifest["index_sha256"]
        for name, expected in manifest["files"].items():
            assert sha256((destination / name).read_bytes()) == expected, name
        results.append("fresh restore: every source, PNG and generated HTML SHA256 matched")

        before = {path.relative_to(destination).as_posix(): path.stat().st_mtime_ns
                  for path in destination.rglob("*") if path.is_file()}
        repeated = run_restore(script, destination)
        assert repeated.returncode == 0, repeated.stdout + repeated.stderr
        after = {path.relative_to(destination).as_posix(): path.stat().st_mtime_ns
                 for path in destination.rglob("*") if path.is_file()}
        assert before == after, "repeat restore rewrote existing files"
        assert "新增 0 个文件" in repeated.stdout
        results.append("repeat restore: success, zero files rewritten")

        source_name = next(iter(manifest["files"]))
        (destination / source_name).unlink()
        (destination / "index.html").unlink()
        missing = run_restore(script, destination)
        assert missing.returncode == 0, missing.stdout + missing.stderr
        assert sha256((destination / source_name).read_bytes()) == manifest["files"][source_name]
        assert sha256((destination / "index.html").read_bytes()) == manifest["index_sha256"]
        results.append("missing source + HTML: reconstructed with exact hashes")

        changed = destination / source_name
        changed.write_bytes(b"user modification: must be retained\n")
        (destination / "index.html").unlink()
        refused = run_restore(script, destination)
        assert refused.returncode != 0, "modified source should be rejected"
        assert changed.read_bytes() == b"user modification: must be retained\n"
        assert not (destination / "index.html").exists(), "preflight failure still wrote HTML"
        results.append("modified source: refused, preserved edit, wrote no missing HTML")

        separate = Path(directory) / "symlink-game"
        separate.mkdir()
        (separate / "assets").symlink_to(destination / "assets", target_is_directory=True)
        symlinked = run_restore(script, separate)
        assert symlinked.returncode != 0, "symlinked destinations should be rejected"
        assert not (separate / "index.html").exists()
        results.append("symlink destination: refused without writing project files")

        changed.unlink()
        repaired = run_restore(script, destination)
        assert repaired.returncode == 0, repaired.stdout + repaired.stderr
        results.append("after user removes conflicting source: restoration succeeds")

        (destination / "index.html").write_bytes(b"user HTML: retain this version\n")
        (destination / source_name).unlink()
        html_conflict = run_restore(script, destination)
        assert html_conflict.returncode != 0, "modified HTML should be rejected"
        assert (destination / "index.html").read_bytes() == b"user HTML: retain this version\n"
        assert not (destination / source_name).exists(), "HTML conflict still wrote missing source"
        results.append("modified HTML: refused, preserved edit, wrote no missing source")

    report = {"passed": len(results), "failed": 0, "checks": results,
              "index_sha256": manifest["index_sha256"],
              "script_sha256": sha256(script.read_bytes()),
              "new_cloud_instance_tested": False,
              "draft_save_tested": False}
    (ROOT / "recovery" / "tests.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--test", action="store_true", help="exercise recovery in /tmp")
    parser.add_argument("--backup", action="store_true", help="copy verified recovery artifacts outside checkout")
    parser.add_argument("--source-only", action="store_true", help="separate source/SVG package; does not contain PNG originals")
    options = parser.parse_args()
    script, manifest = build_source_only() if options.source_only else build()
    if options.test:
        if options.source_only:
            exercise_source_only(script, manifest)
        else:
            exercise(script, manifest)
    if options.backup:
        copy_backup()


if __name__ == "__main__":
    main()
