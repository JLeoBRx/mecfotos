/* ==========================================================================
   Mecatrônica 2025 — interações
   JavaScript puro, sem dependências. As mídias vêm de media/manifest.js
   (gerado por tools/build.mjs). Abra com ?demo para ver o layout com
   imagens abstratas de demonstração.
   ========================================================================== */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, '0');
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
  const hasIO = 'IntersectionObserver' in window;

  const mq = (query) => window.matchMedia(query);
  const onChange = (list, fn) => (list.addEventListener ? list.addEventListener('change', fn) : list.addListener(fn));
  const mqReduced = mq('(prefers-reduced-motion: reduce)');
  const mqFine = mq('(hover: hover) and (pointer: fine)');
  const mqDesktop = mq('(min-width: 768px)');
  const motion = { reduced: mqReduced.matches };

  const store = {
    get(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* sem armazenamento local */ } },
  };

  const formatTime = (seconds) => {
    const s = Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
    return `${Math.floor(s / 60)}:${pad(s % 60)}`;
  };
  const formatCount = (n) => n.toLocaleString('pt-BR');

  function jumpTo(y) {
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    root.style.scrollBehavior = '';
  }

  /* ------------------------------------------------- bloqueios de página */

  // Rolagem travada enquanto houver introdução, menu ou visualizador aberto.
  const Lock = (() => {
    const reasons = new Set();
    const apply = () => root.classList.toggle('is-locked', reasons.size > 0);
    return {
      add(reason) { reasons.add(reason); apply(); },
      remove(reason) { reasons.delete(reason); apply(); },
    };
  })();

  // Conteúdo de fundo inacessível (teclado/leitor de tela) enquanto um diálogo está aberto.
  const Inert = (() => {
    const reasons = new Set();
    const targets = () => ['#nav', '#conteudo', '#musica', '.skip'].map((sel) => $(sel)).filter(Boolean);
    const apply = () => targets().forEach((el) => {
      if (reasons.size) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
    return {
      add(reason) { reasons.add(reason); apply(); },
      remove(reason) { reasons.delete(reason); apply(); },
    };
  })();

  // O botão "voltar" do celular fecha o visualizador em vez de sair do site.
  const Back = (() => {
    let closeFn = null;
    let pushed = false;
    let skip = 0;
    window.addEventListener('popstate', () => {
      if (skip) { skip -= 1; return; }
      if (closeFn) {
        const fn = closeFn;
        closeFn = null;
        pushed = false;
        fn(true);
      }
    });
    return {
      push(fn) {
        closeFn = fn;
        try { history.pushState({ mecOverlay: true }, ''); pushed = true; } catch (e) { pushed = false; }
      },
      release() {
        closeFn = null;
        if (!pushed) return;
        pushed = false;
        skip += 1;
        history.back();
      },
    };
  })();

  /* ----------------------------------------------------------- mídias */

  function safeDecode(str) {
    try { return decodeURIComponent(str); } catch (e) { return str; }
  }

  function normalize(raw) {
    const demo = !!raw.demo;
    const photos = (Array.isArray(raw.photos) ? raw.photos : [])
      .filter((p) => p && p.src)
      .map((p, index) => {
        const w = Number(p.w) || 1500;
        const h = Number(p.h) || 1000;
        const variants = Array.isArray(p.v) && p.g
          ? p.v.map((width) => ({ w: width, src: p.g.replace('{w}', width) })).sort((a, b) => a.w - b.w)
          : [];
        return { index, src: p.src, w, h, ratio: w / h, color: p.color || '', variants, name: safeDecode(p.src) };
      });
    const videos = (Array.isArray(raw.videos) ? raw.videos : [])
      .filter((v) => v && (v.src || demo))
      .map((v, index) => ({
        index,
        src: v.src || '',
        poster: v.poster || '',
        ratio: v.w && v.h ? v.w / v.h : 16 / 9,
        duration: Number(v.duration) || 0,
        title: v.title || '',
      }));
    const music = (Array.isArray(raw.music) ? raw.music : [])
      .filter((t) => t && t.src)
      .map((t) => ({ src: t.src, title: t.title || 'Faixa', artist: t.artist || '', duration: Number(t.duration) || 0 }));
    const config = raw.config && typeof raw.config === 'object' ? raw.config : {};
    return { photos, videos, music, config, demo };
  }

  // Imagens abstratas para pré-visualizar o layout (?demo). Não são fotos reais.
  function demoMedia() {
    let seed = 2025;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const shapes = [[3, 2], [2, 3], [4, 3], [3, 4], [16, 9], [1, 1], [4, 5], [3, 2], [2, 3]];
    const tones = [['#4a0f1e', '#0d0b0c'], ['#2c2627', '#090808'], ['#6b2a3a', '#120a0c'], ['#22252c', '#09090b'], ['#4d3c34', '#0e0c0b'], ['#7a4452', '#160d10']];
    const art = (w, h, i) => {
      const [a, b] = tones[i % tones.length];
      const cx = Math.round(20 + rand() * 60);
      const cy = Math.round(20 + rand() * 60);
      const lx = Math.round(15 + rand() * 70);
      const ly = Math.round(15 + rand() * 70);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">`
        + `<defs><radialGradient id="g" cx="${cx}%" cy="${cy}%" r="85%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`
        + `<radialGradient id="l" cx="${lx}%" cy="${ly}%" r="35%"><stop offset="0" stop-color="#e3a1ad" stop-opacity=".22"/><stop offset="1" stop-color="#e3a1ad" stop-opacity="0"/></radialGradient></defs>`
        + `<rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#l)"/>`
        + `<text x="50%" y="50%" fill="#f3eeea" fill-opacity=".3" font-family="Georgia,serif" font-style="italic" font-size="${Math.round(Math.min(w, h) / 9)}" text-anchor="middle" dominant-baseline="middle">${pad(i + 1)}</text></svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    };
    const photos = Array.from({ length: 60 }, (_, i) => {
      const [rw, rh] = shapes[Math.floor(rand() * shapes.length)];
      const w = rw * 300;
      const h = rh * 300;
      return { src: art(w, h, i), w, h, color: tones[i % tones.length][1] };
    });
    const videos = Array.from({ length: 7 }, (_, i) => {
      const portrait = i % 3 !== 0;
      const w = portrait ? 1080 : 1920;
      const h = portrait ? 1920 : 1080;
      return { src: '', poster: art(w / 4, h / 4, i + 7), w, h, duration: Math.round(8 + rand() * 80) };
    });
    return { photos, videos, music: [], config: {}, demo: true };
  }

  const Photo = {
    srcset: (p) => p.variants.map((v) => `${v.src} ${v.w}w`).join(', '),
    best(p, width) {
      if (!p.variants.length) return p.src;
      const hit = p.variants.find((v) => v.w >= width);
      return (hit || p.variants[p.variants.length - 1]).src;
    },
    small: (p) => (p.variants.length ? p.variants[0].src : p.src),
    // Preenche um <img> com srcset/sizes e volta para o original se a versão otimizada falhar.
    apply(img, p, sizes, onReady) {
      img.width = p.w;
      img.height = p.h;
      img.draggable = false;
      img.addEventListener('error', () => {
        if (p.variants.length && !img.dataset.fallback) {
          img.dataset.fallback = '1';
          img.removeAttribute('srcset');
          img.removeAttribute('sizes');
          img.src = p.src;
        } else {
          img.classList.add('is-broken');
        }
      });
      if (p.variants.length) {
        img.sizes = sizes;
        img.srcset = Photo.srcset(p);
        img.src = Photo.best(p, 1280);
      } else {
        img.src = p.src;
      }
      whenLoaded(img, onReady);
    },
  };

  function whenLoaded(img, cb) {
    const done = () => {
      img.classList.add('is-loaded');
      if (cb) cb();
    };
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener('load', done, { once: true });
  }

  // Escolhe as fotos de destaque. media/config.json pode definir cada uma pelo nome do arquivo.
  function pickFeatured(photos, config) {
    const find = (name) => {
      if (!name) return null;
      const needle = String(name).toLowerCase();
      return photos.find((p) => {
        const file = p.name.toLowerCase();
        return file.endsWith(`/${needle}`) || file === needle;
      }) || null;
    };
    const landscape = (p) => p.ratio >= 1.2;
    const used = new Set();
    const take = (p) => { if (p) used.add(p.index); return p || null; };
    const free = (list, pred) => list.find((p) => !used.has(p.index) && (!pred || pred(p)));

    const cover = take(find(config.capa)
      || photos.find((p) => /(capa|cover|turma)[^/]*$/i.test(p.name) && landscape(p))
      || photos.find(landscape)
      || photos[0]);
    const opening = photos.length >= 3
      ? take(find(config.abertura) || free(photos.slice(Math.floor(photos.length * 0.1)), landscape) || free(photos, landscape) || free(photos))
      : null;
    const reversed = photos.slice().reverse();
    const closing = photos.length >= 4
      ? take(find(config.final) || free(reversed, landscape) || free(reversed))
      : null;

    let memories = (Array.isArray(config.destaques) ? config.destaques : []).map(find).filter(Boolean);
    if (!memories.length) {
      let pool = photos.filter((p) => !used.has(p.index));
      if (!pool.length) pool = photos.filter((p) => p !== cover);
      const count = Math.min(5, pool.length);
      for (let k = 0; k < count; k += 1) memories.push(pool[Math.floor(((k + 0.5) * pool.length) / count)]);
    }
    memories = memories.slice(0, 5);
    return { cover, opening, closing, memories };
  }

  /* --------------------------------------------------------- revelação */

  const Reveal = (() => {
    const callbacks = new WeakMap();
    const io = hasIO
      ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          entry.target.classList.add('is-in');
          const cb = callbacks.get(entry.target);
          if (cb) { callbacks.delete(entry.target); cb(); }
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 })
      : null;
    return {
      observe(node, cb) {
        if (cb) callbacks.set(node, cb);
        if (io) { io.observe(node); return; }
        node.classList.add('is-in');
        if (cb) cb();
      },
    };
  })();

  function splitWords(node) {
    const words = node.textContent.trim().split(/\s+/);
    node.textContent = '';
    words.forEach((word, i) => {
      const span = doc.createElement('span');
      span.className = 'w';
      span.style.setProperty('--i', i);
      span.textContent = word;
      node.appendChild(span);
      if (i < words.length - 1) node.appendChild(doc.createTextNode(' '));
    });
  }

  /* ---------------------------------------------------------- parallax */

  const Parallax = (() => {
    const items = [];
    let queued = false;
    const io = hasIO
      ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const item = items.find((it) => it.box === entry.target);
          if (item) item.active = entry.isIntersecting;
        });
        schedule();
      }, { rootMargin: '20% 0px' })
      : null;

    function update() {
      queued = false;
      const vh = window.innerHeight;
      const factor = mqDesktop.matches ? 1 : 0.6;
      items.forEach((it) => {
        if (!it.active) return;
        if (motion.reduced) { it.el.style.transform = ''; return; }
        const r = it.box.getBoundingClientRect();
        const progress = (r.top + r.height / 2 - vh / 2) / (vh + r.height);
        it.el.style.transform = `translate3d(0, ${(-progress * it.speed * factor * 100).toFixed(2)}%, 0)`;
      });
    }
    function schedule() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }
    return {
      add(el) {
        const box = el.closest('.hero__media, .plate__frame') || el.parentElement;
        const item = { el, box, speed: parseFloat(el.dataset.parallax) || 0.1, active: !io };
        items.push(item);
        if (io) io.observe(box);
      },
      update,
      schedule,
    };
  })();

  /* -------------------------------------------------------- navegação */

  const Nav = (() => {
    const nav = $('#nav');
    const toggle = $('#nav-toggle');
    const label = $('.nav__toggle-label', toggle);
    const links = $$('.nav__link[data-section]');
    let lastY = 0;

    function isOpen() { return nav.classList.contains('is-open'); }
    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      nav.classList.remove('is-hidden');
      toggle.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Fechar' : 'Menu';
      if (open) Lock.add('menu'); else Lock.remove('menu');
    }
    toggle.addEventListener('click', () => setOpen(!isOpen()));
    nav.addEventListener('click', (e) => {
      if (e.target.closest('.nav__link') && isOpen()) setOpen(false);
    });
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) { setOpen(false); toggle.focus(); }
    });
    onChange(mqDesktop, () => { if (isOpen()) setOpen(false); });

    function setActive(id) {
      links.forEach((a) => {
        const on = a.dataset.section === id;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
    if (hasIO) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      links.forEach((a) => {
        const section = doc.getElementById(a.dataset.section);
        if (section) io.observe(section);
      });
    }

    return {
      onScroll(y) {
        nav.classList.toggle('is-scrolled', y > 40);
        const delta = y - lastY;
        if (Math.abs(delta) < 8 && y > 40) return;
        if (!isOpen()) {
          if (delta > 0 && y > window.innerHeight * 0.7) nav.classList.add('is-hidden');
          else nav.classList.remove('is-hidden');
        }
        lastY = y;
      },
      hide(section) {
        const link = $(`.nav__link[data-section="${section}"]`);
        if (link) link.closest('li').hidden = true;
      },
      reset() { nav.classList.remove('is-hidden', 'is-scrolled'); lastY = 0; },
    };
  })();

  /* ------------------------------------------------------- introdução */

  const Intro = (() => {
    const node = $('#intro');
    const enterBtn = $('#enter');
    const soundBtn = $('#intro-sound');
    const img = $('#intro-img');
    const STEPS = [['s-glow', 500], ['s-bg', 800], ['s-title', 1600], ['s-year', 2600], ['s-phrase', 3400], ['s-cta', 4400]];
    const STEPS_REDUCED = [['s-glow', 0], ['s-bg', 0], ['s-title', 150], ['s-year', 350], ['s-phrase', 550], ['s-cta', 750]];
    const ALL = STEPS.map((s) => s[0]);
    let timers = [];
    let phase = 'idle';
    let soundOn = store.get('mec:som') !== 'off';

    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const resetClasses = () => node.classList.remove(...ALL, 'is-leaving', 'is-skip');

    function renderSound() {
      soundBtn.setAttribute('aria-pressed', String(soundOn));
      $('.intro__sound-label', soundBtn).textContent = soundOn ? 'Som ligado' : 'Som desligado';
    }

    function play() {
      phase = 'playing';
      resetClasses();
      node.hidden = false;
      Lock.add('intro');
      Inert.add('intro');
      const steps = motion.reduced ? STEPS_REDUCED : STEPS;
      steps.forEach(([cls, t]) => later(() => node.classList.add(cls), t));
      later(() => { phase = 'ready'; }, steps[steps.length - 1][1]);
    }

    // Clique antes do botão aparecer: adianta a sequência.
    function skip() {
      if (phase !== 'playing') return;
      clear();
      node.classList.add('is-skip', ...ALL);
      phase = 'ready';
      later(() => node.classList.remove('is-skip'), 700);
    }

    function enter() {
      if (phase !== 'ready') return;
      phase = 'leaving';
      clear();
      node.classList.remove('is-skip');
      if (soundOn) Music.play({ fade: true });
      node.classList.add('is-leaving');
      Inert.remove('intro');
      later(() => root.classList.add('is-entered'), motion.reduced ? 0 : 380);
      later(() => {
        node.hidden = true;
        phase = 'done';
        Lock.remove('intro');
        $('#inicio').focus({ preventScroll: true });
        Parallax.schedule();
      }, motion.reduced ? 450 : 1300);
    }

    // "Reviver a experiência": a cortina fecha, a página volta ao topo e a introdução recomeça.
    function replay() {
      clear();
      phase = 'closing';
      resetClasses();
      node.classList.add('is-leaving');
      node.hidden = false;
      Lock.add('intro');
      Inert.add('intro');
      void node.offsetWidth;
      nextFrame(() => node.classList.remove('is-leaving'));
      later(() => {
        root.classList.remove('is-entered');
        jumpTo(0);
        Nav.reset();
        Finale.reset();
        play();
      }, motion.reduced ? 120 : 1150);
    }

    function fontsReady() {
      if (!doc.fonts || !doc.fonts.load) return Promise.resolve();
      return Promise.race([
        Promise.all([
          doc.fonts.load('300 1em "Cormorant Garamond"'),
          doc.fonts.load('italic 300 1em "Cormorant Garamond"'),
          doc.fonts.load('500 1em Inter'),
        ]),
        wait(1400),
      ]).catch(() => {});
    }

    enterBtn.addEventListener('click', (e) => { e.stopPropagation(); enter(); });
    soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      soundOn = !soundOn;
      store.set('mec:som', soundOn ? 'on' : 'off');
      renderSound();
    });
    node.addEventListener('click', (e) => { if (!e.target.closest('button')) skip(); });
    doc.addEventListener('keydown', (e) => {
      if (node.hidden || (e.key !== 'Enter' && e.key !== ' ')) return;
      if (phase === 'playing') { e.preventDefault(); skip(); } else if (phase === 'ready' && !e.target.closest('button')) { e.preventDefault(); enter(); }
    });

    return {
      setPhoto(p) {
        if (!p) return;
        node.classList.add('is-photo');
        img.src = Photo.small(p);
        whenLoaded(img, () => node.classList.add('is-ready'));
      },
      enableSound() { soundBtn.hidden = false; renderSound(); },
      start() {
        const hash = safeDecode(location.hash.slice(1));
        const target = hash && doc.getElementById(hash);
        if (target && hash !== 'inicio') {
          // Link direto para uma seção: abre sem a introdução.
          node.hidden = true;
          phase = 'done';
          root.classList.add('is-entered');
          requestAnimationFrame(() => target.scrollIntoView());
          return;
        }
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        jumpTo(0);
        Lock.add('intro');
        Inert.add('intro');
        fontsReady().then(play);
      },
      replay,
    };
  })();

  /* -------------------------------------------------- grade editorial */

  const kind = (p) => (p.ratio >= 1.15 ? 'L' : 'P');

  // Desktop (12 colunas): pares assimétricos, às vezes uma foto sozinha ou um trio.
  // [coluna, deslocamento vertical em vw]
  const D_PAIRS = {
    LL: [[['1 / 8', 0], ['9 / 13', 7]], [['1 / 6', 5], ['7 / 13', 0]]],
    LP: [[['1 / 9', 0], ['10 / 13', 9]], [['2 / 8', 4], ['9 / 13', 0]]],
    PL: [[['1 / 5', 8], ['6 / 13', 0]], [['2 / 6', 0], ['7 / 12', 6]]],
    PP: [[['2 / 6', 0], ['8 / 12', 10]], [['1 / 5', 7], ['7 / 11', 0]]],
  };
  const D_TRIO = [['1 / 4', 0], ['5 / 9', 6], ['10 / 13', 2]];
  const D_SINGLE = { L: [['2 / 12', 0], ['1 / 10', 0], ['4 / 13', 0]], P: [['5 / 9', 0], ['8 / 12', 0]] };

  function layoutDesktop(list) {
    const out = [];
    let i = 0;
    let row = 1;
    let k = 0;
    while (i < list.length) {
      const ka = kind(list[i]);
      const kb = list[i + 1] && kind(list[i + 1]);
      const kc = list[i + 2] && kind(list[i + 2]);
      let slots;
      if (!kb || (k % 6 === 3 && ka === 'L')) {
        const options = D_SINGLE[ka];
        slots = [options[Math.floor(k / 6) % options.length]];
      } else if (kc && ka === 'P' && kb === 'P' && kc === 'P' && k % 4 === 1) {
        slots = D_TRIO;
      } else {
        slots = D_PAIRS[ka + kb][k % 2];
      }
      slots.forEach(([col, y], s) => { out[i + s] = { col, y, row, pos: s }; });
      i += slots.length;
      row += 1;
      k += 1;
    }
    return out;
  }

  // Celular (6 colunas): horizontais grandes, verticais em pares ou deslocadas.
  function layoutMobile(list) {
    const out = [];
    let i = 0;
    let row = 1;
    let k = 0;
    while (i < list.length) {
      const ka = kind(list[i]);
      const kb = list[i + 1] && kind(list[i + 1]);
      if (ka === 'P' && kb === 'P') {
        out[i] = { col: '1 / 4', y: 0, row };
        out[i + 1] = { col: '4 / 7', y: 12, row };
        i += 2;
      } else if (ka === 'L') {
        out[i] = { col: k % 3 === 2 ? '2 / 7' : '1 / 7', y: 0, row };
        i += 1;
      } else {
        out[i] = { col: k % 2 ? '3 / 7' : '1 / 5', y: 0, row };
        i += 1;
      }
      row += 1;
      k += 1;
    }
    return out;
  }

  const span = (col) => { const [a, b] = col.split('/').map(Number); return b - a; };
  const sizesFor = (d, m) => `(min-width: 768px) ${Math.round((span(d) / 12) * 94)}vw, ${Math.round((span(m) / 6) * 94)}vw`;

  function editorialItem(p, d, m, total, caption) {
    const fig = doc.createElement('figure');
    fig.className = 'ed-item';
    fig.style.cssText = `--c:${d.col};--r:${d.row};--y:${d.y};--cm:${m.col};--rm:${m.row};--ym:${m.y};--ratio:${p.w} / ${p.h};--d:${(d.pos || 0) * 0.12}s`;
    if (p.color) fig.style.setProperty('--ph', p.color);

    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'ed-item__btn';
    btn.dataset.photo = p.index;
    btn.dataset.cursor = 'view';
    btn.setAttribute('aria-label', `Ampliar fotografia ${p.index + 1} de ${total}`);

    const img = doc.createElement('img');
    img.className = 'ed-item__img';
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    Photo.apply(img, p, sizesFor(d.col, m.col));

    const tag = doc.createElement('span');
    tag.className = 'ed-item__tag';
    tag.setAttribute('aria-hidden', 'true');
    tag.textContent = `Nº ${String(p.index + 1).padStart(3, '0')}`;

    btn.append(img, tag);
    fig.appendChild(btn);
    if (caption) {
      const cap = doc.createElement('figcaption');
      cap.className = 'ed-item__cap';
      cap.textContent = caption;
      fig.appendChild(cap);
    }
    return fig;
  }

  const Gallery = (() => {
    const section = $('#fotos');
    const grid = $('#gallery-grid');
    const moreWrap = $('#gallery-more-wrap');
    const moreBtn = $('#gallery-more');
    const shownEl = $('#gallery-shown');
    const FIRST = 18;
    const STEP = 24;
    let list = [];
    let desk = [];
    let mob = [];
    let rendered = 0;

    // Avança até o fim da linha para não deixar um par editorial pela metade.
    function rowEnd(n) {
      if (n >= list.length) return list.length;
      const row = desk[n - 1].row;
      let end = n;
      while (end < list.length && desk[end].row === row) end += 1;
      return end;
    }

    function renderTo(count) {
      const frag = doc.createDocumentFragment();
      const added = [];
      for (let i = rendered; i < count; i += 1) {
        const fig = editorialItem(list[i], desk[i], mob[i], list.length);
        added.push(fig);
        frag.appendChild(fig);
      }
      grid.appendChild(frag);
      added.forEach((fig) => Reveal.observe(fig));
      rendered = count;
      shownEl.textContent = formatCount(rendered);
      moreWrap.hidden = rendered >= list.length;
    }

    moreBtn.addEventListener('click', () => renderTo(rowEnd(Math.min(list.length, rendered + STEP))));

    return {
      init(photos) {
        list = photos;
        if (!list.length) {
          section.hidden = true;
          Nav.hide('fotos');
          return;
        }
        desk = layoutDesktop(list);
        mob = layoutMobile(list);
        $('#photo-total').textContent = formatCount(list.length);
        $('#gallery-total').textContent = formatCount(list.length);
        renderTo(rowEnd(Math.min(list.length, FIRST)));
      },
    };
  })();

  // Memórias: poucas fotos, muito espaço.
  const M_DESK = [
    { L: '1 / 8', P: '2 / 6', y: 0, row: 1 },
    { L: '9 / 13', P: '9 / 12', y: 14, row: 1 },
    { L: '3 / 11', P: '5 / 9', y: 0, row: 2 },
    { L: '1 / 6', P: '1 / 5', y: 6, row: 3 },
    { L: '7 / 13', P: '8 / 12', y: 0, row: 3 },
  ];
  const M_MOB = [
    { L: '1 / 7', P: '1 / 6' },
    { L: '2 / 7', P: '3 / 7' },
    { L: '1 / 7', P: '1 / 6' },
    { L: '1 / 6', P: '2 / 7' },
    { L: '2 / 7', P: '1 / 5' },
  ];

  function initMemories(memories, total) {
    const grid = $('#memories-grid');
    if (!memories.length) { grid.hidden = true; return; }
    memories.forEach((p, k) => {
      const kd = kind(p);
      const slot = memories.length === 1 ? { L: '3 / 11', P: '5 / 9', y: 0, row: 1 } : M_DESK[k];
      const d = { col: slot[kd], y: slot.y, row: slot.row, pos: k === 1 || k === 4 ? 1 : 0 };
      const m = { col: M_MOB[k][kd], y: 0, row: k + 1 };
      const fig = editorialItem(p, d, m, total, `Nº ${pad(k + 1)}`);
      grid.appendChild(fig);
      Reveal.observe(fig);
    });
  }

  function initPlate(section, p) {
    if (!p) {
      if (!section.classList.contains('plate--closing')) section.hidden = true;
      return;
    }
    section.hidden = false;
    section.classList.remove('plate--empty');
    const btn = $('.plate__frame', section);
    btn.dataset.photo = p.index;
    btn.removeAttribute('tabindex');
    btn.setAttribute('aria-label', `Ampliar fotografia ${p.index + 1}`);
    Photo.apply($('.plate__img', section), p, '100vw');
    Reveal.observe(section);
  }

  function initHero(p) {
    if (!p) return;
    $('#inicio').classList.add('has-photo');
    Photo.apply($('#hero-img'), p, '100vw');
  }

  /* ---------------------------------------------------------- lightbox */

  const Lightbox = (() => {
    const box = $('#lightbox');
    const stage = $('#lightbox-stage');
    const figure = $('#lightbox-figure');
    const img = $('#lightbox-img');
    const ph = $('#lightbox-ph');
    const counter = $('#lightbox-count');
    const btnPrev = $('#lightbox-prev');
    const btnNext = $('#lightbox-next');
    const btnClose = $('#lightbox-close');
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2.5);
    let list = [];
    let index = 0;
    let isOpen = false;
    let opener = null;
    let busy = false;
    let closeTimer = 0;
    let drag = null;

    const displayWidth = (p) => Math.min(stage.clientWidth || window.innerWidth, (stage.clientHeight || window.innerHeight) * p.ratio);

    function render() {
      const p = list[index];
      counter.textContent = `${index + 1} / ${list.length}`;
      figure.classList.remove('is-loaded');
      img.classList.remove('is-loaded');
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      delete img.dataset.fallback;
      img.alt = `Fotografia ${index + 1} de ${list.length}`;
      if (p.variants.length) {
        const w = Math.round(displayWidth(p));
        ph.src = Photo.small(p);
        ph.hidden = false;
        img.sizes = `${w}px`;
        img.srcset = Photo.srcset(p);
        img.src = Photo.best(p, w * dpr());
      } else {
        ph.removeAttribute('src');
        ph.hidden = true;
        img.src = p.src;
      }
      const done = () => { img.classList.add('is-loaded'); figure.classList.add('is-loaded'); };
      img.onload = done;
      img.onerror = () => {
        if (p.variants.length && !img.dataset.fallback) {
          img.dataset.fallback = '1';
          img.removeAttribute('srcset');
          img.src = p.src;
        }
      };
      if (img.complete && img.naturalWidth) done();
      preload(index + 1);
      preload(index - 1);
    }

    function preload(i) {
      if (list.length < 2) return;
      const p = list[(i + list.length) % list.length];
      const im = new Image();
      if (p.variants.length) {
        const w = Math.round(displayWidth(p));
        im.sizes = `${w}px`;
        im.srcset = Photo.srcset(p);
        im.src = Photo.best(p, w * dpr());
      } else {
        im.src = p.src;
      }
    }

    function go(delta) {
      if (busy || list.length < 2) return;
      const next = (index + delta + list.length) % list.length;
      if (motion.reduced) { index = next; render(); return; }
      busy = true;
      const dist = Math.min(90, window.innerWidth * 0.1);
      figure.style.transition = 'transform .26s cubic-bezier(.4,0,1,1), opacity .26s ease';
      figure.style.transform = `translate3d(${-delta * dist}px, 0, 0)`;
      figure.style.opacity = '0';
      setTimeout(() => {
        index = next;
        render();
        figure.style.transition = 'none';
        figure.style.transform = `translate3d(${delta * dist}px, 0, 0)`;
        void figure.offsetWidth;
        figure.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1), opacity .4s ease';
        figure.style.transform = '';
        figure.style.opacity = '';
        setTimeout(() => { busy = false; }, 140);
      }, 260);
    }

    function snapBack() {
      figure.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
      figure.style.transform = '';
      box.style.backgroundColor = '';
    }

    function open(i, from, photos) {
      if (!photos.length) return;
      list = photos;
      index = Math.max(0, Math.min(i, list.length - 1));
      opener = from || doc.activeElement;
      clearTimeout(closeTimer);
      figure.style.cssText = '';
      box.classList.remove('is-clean');
      box.hidden = false;
      btnPrev.hidden = btnNext.hidden = list.length < 2;
      Lock.add('lightbox');
      Inert.add('lightbox');
      render();
      nextFrame(() => box.classList.add('is-open'));
      isOpen = true;
      Back.push(close);
      btnClose.focus({ preventScroll: true });
    }

    function close(fromHistory) {
      if (!isOpen) return;
      isOpen = false;
      if (fromHistory !== true) Back.release();
      box.classList.remove('is-open');
      Lock.remove('lightbox');
      Inert.remove('lightbox');
      closeTimer = setTimeout(() => {
        box.hidden = true;
        img.removeAttribute('srcset');
        img.removeAttribute('src');
        ph.removeAttribute('src');
        figure.style.cssText = '';
      }, 450);
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    }

    btnPrev.addEventListener('click', () => go(-1));
    btnNext.addEventListener('click', () => go(1));
    btnClose.addEventListener('click', () => close());
    doc.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); } else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    });

    // Gestos: arrastar para os lados troca a foto; para baixo fecha; toque simples esconde os controles.
    stage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || busy) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), axis: null, dx: 0, dy: 0 };
      figure.style.transition = 'none';
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x;
      drag.dy = e.clientY - drag.y;
      if (!drag.axis && Math.hypot(drag.dx, drag.dy) > 10) {
        drag.axis = Math.abs(drag.dx) > Math.abs(drag.dy) ? 'x' : 'y';
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      }
      if (drag.axis === 'x') {
        figure.style.transform = `translate3d(${drag.dx}px, 0, 0)`;
      } else if (drag.axis === 'y' && drag.dy > 0) {
        figure.style.transform = `translate3d(0, ${drag.dy}px, 0) scale(${1 - Math.min(drag.dy / 1800, 0.12)})`;
        box.style.backgroundColor = `rgba(0, 0, 0, ${1 - Math.min(drag.dy / 500, 0.6)})`;
      }
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      const dt = Math.max(1, performance.now() - d.t);
      if (d.axis === 'x' && (Math.abs(d.dx) > 70 || Math.abs(d.dx) / dt > 0.5)) {
        box.style.backgroundColor = '';
        go(d.dx < 0 ? 1 : -1);
      } else if (d.axis === 'y' && d.dy > 110) {
        box.style.backgroundColor = '';
        close();
      } else {
        if (!d.axis && dt < 300 && e.type === 'pointerup') box.classList.toggle('is-clean');
        snapBack();
      }
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    window.addEventListener('resize', () => { if (isOpen) render(); });

    return { open };
  })();

  /* ------------------------------------------------------------ vídeos */

  const Cinema = (() => {
    const box = $('#cinema');
    const video = $('#cinema-video');
    const title = $('#cinema-title');
    const message = $('#cinema-message');
    const btnClose = $('#cinema-close');
    let isOpen = false;
    let opener = null;
    let closeTimer = 0;

    function showMessage(text) {
      message.textContent = text;
      message.hidden = false;
      video.hidden = true;
    }

    video.addEventListener('error', () => {
      if (isOpen && video.getAttribute('src')) showMessage('Este vídeo não pôde ser reproduzido neste navegador.');
    });

    function open(v, total, from) {
      opener = from || doc.activeElement;
      clearTimeout(closeTimer);
      title.textContent = `${v.title || `Momento ${pad(v.index + 1)}`}  ·  ${pad(v.index + 1)} / ${pad(total)}`;
      message.hidden = true;
      video.hidden = false;
      if (v.poster) video.poster = v.poster;
      else video.removeAttribute('poster');
      box.hidden = false;
      Lock.add('cinema');
      Inert.add('cinema');
      isOpen = true;
      Back.push(close);
      nextFrame(() => box.classList.add('is-open'));
      Music.duck(true);
      if (v.src) {
        video.src = v.src;
        const attempt = video.play();
        if (attempt && attempt.catch) attempt.catch(() => {});
      } else {
        showMessage('Prévia de demonstração — os vídeos reais entram em media/videos.');
      }
      btnClose.focus({ preventScroll: true });
    }

    function close(fromHistory) {
      if (!isOpen) return;
      isOpen = false;
      if (fromHistory !== true) Back.release();
      video.pause();
      box.classList.remove('is-open');
      Lock.remove('cinema');
      Inert.remove('cinema');
      Music.duck(false);
      closeTimer = setTimeout(() => {
        box.hidden = true;
        video.removeAttribute('src');
        video.removeAttribute('poster');
        video.load();
      }, 450);
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    }

    btnClose.addEventListener('click', () => close());
    doc.addEventListener('keydown', (e) => {
      if (isOpen && e.key === 'Escape') { e.preventDefault(); close(); }
    });
    return { open };
  })();

  const Videos = (() => {
    const section = $('#videos');
    const reel = $('#reel');
    const bar = $('#reel-bar');
    const btnPrev = $('#reel-prev');
    const btnNext = $('#reel-next');
    let list = [];
    let queued = false;
    let drag = null;
    let suppressClick = false;

    function card(v) {
      const el = doc.createElement('button');
      el.type = 'button';
      el.className = 'v-card';
      el.dataset.video = v.index;
      el.dataset.cursor = 'play';
      el.style.setProperty('--ratio', v.ratio.toFixed(4));
      el.style.setProperty('--d', `${Math.min(v.index, 4) * 0.1}s`);
      const name = v.title || `Momento ${pad(v.index + 1)}`;
      el.setAttribute('aria-label', `Assistir: ${name}${v.duration ? ` (${formatTime(v.duration)})` : ''}`);

      if (v.poster) {
        const img = doc.createElement('img');
        img.className = 'v-card__img';
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.draggable = false;
        img.src = v.poster;
        whenLoaded(img);
        el.appendChild(img);
      } else if (v.src) {
        // Sem capa: mostra um quadro do próprio vídeo, carregado só quando o cartão se aproxima.
        const vid = doc.createElement('video');
        vid.className = 'v-card__video';
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = 'none';
        vid.dataset.src = `${v.src}#t=0.6`;
        vid.setAttribute('aria-hidden', 'true');
        vid.addEventListener('loadeddata', () => vid.classList.add('is-loaded'), { once: true });
        el.appendChild(vid);
      }

      const shade = doc.createElement('span');
      shade.className = 'v-card__shade';
      const playIcon = doc.createElement('span');
      playIcon.className = 'v-card__play';
      playIcon.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-play"/></svg>';
      const meta = doc.createElement('span');
      meta.className = 'v-card__meta';
      meta.innerHTML = '<span class="v-card__info"></span><span class="v-card__dur"></span>';
      const info = $('.v-card__info', meta);
      if (v.title) {
        const t = doc.createElement('span');
        t.className = 'v-card__title';
        t.textContent = v.title;
        info.appendChild(t);
      }
      info.appendChild(doc.createTextNode(pad(v.index + 1)));
      $('.v-card__dur', meta).textContent = v.duration ? formatTime(v.duration) : '';
      el.append(shade, playIcon, meta);
      return el;
    }

    function updateProgress() {
      queued = false;
      const max = reel.scrollWidth - reel.clientWidth;
      const ratio = max > 0 ? (reel.scrollLeft + reel.clientWidth) / reel.scrollWidth : 1;
      bar.style.transform = `scaleX(${ratio.toFixed(4)})`;
      btnPrev.disabled = reel.scrollLeft <= 2;
      btnNext.disabled = reel.scrollLeft >= max - 2;
    }
    const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(updateProgress); } };

    function scrollByPage(dir) {
      reel.scrollBy({ left: dir * reel.clientWidth * 0.8, behavior: motion.reduced ? 'auto' : 'smooth' });
    }

    // Arrastar com o mouse (no celular o próprio toque já rola).
    reel.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: reel.scrollLeft, moved: false, id: e.pointerId };
    });
    reel.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6) {
        drag.moved = true;
        reel.classList.add('is-dragging');
        try { reel.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      }
      if (drag.moved) reel.scrollLeft = drag.left - dx;
    });
    const endDrag = () => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      if (!moved) return;
      reel.classList.remove('is-dragging');
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 60);
    };
    reel.addEventListener('pointerup', endDrag);
    reel.addEventListener('pointercancel', endDrag);
    reel.addEventListener('lostpointercapture', endDrag);
    reel.addEventListener('click', (e) => {
      if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
      const c = e.target.closest('.v-card');
      if (c) Cinema.open(list[Number(c.dataset.video)], list.length, c);
    });
    reel.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    btnPrev.addEventListener('click', () => scrollByPage(-1));
    btnNext.addEventListener('click', () => scrollByPage(1));

    return {
      init(videos) {
        list = videos;
        if (!list.length) {
          section.hidden = true;
          Nav.hide('videos');
          return;
        }
        const frag = doc.createDocumentFragment();
        list.forEach((v) => frag.appendChild(card(v)));
        reel.appendChild(frag);
        Reveal.observe(reel);
        const lazy = $$('video[data-src]', reel);
        if (lazy.length) {
          const load = (vid) => { vid.src = vid.dataset.src; vid.preload = 'metadata'; delete vid.dataset.src; };
          if (hasIO) {
            const io = new IntersectionObserver((entries) => {
              entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                io.unobserve(entry.target);
                load(entry.target);
              });
            }, { root: reel, rootMargin: '0px 60% 0px 60%' });
            const outer = new IntersectionObserver((entries) => {
              if (!entries.some((e) => e.isIntersecting)) return;
              outer.disconnect();
              lazy.forEach((vid) => io.observe(vid));
            }, { rootMargin: '300px 0px' });
            outer.observe(reel);
          } else {
            lazy.forEach(load);
          }
        }
        schedule();
      },
    };
  })();

  /* ------------------------------------------------------------ números */

  function initNumbers(counts) {
    const listEl = $('.numbers__list');
    const animated = [];
    let visible = 0;
    $$('.stat', listEl).forEach((stat) => {
      const key = stat.dataset.stat;
      if (key === 'photos' || key === 'videos') {
        const n = counts[key];
        if (!n) { stat.hidden = true; return; }
        const dd = $('dd', stat);
        const sr = doc.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = formatCount(n);
        dd.prepend(sr);
        $('.stat__ghost', stat).textContent = formatCount(n);
        animated.push({ el: $('.stat__value', stat), from: 0, to: n, format: formatCount });
      } else if (key === 'year') {
        animated.push({ el: $('.stat__value', stat), from: 2000, to: 2025, format: String });
      }
      visible += 1;
    });
    listEl.style.setProperty('--cols', visible);
    animated.forEach((a) => { a.el.textContent = a.format(motion.reduced ? a.to : a.from); });
    listEl.setAttribute('data-reveal', 'fade');
    Reveal.observe(listEl, () => {
      if (motion.reduced) return;
      const t0 = performance.now();
      const duration = 2000;
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / duration);
        const eased = 1 - (1 - k) ** 4;
        animated.forEach((a) => { a.el.textContent = a.format(Math.round(a.from + (a.to - a.from) * eased)); });
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ------------------------------------------------------------ música */

  const Music = (() => {
    const player = $('#musica');
    const toggle = $('#player-toggle');
    const now = $('#player-now');
    const titleEl = $('#player-title');
    const artistEl = $('#player-artist');
    const seek = $('#player-seek');
    const timeEl = $('#player-time');
    const durationEl = $('#player-duration');
    const listEl = $('#player-list');
    const playButtons = [$('#player-play'), $('#player-main')];
    let tracks = [];
    let audio = null;
    let current = 0;
    let fadeRaf = 0;
    let resumeAfter = false;
    let seeking = false;
    let errors = 0;

    function setPlaying(on) {
      player.classList.toggle('is-playing', on);
      playButtons.forEach((b) => b.setAttribute('aria-label', on ? 'Pausar' : 'Tocar'));
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = on ? 'playing' : 'paused';
    }

    function renderMeta() {
      const t = tracks[current];
      now.textContent = t.title;
      titleEl.textContent = t.title;
      artistEl.textContent = t.artist;
      $$('.player__track', listEl).forEach((b, i) => b.setAttribute('aria-current', String(i === current)));
      if ('mediaSession' in navigator && window.MediaMetadata) {
        try { navigator.mediaSession.metadata = new window.MediaMetadata({ title: t.title, artist: t.artist, album: 'Mecatrônica 2025' }); } catch (e) { /* ok */ }
      }
    }

    function load(i) {
      current = (i + tracks.length) % tracks.length;
      audio.src = tracks[current].src;
      seek.value = 0;
      seek.style.setProperty('--p', '0%');
      seek.disabled = true;
      timeEl.textContent = '0:00';
      durationEl.textContent = tracks[current].duration ? formatTime(tracks[current].duration) : '0:00';
      renderMeta();
    }

    function fadeTo(target, ms, done) {
      cancelAnimationFrame(fadeRaf);
      if (motion.reduced || doc.hidden) { audio.volume = target; if (done) done(); return; }
      const from = audio.volume;
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, Math.max(0, (t - t0) / ms));
        audio.volume = Math.min(1, Math.max(0, from + (target - from) * k));
        if (k < 1) fadeRaf = requestAnimationFrame(step);
        else if (done) done();
      };
      fadeRaf = requestAnimationFrame(step);
    }

    function play(opts) {
      if (!audio) return;
      cancelAnimationFrame(fadeRaf);
      const fade = opts && opts.fade;
      audio.volume = fade ? 0 : 1;
      const attempt = audio.play();
      if (attempt && attempt.catch) attempt.catch(() => setPlaying(false));
      if (fade) fadeTo(1, 1800);
    }

    function pause(opts) {
      if (!audio) return;
      if (opts && opts.fade) fadeTo(0, 600, () => audio.pause());
      else { cancelAnimationFrame(fadeRaf); audio.pause(); }
    }

    function toggleplay() {
      if (audio.paused) play({ fade: true }); else pause({ fade: true });
    }

    function expand(open) {
      player.classList.toggle('is-expanded', open);
      toggle.setAttribute('aria-expanded', String(open));
    }

    function bind() {
      audio.addEventListener('play', () => setPlaying(true));
      audio.addEventListener('pause', () => setPlaying(false));
      audio.addEventListener('ended', () => { load(current + 1); play(); });
      audio.addEventListener('loadedmetadata', () => {
        errors = 0;
        seek.disabled = false;
        durationEl.textContent = formatTime(audio.duration);
      });
      audio.addEventListener('timeupdate', () => {
        if (seeking || !Number.isFinite(audio.duration)) return;
        const k = audio.currentTime / audio.duration;
        seek.value = Math.round(k * 1000);
        seek.style.setProperty('--p', `${(k * 100).toFixed(2)}%`);
        timeEl.textContent = formatTime(audio.currentTime);
      });
      audio.addEventListener('error', () => {
        if (!audio.getAttribute('src')) return;
        errors += 1;
        setPlaying(false);
        if (errors < tracks.length) { load(current + 1); play(); }
      });

      seek.addEventListener('input', () => {
        seeking = true;
        seek.style.setProperty('--p', `${seek.value / 10}%`);
        if (Number.isFinite(audio.duration)) timeEl.textContent = formatTime((seek.value / 1000) * audio.duration);
      });
      seek.addEventListener('change', () => {
        if (Number.isFinite(audio.duration)) audio.currentTime = (seek.value / 1000) * audio.duration;
        seeking = false;
      });

      playButtons.forEach((b) => b.addEventListener('click', toggleplay));
      $('#player-prev').addEventListener('click', () => { const was = !audio.paused; load(current - 1); if (was) play(); });
      $('#player-next').addEventListener('click', () => { const was = !audio.paused; load(current + 1); if (was) play(); });
      toggle.addEventListener('click', () => expand(!player.classList.contains('is-expanded')));
      listEl.addEventListener('click', (e) => {
        const b = e.target.closest('.player__track');
        if (b) { load(Number(b.dataset.track)); play(); }
      });
      doc.addEventListener('click', (e) => {
        if (player.classList.contains('is-expanded') && !player.contains(e.target) && !e.target.closest('[data-music-open]')) expand(false);
      });
      doc.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && player.classList.contains('is-expanded')) { expand(false); toggle.focus(); }
      });
      $$('[data-music-open]').forEach((a) => a.addEventListener('click', (e) => {
        e.preventDefault();
        expand(true);
        $('#player-main').focus({ preventScroll: true });
      }));

      if ('mediaSession' in navigator) {
        const actions = {
          play: () => play(),
          pause: () => pause(),
          previoustrack: () => { load(current - 1); play(); },
          nexttrack: () => { load(current + 1); play(); },
        };
        Object.keys(actions).forEach((name) => {
          try { navigator.mediaSession.setActionHandler(name, actions[name]); } catch (e) { /* ação não suportada */ }
        });
      }
    }

    return {
      init(list) {
        tracks = list;
        if (!tracks.length) {
          $$('[data-music-open]').forEach((a) => { a.closest('li').hidden = true; });
          return;
        }
        player.hidden = false;
        audio = new Audio();
        audio.preload = 'none';
        if (tracks.length > 1) {
          tracks.forEach((t, i) => {
            const li = doc.createElement('li');
            const b = doc.createElement('button');
            b.type = 'button';
            b.className = 'player__track';
            b.dataset.track = i;
            b.innerHTML = '<span></span><span></span>';
            b.firstChild.textContent = pad(i + 1);
            b.lastChild.textContent = t.title;
            li.appendChild(b);
            listEl.appendChild(li);
          });
        }
        load(0);
        bind();
        Intro.enableSound();
      },
      play,
      // Pausa durante um vídeo e retoma depois, só se estava tocando.
      duck(on) {
        if (!audio) return;
        if (on) {
          resumeAfter = !audio.paused;
          if (resumeAfter) pause({ fade: true });
        } else if (resumeAfter) {
          resumeAfter = false;
          play({ fade: true });
        }
      },
    };
  })();

  /* ------------------------------------------------------------ cursor */

  function initCursor() {
    if (!mqFine.matches || motion.reduced) return;
    const node = $('#cursor');
    const dot = $('.cursor__dot', node);
    const follow = $('.cursor__follow', node);
    let x = 0;
    let y = 0;
    let fx = 0;
    let fy = 0;
    let raf = 0;
    let shown = false;
    let state = '';

    root.classList.add('has-cursor');
    node.classList.add('is-out');

    const loop = () => {
      fx += (x - fx) * 0.2;
      fy += (y - fy) * 0.2;
      follow.style.transform = `translate3d(${fx.toFixed(1)}px, ${fy.toFixed(1)}px, 0)`;
      raf = Math.abs(x - fx) + Math.abs(y - fy) > 0.3 ? requestAnimationFrame(loop) : 0;
    };

    doc.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (!shown) {
        shown = true;
        fx = x;
        fy = y;
        node.classList.remove('is-out');
      }
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });

    doc.addEventListener('pointerover', (e) => {
      const t = e.target.closest && e.target.closest('[data-cursor], a, button, input, select, label');
      const next = t ? (t.dataset.cursor || 'link') : '';
      if (next === state) return;
      if (state) node.classList.remove(`is-${state}`);
      state = next;
      if (state) node.classList.add(`is-${state}`);
    });
    root.addEventListener('mouseleave', () => { node.classList.add('is-out'); shown = false; });
    doc.addEventListener('pointerdown', () => node.classList.add('is-down'));
    doc.addEventListener('pointerup', () => node.classList.remove('is-down'));
    onChange(mqFine, (e) => root.classList.toggle('has-cursor', e.matches));
  }

  /* ------------------------------------------------------------- final */

  const Finale = (() => {
    const node = $('#final');
    // Uma frase de cada vez no centro, como créditos de filme; depois o título.
    const STEPS = [['f1', 300], ['f1-out', 2500], ['f2', 3200], ['f2-out', 5400], ['f3', 6000], ['f4', 7300], ['f5', 8000]];
    const STEPS_REDUCED = [['f1', 0], ['f1-out', 1500], ['f2', 1900], ['f2-out', 3400], ['f3', 3800], ['f4', 4000], ['f5', 4200]];
    const ALL = STEPS.map((s) => s[0]);
    let timers = [];
    let io = null;
    let playing = false;

    function playSequence() {
      playing = true;
      const steps = motion.reduced ? STEPS_REDUCED : STEPS;
      steps.forEach(([cls, t]) => timers.push(setTimeout(() => node.classList.add(cls), t)));
      timers.push(setTimeout(() => { playing = false; }, steps[steps.length - 1][1]));
    }
    // Um clique durante a sequência leva direto ao final.
    function skip() {
      if (!playing) return;
      playing = false;
      timers.forEach(clearTimeout);
      timers = [];
      node.classList.add('is-skip', 'f3', 'f4', 'f5');
      node.classList.remove('f1', 'f2');
      setTimeout(() => node.classList.remove('is-skip'), 700);
    }
    node.addEventListener('click', (e) => { if (!e.target.closest('button')) skip(); });
    function watch() {
      if (!hasIO) { node.classList.add('f3', 'f4', 'f5'); return; }
      io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        playSequence();
      }, { threshold: 0.4 });
      io.observe(node);
    }
    $('#replay').addEventListener('click', () => Intro.replay());
    return {
      init: watch,
      reset() {
        timers.forEach(clearTimeout);
        timers = [];
        playing = false;
        node.classList.remove(...ALL, 'is-skip');
        if (io) io.disconnect();
        watch();
      },
    };
  })();

  /* ------------------------------------------------------------- início */

  function init() {
    window.MEC_READY = true;
    const demo = /[?&]demo(?:[=&]|$)/.test(location.search);
    const media = normalize(demo ? demoMedia() : window.MEC_MEDIA || {});

    $$('[data-split]').forEach(splitWords);
    $$('[data-reveal]').forEach((el) => Reveal.observe(el));
    $$('[data-split]').forEach((el) => { if (!el.closest('.hero')) Reveal.observe(el); });

    const featured = pickFeatured(media.photos, media.config);
    initHero(featured.cover);
    Intro.setPhoto(featured.cover);
    initPlate($('#abertura'), featured.opening);
    initPlate($('#ultima'), featured.closing);
    initMemories(featured.memories, media.photos.length);
    Gallery.init(media.photos);
    Videos.init(media.videos);
    initNumbers({ photos: media.photos.length, videos: media.videos.length });
    Music.init(media.music);
    Finale.init();
    initCursor();
    $$('[data-parallax]').forEach(Parallax.add);

    doc.addEventListener('click', (e) => {
      const t = e.target.closest('[data-photo]');
      if (t) Lightbox.open(Number(t.dataset.photo), t, media.photos);
    });

    let queued = false;
    window.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        Nav.onScroll(window.scrollY);
        Parallax.update();
      });
    }, { passive: true });
    window.addEventListener('resize', Parallax.schedule, { passive: true });
    onChange(mqReduced, (e) => { motion.reduced = e.matches; Parallax.update(); });

    if (media.demo) {
      const badge = doc.createElement('div');
      badge.className = 'demo-badge';
      badge.textContent = 'Demonstração';
      doc.body.appendChild(badge);
    }

    Intro.start();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
