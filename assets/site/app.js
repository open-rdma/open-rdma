(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('[data-header]');
  const hero = document.querySelector('.hero');
  const progressBar = document.querySelector('.scroll-progress span');
  const themeButton = document.querySelector('[data-theme-toggle]');
  const languageButton = document.querySelector('[data-language-toggle]');
  const languageLabel = document.querySelector('[data-language-label]');
  const menuButton = document.querySelector('[data-menu-toggle]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  const architectureImage = document.querySelector('[data-architecture-image]');
  const demo = document.querySelector('[data-demo]');
  const demoButton = document.querySelector('[data-demo-toggle]');
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const copy = {
    zh: {
      title: 'Open-RDMA | 开放网络，开放未来',
      description: 'Open-RDMA：从 RTL 到驱动，面向 AI 基础设施的全栈开源 RDMA 项目。',
      theme: '切换深浅主题',
      menuOpen: '打开菜单',
      menuClose: '关闭菜单',
      pause: '暂停演示',
      play: '继续演示',
      setup: '复制启动命令',
      verify: '复制验证命令'
    },
    en: {
      title: 'Open-RDMA | Open Network, Open Future',
      description: 'Open-RDMA is a full-stack open-source RDMA hardware and software project for AI infrastructure.',
      theme: 'Toggle color theme',
      menuOpen: 'Open menu',
      menuClose: 'Close menu',
      pause: 'Pause animation',
      play: 'Play animation',
      setup: 'Copy setup commands',
      verify: 'Copy verification commands'
    }
  };

  const storage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Preferences remain active in this tab if storage is blocked.
      }
    }
  };

  function resolvedTheme() {
    const saved = storage.get('openrdma-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return colorScheme.matches ? 'dark' : 'light';
  }

  function updateArchitectureImage(theme) {
    if (!architectureImage) return;
    const source = theme === 'dark'
      ? architectureImage.dataset.darkSrc
      : architectureImage.dataset.lightSrc;
    if (source && architectureImage.getAttribute('src') !== source) {
      architectureImage.setAttribute('src', source);
    }
  }

  function applyTheme(theme, persist = false) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    updateArchitectureImage(theme);
    if (persist) storage.set('openrdma-theme', theme);
  }

  function currentLanguage() {
    return root.dataset.lang === 'en' ? 'en' : 'zh';
  }

  function updateLocalizedMetadata(language) {
    const text = copy[language];
    document.title = text.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', text.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', text.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', text.description);
    themeButton?.setAttribute('aria-label', text.theme);
    menuButton?.setAttribute('aria-label', menuButton.getAttribute('aria-expanded') === 'true' ? text.menuClose : text.menuOpen);
    demoButton?.setAttribute('aria-label', demoButton.getAttribute('aria-pressed') === 'true' ? text.play : text.pause);
    document.querySelector('[data-copy-target="#setup-code"]')?.setAttribute('aria-label', text.setup);
    document.querySelector('[data-copy-target="#verify-code"]')?.setAttribute('aria-label', text.verify);
  }

  function applyLanguage(language, persist = false) {
    const normalized = language === 'en' ? 'en' : 'zh';
    root.dataset.lang = normalized;
    root.lang = normalized === 'zh' ? 'zh-CN' : 'en';
    if (languageLabel) languageLabel.textContent = normalized === 'zh' ? 'EN' : '中';
    languageButton?.setAttribute('aria-label', normalized === 'zh' ? 'Switch to English' : '切换到简体中文');
    document.querySelectorAll('[data-contribution-link]').forEach((link) => {
      link.href = `https://github.com/open-rdma/open-rdma/blob/master/CONTRIBUTING${normalized === 'zh' ? '_CN' : ''}.md`;
    });
    updateLocalizedMetadata(normalized);
    if (persist) storage.set('openrdma-language', normalized);
  }

  function closeMenu() {
    if (!menuButton || !header) return;
    menuButton.setAttribute('aria-expanded', 'false');
    header.classList.remove('menu-active');
    document.body.classList.remove('menu-open');
    updateLocalizedMetadata(currentLanguage());
  }

  function toggleMenu() {
    if (!menuButton || !header) return;
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    header.classList.toggle('menu-active', !isOpen);
    document.body.classList.toggle('menu-open', !isOpen);
    updateLocalizedMetadata(currentLanguage());
  }

  function updateScrollState() {
    const scrollTop = window.scrollY || root.scrollTop;
    const scrollable = root.scrollHeight - window.innerHeight;
    const headerThreshold = hero ? hero.offsetHeight - (header?.offsetHeight || 0) : 10;
    header?.classList.toggle('is-scrolled', scrollTop > headerThreshold);
    if (progressBar) {
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, scrollTop / scrollable)) : 0;
      progressBar.style.width = `${progress * 100}%`;
    }
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Copy command was rejected');
  }

  function initializeCopyButtons() {
    document.querySelectorAll('[data-copy-target]').forEach((button) => {
      let timer;
      button.addEventListener('click', async () => {
        const target = document.querySelector(button.dataset.copyTarget);
        if (!target) return;
        try {
          const commands = target.textContent.trim().replace(/^\$\s?/gm, '');
          await copyText(commands);
          button.classList.add('is-copied');
          window.clearTimeout(timer);
          timer = window.setTimeout(() => button.classList.remove('is-copied'), 1800);
        } catch (error) {
          console.warn('Unable to copy commands:', error);
        }
      });
    });
  }

  function initializeRevealAnimations() {
    const elements = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reducedMotion.matches) return;

    root.classList.add('reveal-enabled');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * .95 && rect.bottom > 0) {
        element.classList.add('is-visible');
      } else {
        observer.observe(element);
      }
    });

    reducedMotion.addEventListener?.('change', (event) => {
      if (event.matches) {
        root.classList.remove('reveal-enabled');
        elements.forEach((element) => element.classList.add('is-visible'));
        observer.disconnect();
      }
    });
  }

  function initializeActiveNavigation() {
    if (!('IntersectionObserver' in window)) return;
    const sections = [...document.querySelectorAll('main section[id]')];
    const links = [...document.querySelectorAll('.desktop-nav a[href^="#"]')];
    const byId = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]));
    const visible = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visible.set(entry.target.id, entry.intersectionRatio));
      const current = [...visible.entries()]
        .filter(([, ratio]) => ratio > 0)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      links.forEach((link) => link.classList.toggle('is-active', link === byId.get(current)));
    }, { rootMargin: '-18% 0px -58% 0px', threshold: [0, 0.1, 0.3, 0.6] });
    sections.forEach((section) => observer.observe(section));
  }

  function initializeDemo() {
    if (!demo || !demoButton) return;
    const routeCard = document.querySelector('.card-multipath');
    let isPaused = false;
    let demoVisible = true;
    let routeVisible = false;

    function render() {
      const canRun = !reducedMotion.matches && !document.hidden;
      demo.classList.toggle('is-running', canRun && demoVisible && !isPaused);
      routeCard?.classList.toggle('is-running', canRun && routeVisible);
      demoButton.setAttribute('aria-pressed', String(isPaused));
      const zhLabel = demoButton.querySelector('[data-demo-state-zh]');
      const enLabel = demoButton.querySelector('[data-demo-state-en]');
      if (zhLabel) zhLabel.textContent = isPaused ? copy.zh.play : copy.zh.pause;
      if (enLabel) enLabel.textContent = isPaused ? copy.en.play : copy.en.pause;
      updateLocalizedMetadata(currentLanguage());
    }

    demoButton.addEventListener('click', () => {
      isPaused = !isPaused;
      render();
    });
    document.addEventListener('visibilitychange', render);
    reducedMotion.addEventListener?.('change', render);

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.target === demo) demoVisible = entry.isIntersecting;
          if (entry.target === routeCard) routeVisible = entry.isIntersecting;
        });
        render();
      }, { threshold: 0.06 });
      observer.observe(demo);
      if (routeCard) observer.observe(routeCard);
    }
    render();
  }

  applyTheme(resolvedTheme());
  applyLanguage(storage.get('openrdma-language') === 'en' ? 'en' : 'zh');

  themeButton?.addEventListener('click', () => {
    applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
  });
  languageButton?.addEventListener('click', () => {
    applyLanguage(currentLanguage() === 'zh' ? 'en' : 'zh', true);
  });
  colorScheme.addEventListener?.('change', () => {
    if (!storage.get('openrdma-theme')) applyTheme(resolvedTheme());
  });

  menuButton?.addEventListener('click', toggleMenu);
  mobileNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) closeMenu();
    updateScrollState();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
  window.addEventListener('scroll', updateScrollState, { passive: true });
  updateScrollState();

  document.querySelectorAll('[data-current-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  initializeCopyButtons();
  initializeRevealAnimations();
  initializeActiveNavigation();
  initializeDemo();
})();
