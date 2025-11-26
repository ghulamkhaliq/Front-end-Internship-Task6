

/* ---------- DOM helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------- Elements ---------- */
const navLinks = $$('.nav-link');
const hamburger = $('#hamburger');
const navList = $('#navList');
const header = $('#siteHeader') || document.querySelector('.site-header');

/* containers for dynamic content */
const servicesContainer = $('#servicesContainer');
const quotesContainer = $('#quotesContainer');
const postsContainer = $('#postsContainer');

/* contact form elements */
const contactForm = $('#contactForm');
const nameInput = contactForm ? $('#name', contactForm) : null;
const emailInput = contactForm ? $('#email', contactForm) : null;
const messageInput = contactForm ? $('#message', contactForm) : null;
const feedbackEl = contactForm ? $('#formFeedback', contactForm) : null;
const submitBtn = contactForm ? (contactForm.querySelector('button[type="submit"]') || $('#submitBtn')) : null;

/* ---------- Utilities ---------- */
function el(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v);
  });
  children.forEach(c => e.appendChild(c));
  return e;
}

function fmt(str) {
  return String(str || '');
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email || '').toLowerCase());
}

/* ---------- Dynamic Services (local JSON) ---------- */
async function loadServices() {
  if (!servicesContainer) return;
  try {
    const res = await fetch('data/services.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load services.json');
    const services = await res.json();

    servicesContainer.innerHTML = ''; // clear

    services.forEach((s, idx) => {
      const card = el('article', { class: 'service-card reveal' }, [
        el('div', { class: 'service-icon', text: s.icon || '🔧' }),
        el('h3', { text: s.title }),
        el('p', { text: s.desc })
      ]);
      // add small animation delay
      card.style.transitionDelay = `${idx * 80}ms`;
      servicesContainer.appendChild(card);
    });

    // re-init reveal observer on new elements
    initReveal();
  } catch (err) {
    console.error('loadServices error', err);
    servicesContainer.innerHTML = '<p class="muted">Unable to load services at the moment.</p>';
  }
}

/* ---------- Quotes from public API (Quotable) ---------- */
async function loadQuotes(limit = 3) {
  if (!quotesContainer) return;
  quotesContainer.innerHTML = '<p class="muted">Loading quotes...</p>';
  try {
    const urls = Array.from({ length: limit }, () => 'https://api.quotable.io/random');
    // fetch them in parallel
    const promises = urls.map(u => fetch(u).then(r => r.json()));
    const results = await Promise.all(promises);

    quotesContainer.innerHTML = '';
    results.forEach((q, i) => {
      const card = el('blockquote', { class: 'quote-card reveal' }, [
        el('p', { html: `“${fmt(q.content)}”` }),
        el('footer', { html: `— ${fmt(q.author)}` })
      ]);
      card.style.transitionDelay = `${i * 90}ms`;
      quotesContainer.appendChild(card);
    });

    initReveal();
  } catch (err) {
    console.error('loadQuotes error', err);
    quotesContainer.innerHTML = '<p class="muted">Could not fetch quotes right now.</p>';
  }
}

/* ---------- Demo Blog Posts (JSONPlaceholder) ---------- */
async function loadPosts(limit = 3) {
  if (!postsContainer) return;
  postsContainer.innerHTML = '<p class="muted">Loading posts...</p>';
  try {
    const res = await fetch(`https://jsonplaceholder.typicode.com/posts?_limit=${limit}`);
    if (!res.ok) throw new Error('Posts fetch error');
    const posts = await res.json();

    postsContainer.innerHTML = '';
    posts.forEach((p, i) => {
      // create a small card
      const card = el('a', { class: 'project-card reveal', href: '#', title: p.title }, [
        el('img', { src: `https://picsum.photos/seed/post-${p.id}/600/360`, alt: p.title }),
        el('div', { class: 'project-meta' }, [
          el('h4', { text: p.title }),
          el('p', { text: p.body.slice(0, 90) + '…' })
        ])
      ]);
      card.style.transitionDelay = `${i * 100}ms`;
      postsContainer.appendChild(card);
    });

    initReveal();
  } catch (err) {
    console.error('loadPosts error', err);
    postsContainer.innerHTML = '<p class="muted">Could not fetch posts.</p>';
  }
}

