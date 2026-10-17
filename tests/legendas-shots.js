const p=require('/workspace/pptr/node_modules/puppeteer-core');const D='/workspace/app-legendas-iron';const U='http://localhost:41635/';
(async()=>{
 const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 const pg=await b.newPage();
 await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await pg.goto(U,{waitUntil:'networkidle0'});await new Promise(r=>setTimeout(r,2000));
 console.log('heights',JSON.stringify(await pg.$$eval('.thumb',t=>t.slice(0,4).map(x=>Math.round(x.getBoundingClientRect().height)))));
 await pg.screenshot({path:D+'/preview-mobile.png'});
 await pg.setViewport({width:1366,height:900});await pg.reload({waitUntil:'networkidle0'});await new Promise(r=>setTimeout(r,2500));
 await pg.screenshot({path:D+'/preview-desktop.png'});
 // placeholder test: break thumbnail URLs
 const p3=await b.newPage();
 await p3.setRequestInterception(true);
 p3.on('request',r=>r.url().includes('/thumbnail')?r.abort():r.continue());
 await p3.goto(U,{waitUntil:'networkidle0'});await new Promise(r=>setTimeout(r,1500));
 console.log('placeholders',await p3.$$eval('.ph',x=>x.length),await p3.$eval('.ph strong',x=>x.textContent),'drive btn',await p3.$eval('a.drive',a=>a.href));
 await b.close();})();
