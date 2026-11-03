from pathlib import Path
import json,zipfile,hashlib,subprocess,tempfile,ast
root=Path(__file__).resolve().parents[1];out=Path('/workspace/deliverables');out.mkdir(exist_ok=True)
# Ship every build input, so the update can also rebuild correctly over the first full package.
tree=ast.parse((root/'dev/persist.py').read_text());sources=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SOURCE_NAMES' for t in n.targets))
files=sorted(set(['index.html','README.md','TESTING.md','UPDATE_README_ZH.md','LIVE2D_STATUS.md','dev/persist.py','dev/prologue.test.cjs','dev/prologue-browser.cjs','dev/prologue-edge.cjs','dev/hehuan-browser.test.cjs','dev/mechanist-browser.test.cjs','dev/package-review-v4.py',*sources]+[str(p.relative_to(root)) for p in (root/'docs/review-v4').rglob('*') if p.is_file()]))
hash=lambda b:hashlib.sha256(b).hexdigest()
with zipfile.ZipFile(out/'baiyao-review-v2-update.zip') as old:previous=json.loads(old.read(next(n for n in old.namelist() if n.endswith('UPDATE_MANIFEST.json'))))
assets={f:hash((root/f).read_bytes()) for f in previous['required_existing_assets']};assert assets==previous['required_existing_assets']
manifest={'version':'2026.11.03-review.4','files':{f:hash((root/f).read_bytes()) for f in files},'required_assets':assets}
zpath=out/'baiyao-review-v4-update.zip'
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED) as z:
 for f in files:z.write(root/f,'baiyao-review-v1/'+f)
 z.writestr('baiyao-review-v1/UPDATE_V4_MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2))
with tempfile.TemporaryDirectory(dir='/workspace') as d:
 for z in [out/'baiyao-review-v1.zip',zpath]:
  with zipfile.ZipFile(z) as archive:archive.extractall(d)
 merged=Path(d)/'baiyao-review-v1'
 for f,expected in (manifest['files']|assets).items():assert hash((merged/f).read_bytes())==expected,f
 subprocess.run(['node','dev/build.cjs','--strict','--output','rebuilt-test.html'],cwd=merged,check=True,capture_output=True)
 assert hash((merged/'rebuilt-test.html').read_bytes())==manifest['files']['index.html'],'Rebuild differs from delivered entry'
result={'file':str(zpath),'bytes':zpath.stat().st_size,'sha256':hash(zpath.read_bytes()),'updated_files':len(files),'verified_assets':len(assets),'original_full_package_overlay_verified':True,'rebuild_byte_identical':True}
(out/'review-v4-delivery.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
