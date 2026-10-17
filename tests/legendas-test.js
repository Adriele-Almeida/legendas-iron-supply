// Teste headless: node tests/legendas-v2-test.js <url> [prefixo-screenshots]
const p=require('/workspace/pptr/node_modules/puppeteer-core');
const U=process.argv[2]||'http://localhost:41635/'; const SHOT=process.argv[3]||'';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
 let fails=0; const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m); if(!c)fails++;};
 for(const vp of [{name:'mobile',width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true},{name:'desktop',width:1366,height:900}]){
  console.log('=== '+vp.name);
  const ctx=await b.createBrowserContext();
  const origin=new URL(U).origin;
  await ctx.overridePermissions(origin,['clipboard-read','clipboard-write','clipboard-sanitized-write']);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>{console.log('PAGEERROR',e.message);fails++;});
  await pg.setViewport(vp);
  const resp=await pg.goto(U,{waitUntil:'networkidle0'}); ok(resp.status()===200,'status 200 ('+pg.url()+')');
  const data=await pg.evaluate(()=>window.PRODUTOS);
  const cards=await pg.$$eval('.card',c=>c.map(x=>({n:x.dataset.nome,t:x.dataset.tipo,badge:x.querySelector('.badge').textContent,href:x.querySelector('a.drive').href,imgs:x.querySelectorAll('img').length,pre:x.querySelector('.legenda').textContent})));
  ok(cards.length===20,'20 cards ('+cards.length+')');
  const exp=data.filter(d=>d.tipo==='Story').concat(data.filter(d=>d.tipo!=='Story'));
  ok(cards.every((c,i)=>c.n===exp[i].name),'ordem: stories primeiro, depois posts, ordem original dentro do grupo');
  ok(cards.every((c,i)=>c.badge===exp[i].tipo && c.badge===(/story/i.test(exp[i].image.name)?'Story':'Post')),'badges batem com nome do arquivo');
  console.log('     stories:',cards.filter(c=>c.t==='Story').map(c=>c.n).join(', '));
  ok(cards.every((c,i)=>c.href===`https://drive.google.com/file/d/${exp[i].image.id}/view`),'links do Drive corretos');
  ok(cards.every(c=>c.imgs<=1),'uma imagem por card');
  ok(cards.every((c,i)=>c.pre===exp[i].caption),'legenda exibida = texto original');
  const html=await pg.content(); ok(!/Outras vers/i.test(html),'sem "Outras versões"');
  ok(await pg.$$eval('.acao.copiar svg.i-copiar rect',x=>x.length)===20 && await pg.$$eval('.acao.drive svg path[fill="#ffba00"]',x=>x.length)===20,'ícones SVG copiar/Drive presentes');
  // filtros
  const vis=()=>pg.$$eval('.card',c=>c.filter(x=>!x.hidden).map(x=>x.dataset.tipo));
  await pg.click('.chip[data-filtro="Post"]'); let v=await vis(); ok(v.length===17&&v.every(t=>t==='Post'),'Só post -> '+v.length);
  await pg.click('.chip[data-filtro="Story"]'); v=await vis(); ok(v.length===3&&v.every(t=>t==='Story'),'Só story -> '+v.length);
  await pg.click('.chip[data-filtro="Story"]'); v=await vis(); ok(v.length===20,'clicar de novo mostra tudo -> '+v.length);
  await pg.type('#busca','tiger'); v=await vis(); ok(v.length===2,'busca "tiger" -> '+v.length);
  await pg.click('.chip[data-filtro="Story"]'); v=await vis(); ok(v.length===0 && !(await pg.$eval('#vazio',e=>e.hidden)),'busca+filtro combinados -> 0 + mensagem');
  await pg.click('.chip[data-filtro="Story"]'); await pg.click('#busca',{clickCount:3}); await pg.keyboard.press('Backspace');
  ok((await vis()).length===20,'limpou busca/filtro');
  // copiar
  const btns=await pg.$$('.copiar'); await btns[3].click(); await sleep(250);
  const lbl=await pg.evaluate(e=>e.querySelector('.rot').textContent+'|'+e.className,btns[3]);
  const clip=await pg.evaluate(()=>navigator.clipboard.readText());
  ok(lbl.startsWith('Copiado!')&&lbl.includes('ok')&&clip===exp[3].caption,'copiar -> "Copiado!" e clipboard = legenda ('+exp[3].name+')');
  // grade: zoom
  const cols=()=>pg.$eval('#lista',e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
  const st=()=>pg.evaluate(()=>({mais:document.getElementById('zoomMais').disabled,menos:document.getElementById('zoomMenos').disabled,modo:document.getElementById('lista').className,nivel:document.getElementById('lista').dataset.nivel}));
  const c0=await cols(); console.log('     colunas iniciais:',c0);
  for(let i=0;i<8;i++){ if(!(await st()).mais) await pg.click('#zoomMais'); }
  const cmax=await cols(); const s1=await st(); ok(cmax===(vp.width<720?4:6)&&s1.mais&&!s1.menos,'grade "+" até o máximo ('+cmax+' col, + desativado)');
  // card ocupa a largura toda?
  const fill=await pg.evaluate(()=>{const l=document.getElementById('lista');const cs=[...l.children].filter(c=>!c.hidden);const r=l.getBoundingClientRect();const last=cs[Number(l.dataset.nivel)-1].getBoundingClientRect();return Math.round(r.right-last.right);});
  ok(fill<=20,'imagens preenchem a largura (sobra '+fill+'px = padding)');
  if(SHOT) await pg.screenshot({path:SHOT+'-'+vp.name+'-grade-max.png'});
  for(let i=0;i<8;i++){ if(!(await st()).menos) await pg.click('#zoomMenos'); }
  const s2=await st(); ok((await cols())===1&&s2.menos&&!s2.mais,'grade "−" até 1 coluna (− desativado)');
  await pg.click('#zoomMais'); await pg.click('#zoomMais'); ok((await cols())===3,'grade nível 3');
  // lista
  await pg.click('[data-modo="lista"]');
  const tw=()=>pg.$eval('.card .thumb',e=>Math.round(e.getBoundingClientRect().width));
  const s3=await st(); ok(s3.modo.includes('modo-lista')&&(await cols())===1,'modo lista ativo (nível '+s3.nivel+', img '+(await tw())+'px)');
  const w0=await tw(); await pg.click('#zoomMais'); const w1=await tw(); ok(w1>w0,'lista "+" aumenta imagem '+w0+'->'+w1);
  for(let i=0;i<8;i++){ if(!(await st()).menos) await pg.click('#zoomMenos'); }
  const wmin=await tw(); const s4=await st(); ok(s4.menos&&!s4.mais&&wmin<w0,'lista "−" até o mínimo ('+wmin+'px, − desativado)');
  await pg.click('#zoomMais'); 
  // copiar/drive no modo lista
  const lb=await pg.$$('.copiar'); await lb[0].click(); await sleep(200);
  ok((await pg.evaluate(()=>navigator.clipboard.readText()))===exp[0].caption,'copiar funciona no modo lista');
  // persistência: recarregar
  await pg.reload({waitUntil:'networkidle0'});
  const s5=await st(); ok(s5.modo.includes('modo-lista')&&s5.nivel==='1','após reload: lista nível 1 mantido');
  await pg.click('[data-modo="grade"]'); ok((await cols())===3 && (await st()).nivel==='3','volta p/ grade mantém nível 3 próprio');
  const ls=await pg.evaluate(()=>JSON.stringify({m:localStorage['legendas.modo'],g:localStorage['legendas.zoom.grade'],l:localStorage['legendas.zoom.lista']}));
  console.log('     localStorage',ls);
  // screenshots padrão: grade com nível padrão
  await pg.evaluate(()=>localStorage.clear()); await pg.reload({waitUntil:'networkidle0'});
  for(let y=0;y<4000;y+=600){await pg.evaluate(y=>scrollTo(0,y),y);await sleep(150);} await pg.evaluate(()=>scrollTo(0,0)); await sleep(2500);
  ok(await pg.$$eval('.thumb[data-falhou]',x=>x.length)===0,'nenhuma prévia falhou (das carregadas: '+await pg.$$eval('.thumb[data-carregou]',x=>x.length)+')');
  if(SHOT){ await pg.screenshot({path:SHOT+'-'+vp.name+'.png'});
    await pg.click('[data-modo="lista"]'); await sleep(1500); await pg.screenshot({path:SHOT+'-'+vp.name+'-lista.png'}); await pg.evaluate(()=>localStorage.clear()); }
  await ctx.close();
 }
 // fallback sem navigator.clipboard
 const ctx=await b.createBrowserContext(); const pg2=await ctx.newPage();
 await pg2.evaluateOnNewDocument(()=>{Object.defineProperty(navigator,'clipboard',{value:undefined});});
 await pg2.goto(U,{waitUntil:'domcontentloaded'});
 const fb=await pg2.evaluate(async()=>{const b=document.querySelectorAll('.copiar')[0];b.click();await new Promise(r=>setTimeout(r,100));return b.querySelector('.rot').textContent;});
 ok(fb==='Copiado!','fallback sem navigator.clipboard -> '+fb);
 console.log(fails?('FALHAS: '+fails):'TUDO OK');
 await b.close();
})();
