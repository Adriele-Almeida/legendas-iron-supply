const p=require('/workspace/pptr/node_modules/puppeteer-core');
const D='/workspace/app-legendas-iron';
(async()=>{
 const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 const ctx=b.defaultBrowserContext();
 await ctx.overridePermissions('http://localhost:41635',['clipboard-read','clipboard-write','clipboard-sanitized-write']);
 const pg=await b.newPage();
 pg.on('pageerror',e=>console.log('PAGEERROR',e.message));
 const thumbStatus={};
 pg.on('response',r=>{if(r.url().includes('drive.google.com/thumbnail'))thumbStatus[r.url()]=r.status()+' '+(r.headers()['content-type']||'')});
 await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await pg.goto('http://localhost:41635/',{waitUntil:'networkidle0'});
 console.log('cards',await pg.$$eval('.card',c=>c.length));
 // scroll to trigger lazy loads
 for(let y=0;y<30000;y+=700){await pg.evaluate(y=>scrollTo(0,y),y);await new Promise(r=>setTimeout(r,250));}
 await new Promise(r=>setTimeout(r,4000));
 console.log('natural',JSON.stringify(await pg.$$eval('.thumb img',i=>i.map(x=>x.naturalWidth+'x'+x.naturalHeight).slice(0,5))));console.log('loaded',await pg.$$eval('.thumb[data-carregou]',c=>c.length),'failed',await pg.$$eval('.thumb[data-falhou]',c=>c.length));
 console.log('thumb responses',JSON.stringify(Object.values(thumbStatus).reduce((a,s)=>(a[s]=(a[s]||0)+1,a),{})));
 const data=await pg.evaluate(()=>window.PRODUTOS);
 const links=await pg.$$eval('.card a.drive',a=>a.map(x=>[x.href,x.target,x.rel]));
 let bad=0; links.forEach((l,i)=>{ if(l[0]!==`https://drive.google.com/file/d/${data[i].images[0].id}/view`||l[1]!=='_blank')bad++; if(!/^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/view$/.test(l[0]))bad++;});
 console.log('drive links',links.length,'bad',bad);
 const pres=await pg.$$eval('.legenda',p=>p.map(x=>x.textContent));
 console.log('pre==caption',pres.every((t,i)=>t===data[i].caption));
 // copy test (clipboard API)
 let okc=0;
 for(const i of [0,9,19]){
  await pg.evaluate(()=>scrollTo(0,0));
  const btn=(await pg.$$('.copiar'))[i]; await btn.click();
  await new Promise(r=>setTimeout(r,200));
  const label=await pg.evaluate(e=>e.textContent,btn);
  const clip=await pg.evaluate(()=>navigator.clipboard.readText());
  console.log('copy',i,label,clip===data[i].caption, 'lines',clip.split('\n').length,'emoji',/📲/.test(clip));
  if(label==='Copiado!'&&clip===data[i].caption)okc++;
 }
 // fallback test: remove navigator.clipboard
 const pg2=await b.newPage();
 await pg2.evaluateOnNewDocument(()=>{Object.defineProperty(navigator,'clipboard',{value:undefined});});
 await pg2.goto('http://localhost:41635/',{waitUntil:'domcontentloaded'});
 const fb=await pg2.evaluate(async()=>{const b=document.querySelectorAll('.copiar')[4];b.click();await new Promise(r=>setTimeout(r,100));return [String(navigator.clipboard),b.textContent];});
 console.log('fallback',fb);
 await pg.bringToFront(); const clip2=await pg.evaluate(()=>navigator.clipboard.readText());
 console.log('fallback clipboard matches',clip2===data[4].caption);
 // screenshots
 await pg.evaluate(()=>scrollTo(0,0)); await new Promise(r=>setTimeout(r,2300));
 await pg.screenshot({path:D+'/preview-mobile.png'});
 await pg.setViewport({width:1366,height:900});
 await pg.reload({waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,3000));
 await pg.screenshot({path:D+'/preview-desktop.png'});
 await b.close();
})();
