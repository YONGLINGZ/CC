#!/usr/bin/env python3
"""Package current verified P2 artifacts without treating old release receipts as current."""
from pathlib import Path
import json,re,zipfile,hashlib,subprocess
root=Path(__file__).resolve().parents[1]
if __name__ == '__main__':
 import sys
 raise SystemExit(subprocess.call([sys.executable,str(root/'dev/package-hehuan.py')],cwd=root))
subprocess.run(['node','dev/p2-verify.cjs'],cwd=root,check=True,stdout=subprocess.DEVNULL)
html=(root/'index.html').read_text()
assets=json.loads(re.search(r'globalThis.NightAssets=(.*?);\n',html).group(1))
def paths(x):
 if isinstance(x,dict):
  for v in x.values():yield from paths(v)
 elif isinstance(x,list):
  for v in x:yield from paths(v)
 elif isinstance(x,str) and x.startswith('assets/'):yield x
names=set(paths(assets))
names.update(f for f in ['index.html','README.md','GAME_README.md','TESTING.md','PERSISTENCE.md','LIVE2D_STATUS.md'] if (root/f).is_file())
for folder in ['dev','docs']:
 for p in (root/folder).rglob('*'):
  if p.is_file() and p.suffix in ['.js','.cjs','.py','.html','.md','.json','.webp']:names.add(str(p.relative_to(root)))
names.update(['recovery/events-md-export.zip','recovery/p2-review.html'])
output=root/'recovery/baiyao-rebuilt.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for name in sorted(names):
  info=zipfile.ZipInfo('baiyao-rebuilt/'+name,date_time=(2026,10,24,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,(root/name).read_bytes())
with zipfile.ZipFile(output) as z:
 assert z.testzip() is None
 assert z.read('baiyao-rebuilt/index.html')==(root/'index.html').read_bytes()
receipt={'version':'P2 event rework, batches1–3 and automated4','zip':{'file':str(output.relative_to(root)),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()},'files':len(names),'runtime_art':len(set(paths(assets))),'verification':'dev/p2-verification-results.json','humanUnderstandingAccepted':False,'physicalPhoneTested':False,'directFileBrowserVerified':False}
(root/'recovery/p2-delivery.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');print(json.dumps(receipt,ensure_ascii=False))
