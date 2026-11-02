"""Overlay verified local changes onto the previously delivered directory package."""
from pathlib import Path
import hashlib,json,zipfile,subprocess,tempfile,re
root=Path(__file__).resolve().parents[1];out=root.parent/'deliverables';base='d36665842f7caf523da0067f49e54b20067672fb';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
names=set(subprocess.check_output(['git','diff','--name-only',base],cwd=root,text=True).splitlines())
names.update(subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=root,text=True).splitlines())
names.discard('baiyao-standalone.html')
names={n for n in names if (root/n).is_file()};names.add('index.html')
assert not any(n.endswith('.png') for n in names)
asset_data=json.loads(re.search(r'globalThis.NightAssets=(.*?);\n',(root/'index.html').read_text()).group(1))
def assets(v):
 if isinstance(v,dict):
  for x in v.values():yield from assets(x)
 elif isinstance(v,list):
  for x in v:yield from assets(x)
 elif isinstance(v,str) and v.startswith('assets/'):yield v
required=set(assets(asset_data))
manifest={'version':'2026.11.02-review.2','base_commit':base,'required_existing_assets':{n:sha(root/n) for n in sorted(required)},'updated_files':{n:sha(root/n) for n in sorted(names)}}
blob=json.dumps(manifest,ensure_ascii=False,indent=2).encode()
file=out/'baiyao-review-v2-update.zip'
with zipfile.ZipFile(file,'w',zipfile.ZIP_DEFLATED,6) as z:
 for n in sorted(names):z.write(root/n,'baiyao-review-v1/'+n)
 z.writestr('baiyao-review-v1/UPDATE_MANIFEST.json',blob)
assert file.stat().st_size<20_000_000
with tempfile.TemporaryDirectory(dir='/tmp') as d:
 with zipfile.ZipFile(out/'baiyao-review-v1.zip') as b:b.extractall(d)
 with zipfile.ZipFile(file) as z:
  assert z.testzip() is None;z.extractall(d)
 target=Path(d)/'baiyao-review-v1'
 for n,h in {**manifest['required_existing_assets'],**manifest['updated_files']}.items():assert sha(target/n)==h,n
receipt={'file':file.name,'bytes':file.stat().st_size,'sha256':sha(file),'updated_files':len(names),'unchanged_runtime_assets':len(required),'base_plus_update_extraction_verified':True,'index_sha256':sha(root/'index.html'),'inline_sha256':sha(root/'baiyao-standalone.html')}
(out/'review-v2-delivery.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt,indent=2))
