(function () {
  'use strict';
  var produtos = window.PRODUTOS || [];
  var lista = document.getElementById('lista');
  var aviso = document.getElementById('aviso');
  var avisoTimer;

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function mostrarAviso(msg, erro) {
    aviso.textContent = msg;
    aviso.style.background = erro ? '#c0392b' : '';
    aviso.classList.add('on');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { aviso.classList.remove('on'); }, 1800);
  }

  // Fallback para navegadores sem navigator.clipboard (ou fora de HTTPS)
  function copiarFallback(texto) {
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
    document.body.appendChild(ta);
    var sel = document.getSelection();
    var anterior = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, texto.length); // iOS
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (anterior && sel) { sel.removeAllRanges(); sel.addRange(anterior); }
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

  produtos.forEach(function (p, i) {
    var img = p.images && p.images[0];
    var thumb = el('div', { class: 'thumb' }, [el('span', { class: 'num', text: (i + 1) + '/' + produtos.length })]);
    if (img) {
      var im = el('img', { src: img.thumb, alt: p.name, loading: 'lazy', referrerpolicy: 'no-referrer' });
      im.addEventListener('error', function () {
        im.remove();
        thumb.appendChild(placeholder(p.name, 'Prévia indisponível — use “Abrir imagem no Drive”'));
        thumb.dataset.falhou = '1';
      });
      im.addEventListener('load', function () { thumb.dataset.carregou = '1'; });
      thumb.appendChild(im);
    } else {
      thumb.appendChild(placeholder(p.name, 'Imagem não encontrada no Drive'));
    }

    var texto = p.caption || '';
    var pre = el('pre', { class: 'legenda', text: texto || '(legenda não encontrada)' });

    var btnCopiar = el('button', { class: 'btn copiar', type: 'button', text: 'Copiar legenda' });
    if (!texto) btnCopiar.disabled = true;
    var t;
    btnCopiar.addEventListener('click', function () {
      copiar(texto).then(function (ok) {
        clearTimeout(t);
        btnCopiar.classList.remove('ok', 'erro');
        if (ok) {
          btnCopiar.textContent = 'Copiado!';
          btnCopiar.classList.add('ok');
          mostrarAviso('Legenda copiada: ' + p.name);
        } else {
          btnCopiar.textContent = 'Selecione e copie';
          btnCopiar.classList.add('erro');
          selecionarTexto(pre);
          mostrarAviso('Não deu para copiar automaticamente. O texto foi selecionado.', true);
        }
        t = setTimeout(function () { btnCopiar.textContent = 'Copiar legenda'; btnCopiar.classList.remove('ok', 'erro'); }, 2000);
      });
    });

    var btnDrive = el('a', { class: 'btn drive', target: '_blank', rel: 'noopener noreferrer', text: 'Abrir imagem no Drive' });
    if (img) btnDrive.href = img.view; else btnDrive.setAttribute('aria-disabled', 'true');

    var outras = null;
    if (p.images && p.images.length > 1) {
      outras = el('div', { class: 'outras' }, [document.createTextNode('Outras versões: ')]);
      p.images.slice(1).forEach(function (o, j) {
        if (j) outras.appendChild(document.createTextNode(' · '));
        outras.appendChild(el('a', { href: o.view, target: '_blank', rel: 'noopener noreferrer', text: o.name.replace(/^.* - /, '').replace(/\.[^.]+$/, '') }));
      });
    }

    var card = el('article', { class: 'card', 'data-nome': p.name.toLowerCase() }, [
      thumb,
      el('div', { class: 'corpo' }, [el('h2', { text: p.name }), pre, outras, el('div', { class: 'botoes' }, [btnCopiar, btnDrive])])
    ]);
    lista.appendChild(card);
  });

  var semAcento = function (s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
  document.getElementById('busca').addEventListener('input', function (e) {
    var q = semAcento(e.target.value.trim()), vis = 0;
    Array.prototype.forEach.call(lista.children, function (c) {
      var m = semAcento(c.getAttribute('data-nome')).indexOf(q) !== -1;
      c.hidden = !m; if (m) vis++;
    });
    document.getElementById('vazio').hidden = vis > 0;
  });
})();
