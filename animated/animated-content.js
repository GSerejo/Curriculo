/*
 * Conteúdo que entra animado ao rolar a página (deslizando, aparecendo e, se quiser, em cascata).
 * Adaptado do componente AnimatedContent do React Bits (https://reactbits.dev, variante JS + CSS)
 * para JavaScript puro, sem React. Depende do GSAP com ScrollTrigger (globais do CDN).
 *
 * Uso:
 *   const revert = window.animateContent(elemento, { distance: 60, stagger: 0.1 });
 *   revert(); // volta o elemento ao estado original
 * Com stagger > 0, cada filho direto do elemento entra na sua vez.
 */
(function () {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const WIPES = {
    up: 'linear-gradient(to top, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))',
    down: 'linear-gradient(to bottom, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))',
    left: 'linear-gradient(to left, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))',
    right: 'linear-gradient(to right, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))',
    center:
      'radial-gradient(farthest-corner at 50% 50%, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))'
  };

  const DEFAULTS = {
    container: null,
    distance: 100,
    direction: 'vertical',
    reverse: false,
    duration: 0.8,
    ease: 'power3.out',
    initialOpacity: 0,
    animateOpacity: true,
    scale: 1,
    blur: 0,
    rotate: 0,
    tilt: 0,
    wipe: 'none',
    threshold: 0.1,
    delay: 0,
    stagger: 0,
    staggerFrom: 'start',
    trigger: 'scroll',
    once: true,
    scrub: false,
    disappearAfter: 0,
    disappearDuration: 0.5,
    disappearEase: 'power3.in',
    onStart: null,
    onComplete: null,
    onDisappearanceComplete: null
  };

  window.animateContent = function animateContent(el, options = {}) {
    const o = { ...DEFAULTS, ...options };
    let scroller = o.container;
    if (typeof scroller === 'string') scroller = document.querySelector(scroller);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const ctx = gsap.context(() => {
      const targets = o.stagger > 0 && el.children.length ? Array.from(el.children) : [el];
      const horizontal = o.direction === 'horizontal';
      const axis = horizontal ? 'x' : 'y';
      const sign = o.reverse ? -1 : 1;
      const mask = WIPES[o.wipe];

      gsap.set(el, { visibility: 'visible' });

      if (reduce) {
        o.onComplete?.();
        return;
      }

      const from = {
        [axis]: o.distance * sign,
        scale: o.scale,
        opacity: o.animateOpacity ? o.initialOpacity : 1
      };
      const to = {
        [axis]: 0,
        scale: 1,
        opacity: 1,
        duration: o.duration,
        ease: o.ease
      };

      if (o.blur > 0) {
        from.filter = `blur(${o.blur}px)`;
        to.filter = 'blur(0px)';
      }
      if (o.rotate) {
        from.rotation = o.rotate * sign;
        to.rotation = 0;
      }
      if (o.tilt) {
        const tiltAxis = horizontal ? 'rotationY' : 'rotationX';
        from[tiltAxis] = horizontal ? -o.tilt * sign : o.tilt * sign;
        to[tiltAxis] = 0;
        from.transformPerspective = 900;
        to.transformPerspective = 900;
      }
      if (mask) {
        gsap.set(targets, { maskImage: mask, webkitMaskImage: mask });
        from['--ac-wipe'] = 0;
        to['--ac-wipe'] = 1;
      }
      if (o.stagger > 0) to.stagger = { each: o.stagger, from: o.staggerFrom };

      // Ao terminar, tira transform e filtro: assim hovers e o vidro fosco voltam a funcionar normalmente
      const settle = () => {
        if (o.scrub) return;
        gsap.set(targets, { clearProps: mask ? 'filter,transform,maskImage,webkitMaskImage,opacity' : 'filter,transform,opacity' });
      };

      const disappear = () => {
        if (o.disappearAfter <= 0) return;
        const out = {
          [axis]: -o.distance * sign,
          scale: 0.8,
          opacity: o.animateOpacity ? o.initialOpacity : 0,
          delay: o.disappearAfter,
          duration: o.disappearDuration,
          ease: o.disappearEase,
          onComplete: () => o.onDisappearanceComplete?.()
        };
        if (o.blur > 0) out.filter = `blur(${o.blur}px)`;
        if (o.stagger > 0) out.stagger = { each: o.stagger, from: o.staggerFrom };
        gsap.to(targets, out);
      };

      const tl = gsap.timeline({
        paused: true,
        onStart: () => o.onStart?.(),
        onComplete: () => {
          o.onComplete?.();
          settle();
          if (o.once && !o.scrub) disappear();
        }
      });
      tl.fromTo(targets, from, to, o.scrub ? 0 : Math.max(o.delay, 0));

      if (o.trigger === 'mount') {
        tl.play();
        return;
      }

      const start = `top ${(1 - o.threshold) * 100}%`;

      if (o.scrub) {
        ScrollTrigger.create({
          trigger: el,
          scroller,
          start,
          end: `top ${Math.max((1 - o.threshold) * 100 - 45, 5)}%`,
          scrub: o.scrub === true ? true : Math.max(Number(o.scrub) || 0, 0.01),
          animation: tl
        });
        return;
      }

      ScrollTrigger.create({
        trigger: el,
        scroller,
        start,
        once: o.once,
        onEnter: () => tl.play(),
        onLeaveBack: o.once
          ? undefined
          : () => {
              if (mask) gsap.set(targets, { maskImage: mask, webkitMaskImage: mask });
              tl.reverse();
            }
      });
    }, el);

    return () => ctx.revert();
  };
})();
