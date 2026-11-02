(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('[data-header]');
  const progressBar = document.querySelector('.scroll-progress span');
  const themeButton = document.querySelector('[data-theme-toggle]');
  const languageButton = document.querySelector('[data-language-toggle]');
  const languageLabel = document.querySelector('[data-language-label]');
  const menuButton = document.querySelector('[data-menu-toggle]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  const architectureImage = document.querySelector('[data-architecture-image]');
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');

  const copy = {
    zh: {
      title: 'Open-RDMA | 开放网络，开放未来',
      description: 'Open-RDMA：面向 AI 基础设施的全栈开源 RDMA 硬件与软件实现。',
      theme: '切换深浅主题',
      menuOpen: '打开菜单',
      menuClose: '关闭菜单',
      copy: '复制快速开始命令'
    },
    en: {
      title: 'Open-RDMA | Open Network, Open Future',
      description: 'Open-RDMA is a full-stack open-source RDMA hardware and software implementation for AI infrastructure.',
      theme: 'Toggle color theme',
      menuOpen: 'Open menu',
      menuClose: 'Close menu',
      copy: 'Copy quick-start commands'
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
        // The selected mode still applies for the current page view.
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
    themeButton?.setAttribute('aria-label', text.theme);
    menuButton?.setAttribute('aria-label', menuButton.getAttribute('aria-expanded') === 'true' ? text.menuClose : text.menuOpen);
    document.querySelector('[data-copy-target]')?.setAttribute('aria-label', text.copy);
  }

  function applyLanguage(language, persist = false) {
    const normalized = language === 'en' ? 'en' : 'zh';
    root.dataset.lang = normalized;
    root.lang = normalized === 'zh' ? 'zh-CN' : 'en';
    if (languageLabel) languageLabel.textContent = normalized === 'zh' ? 'EN' : '中';
    languageButton?.setAttribute('aria-label', normalized === 'zh' ? 'Switch to English' : '切换到简体中文');
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
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    header?.classList.toggle('is-scrolled', scrollTop > 10);
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
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    root.classList.add('reveal-enabled');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.94 && rect.bottom > 0) {
        element.classList.add('is-visible');
      } else {
        observer.observe(element);
      }
    });
  }

  function initializeActiveNavigation() {
    if (!('IntersectionObserver' in window)) return;
    const sections = [...document.querySelectorAll('main section[id]')];
    const links = [...document.querySelectorAll('.desktop-nav a[href^="#"]')];
    if (!sections.length || !links.length) return;

    const byId = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]));
    const visible = new Map();
    const setActive = () => {
      const current = [...visible.entries()]
        .filter(([, ratio]) => ratio > 0)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      links.forEach((link) => link.classList.toggle('is-active', link === byId.get(current)));
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visible.set(entry.target.id, entry.intersectionRatio));
      setActive();
    }, { rootMargin: '-18% 0px -62% 0px', threshold: [0, 0.1, 0.3, 0.6] });

    sections.forEach((section) => observer.observe(section));
  }

  applyTheme(resolvedTheme());
  const savedLanguage = storage.get('openrdma-language');
  applyLanguage(savedLanguage === 'en' ? 'en' : 'zh');

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
    if (window.innerWidth > 820) closeMenu();
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
})();
