(function () {
  'use strict';

  // Stories primeiro, depois posts; dentro de cada grupo, a ordem original.
  var base = window.PRODUTOS || [];
  var produtos = base.filter(function (p) { return p.tipo === 'Story'; })
    .concat(base.filter(function (p) { return p.tipo !== 'Story'; }));

  var lista = document.getElementById('lista');
  var aviso = document.getElementById('aviso');
  var contagem = document.getElementById('contagem');
  var vazio = document.getElementById('vazio');
  var btnMais = document.getElementById('zoomMais');
  var btnMenos = document.getElementById('zoomMenos');
  var avisoTimer;


  var ICONE_COPIAR = '<svg class="i-copiar" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M15 9V5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15H9"/></svg>' +
    '<svg class="i-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ICONE_DRIVE = '<svg viewBox="0 0 87.3 78" aria-hidden="true">' +
    '<path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>' +
    '<path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>' +
    '<path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>' +
    '<path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>' +
    '<path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>' +
    '<path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/></svg>';

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function mostrarAviso(msg, erro) {
    aviso.textContent = msg;
    aviso.classList.toggle('erro', !!erro);
    aviso.classList.add('on');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { aviso.classList.remove('on'); }, 1800);
  }

  // ---------- Copiar (com fallback para navegadores sem navigator.clipboard) ----------
  function copiarFallback(texto) {
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, texto.length); // iOS
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function copiar(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto).then(function () { return true; },
        function () { return copiarFallback(texto); });
    }
    return Promise.resolve(copiarFallback(texto));
  }
  function selecionarTexto(node) {
    var r = document.createRange(); r.selectNodeContents(node);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  function placeholder(nome, msg) {
    return el('div', { class: 'ph' }, [el('strong', { text: nome }), el('small', { text: msg })]);
  }

  // ---------- Cards ----------
  produtos.forEach(function (p) {
    var img = p.image;
    var tipo = p.tipo || 'Post';
    var thumb = el('div', { class: 'thumb' }, [
      el('span', { class: 'badge ' + tipo.toLowerCase(), text: tipo })
    ]);
    if (img) {
      var im = el('img', { src: img.thumb, alt: p.name + ' (' + tipo + ')', loading: 'lazy', referrerpolicy: 'no-referrer' });
      im.addEventListener('error', function () {
        im.remove();
        thumb.appendChild(placeholder(p.name, 'Prévia indisponível — use o botão do Drive'));
        thumb.dataset.falhou = '1';
      });
      im.addEventListener('load', function () { thumb.dataset.carregou = '1'; });
      thumb.appendChild(im);
    } else {
      thumb.appendChild(placeholder(p.name, 'Imagem não encontrada no Drive'));
    }

    var texto = p.caption || '';
    var pre = el('pre', { class: 'legenda', text: texto || '(legenda não encontrada)' });

    var rotCopiar = el('span', { class: 'rot', text: 'Copiar legenda' });
    var btnCopiar = el('button', { class: 'acao copiar', type: 'button', title: 'Copiar legenda', 'aria-label': 'Copiar legenda de ' + p.name });
    btnCopiar.innerHTML = ICONE_COPIAR;
    btnCopiar.appendChild(rotCopiar);
    if (!texto) btnCopiar.disabled = true;
    var t;
    btnCopiar.addEventListener('click', function () {
      copiar(texto).then(function (ok) {
        clearTimeout(t);
        btnCopiar.classList.remove('ok', 'erro');
        if (ok) {
          rotCopiar.textContent = 'Copiado!';
          btnCopiar.classList.add('ok');
          mostrarAviso('Copiado! ' + p.name);
        } else {
          rotCopiar.textContent = 'Selecione e copie';
          btnCopiar.classList.add('erro');
          selecionarTexto(pre);
          mostrarAviso('Não deu para copiar automaticamente. O texto foi selecionado.', true);
        }
        t = setTimeout(function () { rotCopiar.textContent = 'Copiar legenda'; btnCopiar.classList.remove('ok', 'erro'); }, 2000);
      });
    });

    var btnDrive = el('a', { class: 'acao drive', target: '_blank', rel: 'noopener noreferrer', title: 'Abrir no Google Drive', 'aria-label': 'Abrir imagem de ' + p.name + ' no Google Drive' });
    btnDrive.innerHTML = ICONE_DRIVE;
    btnDrive.appendChild(el('span', { class: 'rot', text: 'Abrir no Drive' }));
    if (img) btnDrive.href = img.view; else btnDrive.setAttribute('aria-disabled', 'true');

    var card = el('article', { class: 'card', 'data-nome': p.name, 'data-tipo': tipo }, [
      thumb,
      el('div', { class: 'corpo' }, [el('h2', { text: p.name }), pre, el('div', { class: 'acoes' }, [btnCopiar, btnDrive])])
    ]);
    lista.appendChild(card);
  });

  // ---------- Busca + filtro ----------
  var filtro = null;
  var semAcento = function (s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
  var busca = document.getElementById('busca');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-filtro]'));

  function aplicarFiltros() {
    var q = semAcento(busca.value.trim()), vis = 0;
    Array.prototype.forEach.call(lista.children, function (c) {
      var m = semAcento(c.getAttribute('data-nome')).indexOf(q) !== -1 && (!filtro || c.getAttribute('data-tipo') === filtro);
      c.hidden = !m; if (m) vis++;
    });
    vazio.hidden = vis > 0;
    contagem.textContent = vis + (vis === 1 ? ' item' : ' itens') + (filtro ? ' · só ' + filtro.toLowerCase() : '');
  }
  chips.forEach(function (ch) {
    ch.addEventListener('click', function () {
      var f = ch.getAttribute('data-filtro');
      filtro = filtro === f ? null : f; // clicar no ativo de novo mostra tudo
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-filtro') === filtro)); });
      aplicarFiltros();
    });
  });
  busca.addEventListener('input', aplicarFiltros);

  // ---------- Modo lista/grade + zoom (salvos no localStorage) ----------
  var TAMANHOS_LISTA = [64, 88, 120, 160, 210, 280]; // largura da imagem no modo lista (px)
  var MIN_COLS = 1;
  function maxCols() { return window.innerWidth < 720 ? 4 : 6; }
  function colsPadrao() { var w = window.innerWidth; return w < 720 ? 1 : w < 1080 ? 2 : 3; }

  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravar(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }

  var estado = {
    modo: ler('legendas.modo') === 'lista' ? 'lista' : 'grade',
    grade: parseInt(ler('legendas.zoom.grade'), 10) || colsPadrao(),
    lista: (function () { var v = parseInt(ler('legendas.zoom.lista'), 10); return isNaN(v) ? 2 : v; })()
  };

  function render() {
    estado.grade = Math.max(MIN_COLS, Math.min(maxCols(), estado.grade));
    estado.lista = Math.max(0, Math.min(TAMANHOS_LISTA.length - 1, estado.lista));
    var grade = estado.modo === 'grade';
    lista.classList.toggle('modo-grade', grade);
    lista.classList.toggle('modo-lista', !grade);
    lista.style.setProperty('--cols', estado.grade);
    lista.style.setProperty('--thumb', TAMANHOS_LISTA[estado.lista] + 'px');
    lista.setAttribute('data-nivel', grade ? estado.grade : estado.lista);
    document.querySelectorAll('[data-modo]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-modo') === estado.modo));
    });
    if (grade) {
      // Grade: "+" adiciona coluna, "−" remove coluna
      btnMais.disabled = estado.grade >= maxCols();
      btnMenos.disabled = estado.grade <= MIN_COLS;
      btnMais.title = 'Mais colunas'; btnMais.setAttribute('aria-label', 'Mais colunas');
      btnMenos.title = 'Menos colunas'; btnMenos.setAttribute('aria-label', 'Menos colunas');
    } else {
      // Lista: "+" aumenta o item, "−" diminui
      btnMais.disabled = estado.lista >= TAMANHOS_LISTA.length - 1;
      btnMenos.disabled = estado.lista <= 0;
      btnMais.title = 'Itens maiores'; btnMais.setAttribute('aria-label', 'Itens maiores');
      btnMenos.title = 'Itens menores'; btnMenos.setAttribute('aria-label', 'Itens menores');
    }
  }
  function salvar() {
    gravar('legendas.modo', estado.modo);
    gravar('legendas.zoom.grade', estado.grade);
    gravar('legendas.zoom.lista', estado.lista);
  }
  document.querySelectorAll('[data-modo]').forEach(function (b) {
    b.addEventListener('click', function () { estado.modo = b.getAttribute('data-modo'); render(); salvar(); });
  });
  function zoom(delta) {
    if (estado.modo === 'grade') estado.grade += delta; else estado.lista += delta;
    render(); salvar();
  }
  btnMais.addEventListener('click', function () { zoom(1); });
  btnMenos.addEventListener('click', function () { zoom(-1); });
  window.addEventListener('resize', render);

  render();
  aplicarFiltros();
})();
