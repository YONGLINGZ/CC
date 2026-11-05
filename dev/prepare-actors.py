#!/usr/bin/env python3
"""Encode supplied generated sheets; only cell extraction/format conversion, no generated tweening.
Usage: python dev/prepare-actors.py SOURCE_DIR [OUTPUT_DIR]
SOURCE_DIR contains cat.png, sword.png, hehuan.png, tinglan.png, feiye.png.
Requires Pillow. Original image generation is not reproducible from a random seed.
"""
from PIL import Image
from pathlib import Path
import sys,json,hashlib
source=Path(sys.argv[1]);out=Path(sys.argv[2]) if len(sys.argv)>2 else Path(__file__).resolve().parent.parent/'assets/actors';out.mkdir(parents=True,exist_ok=True)
audit={}
for role in ['cat','sword','hehuan','tinglan','feiye']:
    file=source/(role+'.png');im=Image.open(file).convert('RGBA');assert im.size==(1024,1536)
    im.save(out/(role+'.webp'),'WEBP',quality=86,method=4)
    im.crop((0,0,256,256)).save(out/(role+'-fullbody.webp'),'WEBP',quality=94,method=4)
    boxes=[]
    for row in range(6):
        for col in range(4):
            alpha=im.crop((col*256,row*256,(col+1)*256,(row+1)*256)).getchannel('A')
            box=alpha.point(lambda v:255 if v>64 else 0).getbbox()
            assert box and box[0]>0 and box[1]>0 and box[2]<256 and box[3]<256,(role,row,col,box)
            boxes.append(box)
    audit[role]={'sourceSHA256':hashlib.sha256(file.read_bytes()).hexdigest(),'atlasSHA256':hashlib.sha256((out/(role+'.webp')).read_bytes()).hexdigest(),'frames':24,'boundsAtAlpha64':boxes}
(out/'encoding-audit.json').write_text(json.dumps(audit,indent=2))
