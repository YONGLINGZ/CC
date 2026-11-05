"""Export the shipped 4x4 atlases as 256px PNG cells; requires Pillow.
Usage: python3 dev/extract-encounter-frames.py /path/to/output
This only crops existing pixels; it does not synthesize intermediate frames.
"""
from pathlib import Path
import sys
from PIL import Image
root = Path(__file__).resolve().parents[1]
out = Path(sys.argv[1]).resolve() if len(sys.argv) == 2 else None
if out is None:
    raise SystemExit('Usage: python3 dev/extract-encounter-frames.py OUTPUT_DIRECTORY')
for group in ('enemy-actors', 'machine-actors', 'boss-actors'):
    for atlas in sorted((root / 'assets' / group).glob('*.webp')):
        with Image.open(atlas) as img:
            assert img.size == (1024, 1024), atlas
            target = out / group / atlas.stem
            target.mkdir(parents=True, exist_ok=True)
            for row in range(4):
                for col in range(4):
                    img.crop((col*256, row*256, (col+1)*256, (row+1)*256)).save(target / f'row-{row}-frame-{col}.png')
print('Exported 80 atlases as 1280 PNG cells; boss unused recovery rows are included.')
