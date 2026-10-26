#!/usr/bin/env python3
"""Export reviewed image_gen originals by cropping/resizing/encoding only.

No drawing, background replacement, or generative editing happens in this script.
The PNG sources remain in generated_images. Run with --source-root to relocate them.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source-root', type=Path, default=Path('/workspace/generated_images'))
args = parser.parse_args()
SOURCE = args.source_root
ORIGINALS = {
    'normal': 'exec-510e664f-93fe-4b13-9338-d68931e7b7d9.png',
    'wounded': 'exec-f33b5ead-6d63-473f-b069-5994c28ab1b4.png',
    'critical': 'exec-9ca8dba7-bde6-491d-8a6c-8c4b7b328032.png',
    'chengshan': 'exec-07d32dc6-cdfd-417d-affb-5299ba53a828.png',
    'mingdi': 'exec-8b2a6d92-5d2a-4a22-8478-019707dd1110.png',
    'shiying': 'exec-b018dcbb-1fc4-4ab0-bf70-bda52527dd83.png',
    'cards01': 'exec-2f6b3529-7cc5-466b-8e24-87f8a9f74fc4.png',
    'cards13': 'exec-4c41f6d6-0fa1-4646-8113-8b1b48c68587.png',
    'cards25': 'exec-05f59017-20e5-40a4-a4b0-ab60281fa1ed.png',
    'cards37': 'exec-d6031e63-d908-439d-bfc9-d06dc04d6aad.png',
    'bridge': 'exec-f0e4dbfe-5be2-4c8c-a8b1-57a6c34d35ed.png',
    'seal': 'exec-673eb5c5-8f35-4f79-941f-dd3d1971ed26.png',
    'record': 'exec-a651f073-8ffc-48db-8da4-333bddf9ed18.png',
    'objects': 'exec-266fa34a-3402-4678-92c9-fb68cad06411.png',
}
MACHINE_CROPS = {
    # Reviewed panel bounds include complete wing/finger silhouettes and exclude
    # the small feather/hand tip belonging to an adjacent contact-sheet state.
    'chengshan': [(10,0,734,724),(734,0,1458,724),(1458,0,2182,724)],
    'mingdi': [(34,0,786,752),(790,0,1542,752),(1520,0,2272,752)],
    'shiying': [(0,0,724,724),(724,0,1448,724),(1448,0,2172,724)],
}
entries = []

def export(key, relative, *, crop=None, size=None, quality=82, category=None):
    source = SOURCE / ORIGINALS[key]
    image = Image.open(source)
    if crop:
        image = image.crop(tuple(crop))
    if size:
        image = image.resize(tuple(size), Image.Resampling.LANCZOS)
    dest = ROOT / relative
    dest.parent.mkdir(parents=True, exist_ok=True)
    # Keep the previous valid image visible while Pillow performs WebP encoding.
    temporary = dest.with_name(dest.name + '.exporting')
    image.save(temporary, 'WEBP', quality=quality, method=6, exact=True)
    temporary.replace(dest)
    data = dest.read_bytes()
    entries.append({
        'file': relative, 'source': ORIGINALS[key], 'crop': list(crop) if crop else None,
        'width': image.width, 'height': image.height, 'alpha': image.mode == 'RGBA',
        'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'category': category,
    })
    return image

for state in ('normal', 'wounded', 'critical'):
    export(state, f'assets/puppet/tinglan-{state}.webp', size=(768,1152), quality=84, category='hero-state')

# Portrait is a deliberate upper-body crop of the approved normal artwork.
export('normal', 'assets/portraits/tinglan-avatar.webp', crop=(150,0,900,1000), size=(480,640), quality=84, category='hero-avatar')

for machine in ('chengshan', 'mingdi', 'shiying'):
    image = Image.open(SOURCE / ORIGINALS[machine])
    for col, state in enumerate(('normal', 'worn', 'broken')):
        crop = MACHINE_CROPS[machine][col]
        export(machine, f'assets/machines/{machine}-{state}.webp', crop=crop, size=(576,576), category='machine-state')
    export(machine, f'assets/machines/{machine}-icon.webp', crop=MACHINE_CROPS[machine][0], size=(192,192), category='machine-avatar')

for start in (1,13,25,37):
    key = f'cards{start:02}'
    image = Image.open(SOURCE / ORIGINALS[key])
    for offset in range(12):
        row, col = divmod(offset,4)
        # Exclude the contact-sheet dividers, preserving each independent image.
        crop=(image.width*col//4+3,image.height*row//3+3,image.width*(col+1)//4-3,image.height*(row+1)//3-3)
        export(key, f'assets/cards/J{start+offset:02}.webp', crop=crop, size=(420,420), quality=80, category='card')

for event in ('bridge','seal','record'):
    export(event, f'assets/events/tinglan_{event}.webp', size=(900,600), quality=83, category='personal-event')

objects=Image.open(SOURCE/ORIGINALS['objects'])
export('objects','assets/relics/concentric_spool.webp',crop=(0,0,objects.width//2-5,objects.height),size=(480,480),category='relic')
export('objects','assets/items/mech_case.webp',crop=(objects.width//2+5,0,objects.width,objects.height),size=(480,480),category='case')

assert len(entries) == 69, len(entries)
assert len({e['file'] for e in entries}) == 69
assert all((ROOT / e['file']).exists() for e in entries)

# Compatibility portrait alias; excluded from the specified 69 unique deliverables.
alias = ROOT/'assets/portraits/tinglan.webp'
alias.write_bytes((ROOT/'assets/portraits/tinglan-avatar.webp').read_bytes())

manifest={
    'character':'mechanist','name':'陆听澜','age':27,'tool':'image_gen.imagegen',
    'method':'14 approved generated originals: reference-consistent state edits plus 48 independently storyboarded illustrations on four contact sheets; crop/resize/WebP encoding only.',
    'review':'Inspected all character and machine states composited on neutral gray, four card sheets and three full event compositions. Verified clean alpha borders; no backdrop rectangles. Scenes retain natural human/environment scale.',
    'formalExports':69,'runtimeAlias':'assets/portraits/tinglan.webp',
    'totalBytes':sum(e['bytes'] for e in entries),'entries':entries,
    'sources':{key:{'file':value,'sha256':hashlib.sha256((SOURCE/value).read_bytes()).hexdigest()} for key,value in ORIGINALS.items()},
}
(ROOT/'dev/mechanist-art-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Review plate is documentation, never a runtime requirement.
thumbs=[]
for entry in entries:
    image=Image.open(ROOT/entry['file']).convert('RGBA')
    image.thumbnail((144,150),Image.Resampling.LANCZOS)
    tile=Image.new('RGBA',(160,178),(40,54,58,255))
    tile.alpha_composite(image,((160-image.width)//2,4))
    draw=ImageDraw.Draw(tile)
    draw.text((5,158),Path(entry['file']).stem,fill=(237,221,180,255))
    thumbs.append(tile.convert('RGB'))
plate=Image.new('RGB',(1600,178*((len(thumbs)+9)//10)),(25,37,41))
for i,tile in enumerate(thumbs):plate.paste(tile,((i%10)*160,(i//10)*178))
out=ROOT/'docs/previews/tinglan-art.webp';out.parent.mkdir(parents=True,exist_ok=True)
plate.save(out,'WEBP',quality=85,method=6)
print(json.dumps({'exports':69,'bytes':manifest['totalBytes'],'MiB':round(manifest['totalBytes']/1024/1024,3),'manifest':'dev/mechanist-art-manifest.json'},ensure_ascii=False))