/* ---------- Improved nav behavior: sticky + scrollspy ---------- */
function initScrollSpy() {
  // if nav links point to same-page sections, use intersection observer
  const pageAnchors = $$('main section[id]');
  if (!pageAnchors.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      const link = document.querySelector(`.nav-link[href="#${id}"]`);
      if (!link) return;
      if (entry.isIntersecting) {
        $$('.nav-link').forEach(n => n.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { threshold: 0.55 });

  pageAnchors.forEach(s => observer.observe(s));
}

/* Smooth scrolling for in-page anchors */
function initAnchorSmoothScroll() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (ev) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        ev.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ---------- Reveal on scroll (IntersectionObserver) ---------- */
function initReveal() {
  const reveals = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    reveals.forEach(r => r.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(ent => {
      if (ent.isIntersecting) {
        ent.target.classList.add('visible');
        obs.unobserve(ent.target);
      }
    });
  }, { threshold: 0.12 });

  reveals.forEach(r => {
    if (!r.classList.contains('visible')) io.observe(r);
  });
}

/* ---------- Real-time form validation ---------- */
function initFormValidation() {
  if (!contactForm) return;

  // helper to show field-level hint
  function setFeedback(text = '', type = 'info') {
    if (!feedbackEl) return;
    feedbackEl.textContent = text;
    feedbackEl.style.color = type === 'success' ? 'green' : (type === 'error' ? '#d00' : 'inherit');
  }

  // validations on input
  const validators = {
    name: (v) => v && v.length >= 2,
    email: (v) => validateEmail(v),
    message: (v) => v && v.length >= 6
  };

  // realtime check
  [nameInput, emailInput, messageInput].forEach(input => {
    if (!input) return;
    input.addEventListener('input', () => {
      const id = input.id;
      const ok = validators[id] ? validators[id](input.value.trim()) : true;
      input.style.borderColor = ok ? '' : '#e84a4a';
    });
  });

  // submit handling (simulate sending)
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    setFeedback('');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const message = messageInput ? messageInput.value.trim() : '';

    if (!validators.name(name)) return setFeedback('Please enter your name (min 2 chars).', 'error');
    if (!validators.email(email)) return setFeedback('Please enter a valid email.', 'error');
    if (!validators.message(message)) return setFeedback('Message should be at least 6 characters.', 'error');

    // disable submit and show state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }

    // Optional: send to a mock endpoint (JSONPlaceholder) to demonstrate POST
    // But we will simulate here:
    setTimeout(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
      contactForm.reset();
      setFeedback('Message sent — thanks! I will reply soon.', 'success');

      // optionally show a subtle success toast
      showTempToast('Message sent');
    }, 1100);
  });
}

/* tiny toast for success */
function showTempToast(text = 'Done') {
  const t = el('div', { class: 'task-toast', text });
  Object.assign(t.style, {
    position: 'fixed', right: '20px', bottom: '20px', background: '#07263a', color: '#fff',
    padding: '10px 14px', borderRadius: '10px', zIndex: 1200, boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
  });
  document.body.appendChild(t);
  setTimeout(() => t.style.opacity = '0.01', 2200);
  setTimeout(() => t.remove(), 2600);
}

/* ---------- Hamburger (mobile) ---------- */
function initHamburger() {
  if (!hamburger || !navList) return;
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', open);
    if (navList.style.display === 'flex') {
      navList.style.display = '';
    } else {
      navList.style.display = 'flex';
      navList.style.flexDirection = 'column';
      navList.style.position = 'absolute';
      navList.style.right = '18px';
      navList.style.top = '56px';
      navList.style.background = '#fff';
      navList.style.padding = '12px';
      navList.style.borderRadius = '10px';
      navList.style.boxShadow = '0 12px 40px rgba(12,20,40,0.12)';
    }
  });

  // Close on nav item click on mobile
  $$('.nav-list a').forEach(a => a.addEventListener('click', () => {
    if (window.innerWidth < 700) {
      navList.style.display = '';
      hamburger.classList.remove('open');
    }
  }));
}

/* ---------- Initialize all features ---------- */
function initAll() {
  initHamburger();
  initAnchorSmoothScroll();
  initReveal();
  initScrollSpy();           // for same-page anchors (if used)
  initFormValidation();      // contact form real-time validation

  // dynamic loads (if containers exist)
  loadServices();
  loadQuotes(3);
  loadPosts(3);
}

/* run when DOM ready */
document.addEventListener('DOMContentLoaded', initAll);
