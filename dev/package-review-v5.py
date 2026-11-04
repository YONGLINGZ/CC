"""Full offline folder + current sources; disjoint standard ZIPs under 20 MB."""
from pathlib import Path
import zipfile,hashlib,json,tempfile,subprocess,copy
root=Path(__file__).resolve().parents[1];out=Path('/workspace/deliverables');out.mkdir(exist_ok=True)
hash=lambda b:hashlib.sha256(b).hexdigest()
# All runtime art, including original source sheets. No browser screenshots.
files=set(str(p.relative_to(root)) for p in (root/'assets').rglob('*') if p.is_file())
files.update(str(p.relative_to(root)) for p in (root/'dev').rglob('*') if p.is_file() and p.suffix in {'.js','.cjs','.html','.py','.json','.md'})
files.update(str(p.relative_to(root)) for p in root.glob('*.md'))
files.update(str(p.relative_to(root)) for p in (root/'docs/review-v5').rglob('*') if p.is_file() and p.suffix in {'.md','.json','.csv','.log'})
files.update(str(p.relative_to(root)) for p in (root/'docs').rglob('*') if p.is_file() and p.suffix in {'.md','.json','.csv','.mp3'})
files.add('index.html')
manifest={'version':json.loads((root/'dev/release.json').read_text())['id'],'base':'08a6e9932777896deead59b482c4b43d26d2b757','files':{f:hash((root/f).read_bytes()) for f in sorted(files)}}
full=out/'baiyao-review-v5-full.zip'
with zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted(files):z.write(root/f,'baiyao-review-v5/'+f)
 z.writestr('baiyao-review-v5/DELIVERY_MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2))
parts=[]
with zipfile.ZipFile(full) as src:
 # Program/source first. Art follows in independent packs, no file duplicated.
 ordered=sorted(src.infolist(),key=lambda i:('/assets/' in i.filename,i.filename))
 groups=[[]];size=0
 for i in ordered:
  cost=i.compress_size+len(i.filename.encode())*2+200
  assert cost<19_900_000,i.filename
  if size+cost>19_900_000:groups.append([]);size=0
  groups[-1].append(i);size+=cost
 merged={}
 with tempfile.TemporaryDirectory(dir='/workspace') as temp:
  for n,items in enumerate(groups,1):
   p=out/f'baiyao-review-v5-part{n:02d}.zip'
   with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as dst:
    for i in items:dst.writestr(copy.copy(i),src.read(i))
   assert p.stat().st_size<20_000_000
   with zipfile.ZipFile(p) as part:
    assert part.testzip() is None
    for name in part.namelist():
     assert name not in merged;merged[name]=hash(part.read(name))
    part.extractall(temp)
   parts.append({'file':str(p),'bytes':p.stat().st_size,'sha256':hash(p.read_bytes()),'files':len(items)})
  original={i.filename:hash(src.read(i)) for i in src.infolist()}
  assert merged==original
  actual={str(p.relative_to(temp)):hash(p.read_bytes()) for p in Path(temp).rglob('*') if p.is_file()}
  assert actual==original
  dest=Path(temp)/'baiyao-review-v5'
  subprocess.run(['node','dev/build.cjs','--strict','--output','rebuilt.html'],cwd=dest,check=True,capture_output=True)
  assert hash((dest/'rebuilt.html').read_bytes())==manifest['files']['index.html']
result={'version':manifest['version'],'verified_equal_files':len(merged),'duplicate_files':0,'rebuild_byte_identical':True,'full_sha256':hash(full.read_bytes()),'parts':parts}
(out/'review-v5-delivery.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False,indent=2))
