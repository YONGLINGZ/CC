from pathlib import Path
import json,zipfile,hashlib,subprocess
root=Path(__file__).resolve().parents[1];out=Path('/workspace/deliverables');out.mkdir(exist_ok=True)
files=['index.html','LIVE2D_STATUS.md','README.md','TESTING.md','UPDATE_README_ZH.md','dev/ui.js','dev/shell.html','dev/release.json','dev/visual-review-browser.cjs','dev/visual-review-edge.cjs','dev/hehuan-browser.test.cjs','dev/package-review-v3.py']+[str(p.relative_to(root)) for p in (root/'docs/review-v3').rglob('*') if p.is_file()]
hash=lambda b:hashlib.sha256(b).hexdigest()
manifest={'version':'2026.11.03-review.3','base':'df7754996e98a9ae28a0facb63ff8055e5e923f6','files':{f:hash((root/f).read_bytes()) for f in files},'required_assets':{str(p.relative_to(root)):hash(p.read_bytes()) for p in (root/'assets').rglob('*') if p.is_file()}}
zpath=out/'baiyao-review-v3-update.zip'
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED) as z:
 for f in files:z.write(root/f,'baiyao-review-v1/'+f)
 z.writestr('baiyao-review-v1/UPDATE_V3_MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2))
# Verify actual overlay on the previously delivered complete package and v2 update.
import tempfile
with tempfile.TemporaryDirectory(dir='/workspace') as d:
 for z in [out/'baiyao-review-v1.zip',out/'baiyao-review-v2-update.zip',zpath]:
  with zipfile.ZipFile(z) as archive:archive.extractall(d)
 merged=Path(d)/'baiyao-review-v1'
 for f,expected in (manifest['files']|manifest['required_assets']).items():assert hash((merged/f).read_bytes())==expected,f
result={'file':str(zpath),'bytes':zpath.stat().st_size,'sha256':hash(zpath.read_bytes()),'updated_files':len(files),'verified_assets':len(manifest['required_assets']),'overlay_verified':True}
(out/'review-v3-delivery.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
