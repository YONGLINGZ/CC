"""Package the already built review release; excludes browser screenshots and old releases."""
from pathlib import Path
import hashlib,json,re,zipfile
root=Path(__file__).resolve().parents[1]
out=root.parent/'deliverables';out.mkdir(exist_ok=True)
data=json.loads(re.search(r'globalThis.NightAssets=(.*?);\n',(root/'index.html').read_text()).group(1))
def assets(v):
 if isinstance(v,dict):
  for x in v.values():yield from assets(x)
 elif isinstance(v,list):
  for x in v:yield from assets(x)
 elif isinstance(v,str) and v.startswith('assets/'):yield v
names=set(assets(data))|{'index.html','README.md','GAME_README.md','TESTING.md','docs/review-v1/CHANGELOG_ZH.md','docs/review-v1/verification.json','docs/review-v1/text-evidence.zip'}
for p in (root/'dev').iterdir():
 if p.suffix in {'.js','.cjs','.py','.html'} or p.name=='release.json':names.add(str(p.relative_to(root)))
for name in names:
 if not (root/name).is_file():raise RuntimeError('Missing '+name)
f=out/'baiyao-review-v1.zip'
with zipfile.ZipFile(f,'w',zipfile.ZIP_DEFLATED,6) as z:
 for n in sorted(names):z.write(root/n,'baiyao-review-v1/'+n)
with zipfile.ZipFile(f) as z:
 assert z.testzip() is None
 assert z.read('baiyao-review-v1/index.html')==(root/'index.html').read_bytes()
manifest={'version':'2026.10.31-review.1','file':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'entries':len(names),'runtime_assets':len(set(assets(data))),'crc_check':'passed','directory_html_byte_equal':True}
(out/'DELIVERY_MANIFEST.json').write_text(json.dumps(manifest,indent=2))
(out/'CHANGELOG_ZH.md').write_bytes((root/'docs/review-v1/CHANGELOG_ZH.md').read_bytes())
print(json.dumps(manifest))
