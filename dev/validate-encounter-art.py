"""Validate atlas dimensions, alpha gutters and unique frame cells. Requires Pillow."""
from pathlib import Path
from PIL import Image
import hashlib,json,sys
root=Path(__file__).resolve().parents[1];rows=[]
for folder in ['enemy-actors','machine-actors','boss-actors']:
 for p in sorted((root/'assets'/folder).glob('*.webp')):
  im=Image.open(p).convert('RGBA');assert im.size==(1024,1024),p
  cells=[]
  for y in range(4):
   hashes=[]
   for x in range(4):
    cell=im.crop((x*256,y*256,(x+1)*256,(y+1)*256));a=cell.getchannel('A');box=a.point(lambda v:255 if v>64 else 0).getbbox();assert box and box[0]>=15 and box[1]>=15 and box[2]<=241 and box[3]<=241,(p,x,y,box)
    digest=hashlib.sha256(cell.tobytes()).hexdigest();hashes.append(digest);cells.append({'row':y,'column':x,'opaqueBounds':box,'pixelSha256':digest})
   assert len(set(hashes))==4,(p,y,'duplicate frames')
  rows.append({'file':str(p.relative_to(root)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'frames':cells})
assert len(rows)==80,len(rows)
report={'atlases':len(rows),'cells':sum(len(r['frames']) for r in rows),'bytes':sum(r['bytes'] for r in rows),'files':rows}
out=Path(sys.argv[1]) if len(sys.argv)>1 else root/'docs/review-v8/atlas-validation.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2));print('PASS',report['atlases'],'atlases',report['cells'],'unique cells',report['bytes'],'bytes')
