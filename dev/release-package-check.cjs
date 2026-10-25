/* Exercise the actual ZIP payload reached by both public download names. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),cp=require('node:child_process'),http=require('node:http'),A=require('node:assert/strict'),{chromium}=require('playwright');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
(async()=>{
 const zip='recovery/baiyao-hehuan.zip',alias='recovery/baiyao-rebuilt.zip';A.equal(hash(zip),hash(alias),'old and new public ZIP names diverged');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'baiyao-published-'));
 cp.execFileSync('python3',['-c',`import zipfile,sys,pathlib
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 base=pathlib.Path(sys.argv[2]).resolve()
 for name in z.namelist():assert (base/name).resolve().is_relative_to(base)
 z.extractall(base)
`,zip,dir]);
 const root=path.join(dir,'baiyao-hehuan'),N=require(path.join(root,'dev/engine.js'));
 const counts=Object.fromEntries(['assassin','sword','hehuan'].map(role=>[role,Object.values(N.CARDS).filter(c=>c.character===role&&!c.storyOnly).length]));A.deepEqual(counts,{assassin:36,sword:36,hehuan:36});
 for(const f of ['index.html','dev/ui.js','dev/engine.js','dev/hehuan.js','dev/release.json'])A.equal(hash(path.join(root,f)),hash(f));
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':file.endsWith('.webp')?'image/webp':'text/html;charset=utf-8'}).end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;const errors=[];try{browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');await page.waitForFunction(()=>window.game);A.match(await page.locator('.topbar .tag').innerText(),/2026\.10\.25-r36\.2/);await page.locator('[data-action="new-journey"]').click();const shown={};for(const role of ['sword','hehuan']){await page.locator('[data-action="character"][data-character="'+role+'"]').click();await page.locator('[data-action="catalogue"]').click();await page.locator('[data-action="catalogue-filter"][data-filter="'+role+'"]').click();shown[role]=await page.locator('.catalogue .card').count();A.equal(shown[role],36);await page.keyboard.press('Escape');}await page.locator('.role-card[data-character="hehuan"] .portrait img').evaluate(im=>im.decode());A.deepEqual(errors,[]);const report={passed:true,method:'CRC verified both byte-identical public ZIP aliases; extracted one actual payload into an isolated temporary directory and launched its HTML in Chromium; clicked both catalogue filters.',counts,shown,version:await page.evaluate(()=>NightRelease.id),zipHashes:{[zip]:hash(zip),[alias]:hash(alias)},sourceHashes:Object.fromEntries(['index.html','dev/ui.js','dev/engine.js','dev/hehuan.js','dev/release.json'].map(f=>[f,hash(f)])),errors};fs.writeFileSync('dev/release-package-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
