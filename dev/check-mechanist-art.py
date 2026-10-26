#!/usr/bin/env python3
"""Verify the real exported mechanist images, not just a hard-coded asset count."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'dev/mechanist-art-manifest.json').read_text())
entries=manifest['entries']
assert len(entries)==69
assert len({e['file'] for e in entries})==69
assert sum(e['bytes'] for e in entries)<6*1024*1024
cards=[e for e in entries if e['category']=='card']
assert len(cards)==48
assert len({e['sha256'] for e in cards})==48
checked=[]
for e in entries:
    path=root/e['file']
    data=path.read_bytes()
    assert hashlib.sha256(data).hexdigest()==e['sha256'],path
    im=Image.open(path)
    im.load()
    assert im.format=='WEBP',path
    assert list(im.size)==[e['width'],e['height']],path
    if e['category'] in ('hero-state','machine-state','machine-avatar'):
        assert im.mode=='RGBA',path
        a=im.getchannel('A')
        histogram=a.histogram()
        assert sum(histogram[:16])>im.width*im.height*.05,('opaque background',path)
        assert sum(histogram[220:])>im.width*im.height*.05,('missing subject',path)
        corners=[a.getpixel(xy) for xy in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)]]
        assert max(corners)<24,('opaque corner',path,corners)
    checked.append(e['file'])
assert (root/'assets/portraits/tinglan.webp').read_bytes()==(root/'assets/portraits/tinglan-avatar.webp').read_bytes()
report={'passed':True,'decodedImages':len(checked),'uniqueCardImages':48,'formalBytes':sum(e['bytes'] for e in entries),'checked':checked,'limitations':'Metadata/alpha/decode checks and reviewed contact sheet; visual quality remains a human judgement.'}
(root/'dev/mechanist-art-check-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='checked'},ensure_ascii=False))
