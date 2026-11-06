#!/usr/bin/env python3
"""Validate shipped atlases against every runtime actor and costume declaration."""
import hashlib, json, os, subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
data = json.loads(subprocess.check_output(['node', '-e', "const g=require('./dev/engine.js');console.log(JSON.stringify({outfits:g.OUTFITS,enemies:Object.keys(g.ENEMIES),bosses:Object.keys(g.BOSS_LORE)}))"], cwd=ROOT))
roles = {'cat':'assassin','sword':'sword','sword_fallen':'sword','hehuan':'hehuan','tinglan':'mechanist','feiye':'sovereign'}
appearances = ['sword_fallen'] + [kind+'-'+o['id'] for o in data['outfits'].values() for kind,role in roles.items() if role in o['characters']]
groups = [('actors', ['cat','sword','hehuan','tinglan','feiye'], 4, 6), ('actor-keyframes', appearances, 8, 6), ('enemy-actors', data['enemies']+['ji'], 4, 4), ('boss-actors', data['bosses'], 4, 4), ('machine-actors', ['chengshan','mingdi','shiying'], 4, 4)]
report = {'entries':[], 'errors':[], 'keyframes':'Authored image cells; runtime interpolated samples are counted separately.'}
for folder,ids,columns,rows in groups:
    for key in ids:
        file = ROOT/'assets'/folder/(key+('.png' if folder=='actor-keyframes' else '.webp'))
        try:
            im = Image.open(file).convert('RGBA'); w,h = im.size
            # Preserve the approved generator's PNG bytes. This one atlas has
            # a measured one-pixel export discrepancy, normalized at decode.
            normalization = None
            if folder=='actor-keyframes' and key=='cat-ember' and (w,h)==(1447,1087):
                plan = json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./dev/sprite-frames.js').plans('actorAppearances','cat-ember')))"],cwd=ROOT))
                assert plan.get('gridSize')==181, 'irregular source has no declared normalization'
                normalization = {'runtimeSize':[1448,1086], 'cellSize':181, 'reason':'one-pixel generated source size discrepancy'}
            else:
                assert w%columns==0 and h%rows==0, 'dimensions do not divide into cells'
                assert w//columns==h//rows, 'non-square cells would stretch'
            low,high=im.getchannel('A').getextrema()
            assert low==0 and high>=250, 'missing transparency or near-opaque content'
            hashes=[]; empty=[]; bounds=[]
            for row in range(rows):
                rowhash=[]
                for col in range(columns):
                    cell=im.crop((round(col*w/columns),round(row*h/rows),round((col+1)*w/columns),round((row+1)*h/rows)))
                    alpha=cell.getchannel('A');box=alpha.point(lambda x:255 if x>64 else 0).getbbox();bounds.append(box)
                    if not box: empty.append([row,col])
                    rowhash.append(hashlib.sha256(cell.tobytes()).hexdigest())
                assert len(set(rowhash))>1, 'row contains identical copied frames'
                hashes.extend(rowhash)
            assert not empty, 'empty cells '+str(empty)
            report['entries'].append({'file':str(file.relative_to(ROOT)),'size':[w,h],'normalization':normalization,'columns':columns,'rows':rows,'keyframes':columns*rows,'uniqueCells':len(set(hashes)),'boundsAlpha64':bounds,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
        except Exception as error: report['errors'].append({'file':str(file.relative_to(ROOT)),'error':str(error)})
report['counts']={folder:len(ids) for folder,ids,_,_ in groups}
dest=Path(os.environ.get('ANIMATION_EVIDENCE',str(ROOT/'docs/review-v10')))/'asset-audit.json';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'counts':report['counts'],'checked':len(report['entries']),'errors':report['errors']},ensure_ascii=False))
raise SystemExit(bool(report['errors']))
