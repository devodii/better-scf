// Plain strings because the scripts' TypeScript config has no DOM types.
export const RECON_PROBE = String.raw`(() => {
  const landmark = document.querySelector('main') || document.querySelector('[role="main"]');
  const text = ((landmark || document.body).textContent || '').toUpperCase();
  const libraries = ['swiper', 'slick', 'embla', 'splide', 'glide', 'carousel', 'keen-slider'].filter(
    (name) => document.querySelector('[class*="' + name + '"]') !== null,
  );
  let scrollSnap = false;
  for (const el of document.querySelectorAll('*')) {
    const snap = getComputedStyle(el).scrollSnapType;
    if (snap && snap !== 'none') {
      scrollSnap = true;
      break;
    }
  }
  const html = landmark ? landmark.innerHTML : null;
  return {
    landmark: landmark ? landmark.tagName.toLowerCase() : null,
    landmarkHtml: html !== null && html.length <= 2000000 ? html : null,
    landmarkTooLarge: html !== null && html.length > 2000000,
    hasTranche3Onchain: text.includes('TRANCHE 3 ONCHAIN METRIC'),
    mentionsComments: /\bCOMMENTS?\b/.test(text),
    scrollSnap,
    carouselLibraries: libraries,
  };
})()`;

export const TOKEN_PROBE = String.raw`(() => {
  const found = {};
  const notes = {};
  const channels = (color) => {
    const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(color || '');
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  };
  const transparent = (c) => !c || c === 'transparent' || /,\s*0\)$/.test(c) || /\/\s*0\s*\)$/.test(c);
  const fold = (color, el) => {
    const c = channels(color);
    const opacity = Number(getComputedStyle(el).opacity);
    if (!c || !(opacity < 1)) return color;
    const a = /^rgba?\(\s*[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+\s*[,/]\s*([\d.]+)(%?)/.exec(color);
    const alpha = a ? Number(a[1]) / (a[2] ? 100 : 1) : 1;
    return 'rgba(' + c.join(', ') + ', ' + Math.round(alpha * opacity * 1000) / 1000 + ')';
  };
  const effective = (el) => fold(getComputedStyle(el).color, el);
  const leaves = Array.from(document.querySelectorAll('body *')).filter((el) => {
    if (el.children.length > 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (el.textContent || '').trim() !== '';
  });
  const byText = (test) => leaves.find((el) => test((el.textContent || '').trim()));
  const label = (el) => el.tagName.toLowerCase() + ' "' + (el.textContent || '').trim().slice(0, 24) + '"';
  const backgroundOf = (el) => {
    let node = el;
    for (let i = 0; i < 5 && node; i += 1) {
      const bg = getComputedStyle(node).backgroundColor;
      if (!transparent(bg)) return { bg: fold(bg, node), node };
      node = node.parentElement;
    }
    return null;
  };
  const record = (name, value, note) => {
    if (value && value !== 'none' && !(name in found)) {
      found[name] = value;
      notes[name] = note;
    }
  };
  const chip = (prefix, el) => {
    if (!el) return;
    const own = backgroundOf(el);
    if (!own) return;
    record(prefix + '-bg', own.bg, label(el));
    record(prefix + '-fg', effective(el), label(el));
    return own;
  };

  const body = getComputedStyle(document.body);
  const rootBg = getComputedStyle(document.documentElement).backgroundColor;
  record('bg', transparent(body.backgroundColor) ? rootBg : body.backgroundColor, 'body');
  record('font-body', body.fontFamily, 'body');

  const purple = chip('chip-purple', byText((t) => t === 'SCF #46'));
  const amount = byText((t) => /^\$\d+(\.\d+)?[KM]$/.test(t));
  if (amount) {
    const own = backgroundOf(amount);
    if (own) record('chip-purple-bg', own.bg, label(amount));
    record('chip-purple-fg', effective(amount), label(amount));
  }
  const olive = chip('chip-olive', byText((t) => t === 'Build' || t === 'Submitted'));
  chip('chip-yellow', byText((t) => t === 'Ended'));
  if (purple) record('radius-chip', getComputedStyle(purple.node).borderRadius, label(purple.node));
  if (olive) record('radius-chip', getComputedStyle(olive.node).borderRadius, label(olive.node));

  const anchorChip = purple || olive;
  if (anchorChip) {
    let card = anchorChip.node.parentElement;
    for (let i = 0; i < 12 && card; i += 1) {
      const style = getComputedStyle(card);
      if (!transparent(style.backgroundColor) && fold(style.backgroundColor, card) !== anchorChip.bg) break;
      card = card.parentElement;
    }
    if (card && card !== document.body) {
      const style = getComputedStyle(card);
      const text = effective(card);
      record('surface', fold(style.backgroundColor, card), 'card around ' + label(anchorChip.node));
      record('text', text, 'card');
      record('radius-card', style.borderRadius, 'card');
      record('shadow-card', style.boxShadow, 'card');
      const muted = Array.from(card.querySelectorAll('*')).find(
        (el) =>
          el.children.length === 0 &&
          (el.textContent || '').trim() !== '' &&
          !el.closest('button, a, [role="button"]') &&
          backgroundOf(el)?.node === card &&
          effective(el) !== text,
      );
      if (muted) record('text-muted', effective(muted), label(muted));
      let container = card;
      while (container.children.length === 1 && container.firstElementChild) container = container.firstElementChild;
      const kids = Array.from(container.children);
      const gaps = [];
      for (let i = 1; i < kids.length; i += 1) {
        const gap = kids[i].getBoundingClientRect().top - kids[i - 1].getBoundingClientRect().bottom;
        if (gap > 0) gaps.push(Math.round(gap));
      }
      gaps.sort((a, b) => a - b);
      if (gaps.length > 0) record('space-card-section', gaps[Math.floor(gaps.length / 2)] + 'px', 'median gap of ' + gaps.length);
    }
  }

  const heading = byText((t) => ['TEAM', 'REQUESTED BUDGET', 'PRODUCTS & SERVICES', 'TRACTION EVIDENCE'].includes(t.toUpperCase()));
  if (heading) {
    const style = getComputedStyle(heading);
    record('font-display', style.fontFamily, label(heading));
    record('font-display-weight', style.fontWeight, label(heading));
  }

  const link = Array.from(document.querySelectorAll('a[href]')).find((a) => {
    const c = channels(getComputedStyle(a).color);
    return c !== null && c[2] > c[0] + 20 && c[2] > c[1];
  });
  if (link) record('link', effective(link), label(link));

  const paintOf = (style) =>
    !transparent(style.backgroundColor) ? style.backgroundColor : parseFloat(style.borderTopWidth) > 0 ? style.borderTopColor : null;
  const yellow = (color) => {
    const c = channels(color);
    return c !== null && c[0] > 180 && c[1] > 140 && c[2] < 120;
  };
  const arrow = Array.from(document.querySelectorAll('button, [role="button"], a')).find((el) => {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const round = style.borderRadius.includes('%') || parseFloat(style.borderRadius) >= r.width / 2;
    return r.width >= 24 && r.width <= 80 && Math.abs(r.width - r.height) < 2 && round && yellow(paintOf(style)) && el.querySelector('svg, img') !== null;
  });
  if (arrow) record('accent-yellow', fold(paintOf(getComputedStyle(arrow)), arrow), 'round icon button ' + label(arrow));

  const variables = {};
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = Array.from(sheet.cssRules);
    } catch (error) {
      continue;
    }
    for (const rule of rules) {
      if (!rule.style || !rule.selectorText || !/(^|,)\s*(:root|html)\s*(,|$)/.test(rule.selectorText)) continue;
      for (const name of Array.from(rule.style)) {
        if (name.startsWith('--')) variables[name] = rule.style.getPropertyValue(name).trim();
      }
    }
  }
  return { found, notes, variables };
})()`;
