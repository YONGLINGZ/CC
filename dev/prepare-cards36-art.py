"""Crop selected generated contact sheets and encode runtime WebP; no repainting."""
from pathlib import Path
from PIL import Image
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[1]
generated=Path('/workspace/generated_images')
sources={
 'normal':'exec-08720f1b-694d-4c01-a2b7-67dc49b08042.png',
 'wounded':'exec-ad56ba40-31bf-4e60-b5f1-506b363ce537.png',
 'critical':'exec-f4aeb81d-ab4e-4388-aa5d-14a3d7797ff2.png',
 'events':'exec-babcb4c4-57b0-4aa3-bdc5-d1bc97e70ba1.png',
 'sword1':'exec-0ef4785b-ad9d-4490-8c9f-a416c18af7e1.png',
 'sword2':'exec-1ce73492-899f-42e9-860c-5ade8b420a31.png',
 'hehuan1':'exec-3e14cc47-a8c9-4399-9bc8-d54204fee273.png',
 'hehuan2':'exec-df02b6e3-e4c6-42a1-96fd-37faa307089b.png',
 'hehuan3':'exec-b16af832-a733-4215-a9fb-7b8d8e614ee4.png'
}
entries=[]
def record(file,image,source,crop=None):
 p=root/file;image.save(p,'WEBP',quality=89,method=6)
 item={'file':file,'width':image.width,'height':image.height,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'source_png':sources[source],'alpha':image.mode=='RGBA'}
 if crop:item['sourceCrop']=list(crop)
 entries.append(item)
for state in ['normal','wounded','critical']:
 im=Image.open(generated/sources[state]);record('assets/puppet/hehuan-'+state+'.webp',im,'normal' if state=='normal' else state)
im=Image.open(generated/sources['normal']);box=(260,0,860,800);record('assets/portraits/hehuan.webp',im.crop(box),'normal',box)
def sheet(key,cols,rows,files):
 im=Image.open(generated/sources[key]);assert len(files)==cols*rows
 for i,file in enumerate(files):
  x,y=i%cols,i//cols;box=(round(x*im.width/cols),round(y*im.height/rows),round((x+1)*im.width/cols),round((y+1)*im.height/rows))
  tile=im.crop(box)
  if file.startswith('assets/cards/'):tile=tile.resize((420,420),Image.Resampling.LANCZOS)
  record(file,tile,key,box)
for k,start in [('hehuan1',1),('hehuan2',13),('hehuan3',25)]:sheet(k,3,4,[f'assets/cards/H{i:02d}.webp' for i in range(start,start+12)])
sheet('sword1',3,4,[f'assets/cards/S{i:02d}.webp' for i in range(17,29)])
sheet('sword2',2,4,[f'assets/cards/S{i:02d}.webp' for i in range(29,37)])
sheet('events',1,3,['assets/events/hehuan_'+id+'.webp' for id in ['checkpoint','qinheng','ledger']])
relic=root/'assets/relics/heartmirror.webp';im=Image.open(relic)
heart={'file':str(relic.relative_to(root)),'width':im.width,'height':im.height,'bytes':relic.stat().st_size,'sha256':hashlib.sha256(relic.read_bytes()).hexdigest(),'alpha':im.mode=='RGBA','unchanged':True}
manifest={'character':'hehuan','name':'晏绮罗','age':28,'tool':'image_gen.imagegen','scope':'Pink veiled redesign: three states and cropped portrait, 36 distinct selected card panels, three narrative panels. 20 new sword-card panels separately recorded. Images generated first; only regular-grid cropping and format encoding.','entries':[e for e in entries if not '/S' in e['file']]+[heart]}
(root/'dev/hehuan-art-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(root/'dev/cards36-art-manifest.json').write_text(json.dumps({'method':'Generated original sheets; cropping and encoding only','entries':entries},ensure_ascii=False,indent=2)+'\n')
(root/'dev/hehuan-card-art-manifest.json').write_text(json.dumps({'method':'Three independently painted 12-panel sheets; distinct selected panels; no recoloring of old cards','entries':[e for e in entries if '/H' in e['file']]},ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(root/'recovery/cards36-art-originals.zip','w',zipfile.ZIP_DEFLATED) as z:
 for key,file in sources.items():z.write(generated/file,key+'.png')
 with z.open('sources.json','w') as out:out.write(json.dumps(sources,ensure_ascii=False,indent=2).encode())
print(json.dumps({'hehuan_runtime':len(manifest['entries']),'changed_runtime':len(entries),'originals':len(sources),'runtime_bytes':sum(e['bytes'] for e in entries)},ensure_ascii=False))
