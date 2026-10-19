"""Compatibility entry point; the v3 canonical builder is dev/build.cjs."""
from pathlib import Path
import subprocess
import sys

if __name__ == '__main__':
    root = Path(__file__).resolve().parent.parent
    raise SystemExit(subprocess.call(['node', str(root / 'dev/build.cjs'), *sys.argv[1:]], cwd=root))
