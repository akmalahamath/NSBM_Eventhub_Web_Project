/**
 * NSBM Event Hub - Master Frontend JavaScript (Emerald Prestige Edition)
 * Apple-Style Scroll-Driven Animation Suite, Scroll Progress Bar,
 * Theme Management, Toast Notifications, Modal Controls, Navbar Physics & Countdown Engine
 */

// Detect API base path relative to current HTML location
const getApiBase = () => {
    const path = window.location.pathname;
    if (path.includes('/admin/') || path.includes('/student/')) {
        return '../php/';
    }
    return 'php/';
};

const API_BASE = getApiBase();

// ==========================================================================
// THEME MANAGEMENT (EMERALD PRESTIGE DARK / LIGHT MODE)
// ==========================================================================
function initTheme() {
    const savedTheme = localStorage.getItem('nsbm_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcons(savedTheme);

    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('nsbm_theme', newTheme);
            updateThemeIcons(newTheme);
        });
    });
}

function updateThemeIcons(theme) {
    document.querySelectorAll('.theme-toggle-btn i').forEach(icon => {
        if (theme === 'light') {
            icon.className = 'bi bi-moon-stars-fill';
        } else {
            icon.className = 'bi bi-sun-fill';
        }
    });
}


// ==========================================================================
// APPLE-STYLE SCROLL-DRIVEN ANIMATION SUITE & PROGRESS BAR
// ==========================================================================
function initScrollProgress() {
    let progressBar = document.querySelector('.scroll-progress-bar');
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress-bar';
        document.body.prepend(progressBar);
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
                if (progressBar) {
                    progressBar.style.width = `${Math.min(100, Math.max(0, scrollPercent))}%`;
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

function initAppleScrollDriven() {
    const heroSection = document.querySelector('.hero-section');
    const heroBlobs = document.querySelectorAll('.hero-glow-blob');
    const header = document.querySelector('.site-header');

    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollY = window.scrollY;

                // 1. Dynamic Header Scroll State
                if (header) {
                    if (scrollY > 25) {
                        header.classList.add('scrolled');
                        header.style.boxShadow = '0 12px 32px rgba(4, 15, 11, 0.55)';
                        header.style.borderColor = 'rgba(251, 176, 45, 0.28)';
                    } else {
                        header.classList.remove('scrolled');
                        header.style.boxShadow = 'none';
                        header.style.borderColor = 'var(--border-glass)';
                    }
                }

                // 2. Apple-Style Parallax Hero Compression
                if (heroSection && scrollY < 900) {
                    const heroContent = heroSection.querySelector('.container');
                    if (heroContent) {
                        const compressionFactor = Math.max(0, 1 - (scrollY * 0.0009));
                        const translateY = scrollY * 0.22;
                        heroContent.style.transform = `translateY(${translateY}px) scale(${compressionFactor})`;
                        heroContent.style.opacity = `${Math.max(0.2, 1 - (scrollY * 0.0016))}`;
                    }
                }

                // 3. Multi-Speed Parallax Ambient Glow Blobs
                if (heroBlobs.length > 0) {
                    heroBlobs.forEach((blob, i) => {
                        const speed = (i + 1) * 0.15;
                        blob.style.transform = `translateY(${scrollY * speed}px)`;
                    });
                }

                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// Apple-Style Smooth Scroll Reveal Observer with Spring Physics
let globalScrollObserver = null;

function initScrollReveal() {
    const targets = document.querySelectorAll(
        '.reveal-on-scroll:not([data-observed]), .animate-fade-up:not([data-observed]), .stat-card:not([data-observed]), .event-card:not([data-observed]), .glass-panel:not([data-observed]), .glass-card:not([data-observed]), .section-header:not([data-observed]), .schedule-card:not([data-observed]), .feature-card:not([data-observed])'
    );

    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
        targets.forEach(el => {
            el.classList.add('revealed');
            el.setAttribute('data-observed', 'true');
        });
        return;
    }

    if (!globalScrollObserver) {
        globalScrollObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    el.classList.add('revealed');
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0) scale(1)';
                    el.style.filter = 'blur(0px)';
                    obs.unobserve(el);
                }
            });
        }, {
            threshold: 0.08,
            rootMargin: '0px 0px -40px 0px'
        });
    }

    targets.forEach((el, index) => {
        el.setAttribute('data-observed', 'true');
        el.classList.add('reveal-on-scroll');
        
        // Dynamic staggered entrance timing
        const staggerIndex = (index % 6);
        el.style.transitionDelay = `${staggerIndex * 0.07}s`;
        globalScrollObserver.observe(el);
    });
}

// Interactive 3D Apple-Style Card Sheen & Spotlight Glare Effect
function initCardSheenEffect() {
    const cards = document.querySelectorAll('.event-card:not([data-sheen-active]), .glass-card:not([data-sheen-active]), .stat-card:not([data-sheen-active]), .horizontal-card:not([data-sheen-active])');
    
    cards.forEach(card => {
        card.setAttribute('data-sheen-active', 'true');

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);

            if (window.matchMedia('(hover: hover) and (min-width: 992px)').matches) {
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -4.5;
                const rotateY = ((x - centerX) / centerX) * 4.5;

                card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-8px) scale(1.015)`;
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.removeProperty('--mouse-x');
            card.style.removeProperty('--mouse-y');
        });
    });
}

// Global exposure for dynamic async components
window.initScrollReveal = initScrollReveal;
window.initCardSheenEffect = initCardSheenEffect;

// ==========================================================================
// APPLE-STYLE PINNED STORYTELLING SHOWCASE
// ==========================================================================
function initStickyStorytelling() {
    const storySection = document.querySelector('.story-section');
    if (!storySection) return;

    const stepCards = storySection.querySelectorAll('.story-step-card');
    const stageViews = storySection.querySelectorAll('.story-stage-view');
    const deviceCanvas = storySection.querySelector('.story-device-canvas');

    if (!stepCards.length || !stageViews.length) return;

    function activateStage(stageIndex) {
        stepCards.forEach((card, i) => {
            if (i === stageIndex) {
                card.classList.add('is-active');
            } else {
                card.classList.remove('is-active');
            }
        });

        stageViews.forEach((view, i) => {
            if (i === stageIndex) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        if (deviceCanvas) {
            const tiltDeg = (stageIndex === 1 ? -3 : (stageIndex === 2 ? 3 : 0));
            deviceCanvas.style.transform = `perspective(1000px) rotateY(${tiltDeg}deg) rotateX(${stageIndex * 1.5}deg)`;
        }
    }

    if ('IntersectionObserver' in window) {
        const stepObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const stepIndex = parseInt(entry.target.getAttribute('data-step') || '0', 10);
                    activateStage(stepIndex);
                }
            });
        }, {
            threshold: 0.5,
            rootMargin: '-30px 0px -30px 0px'
        });

        stepCards.forEach(card => stepObserver.observe(card));
    }
}

// ==========================================================================
// SMOOTH NUMBER COUNT-UP PHYSICS ENGINE
// ==========================================================================
function initNumberCountUp() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    if (!counters.length) return;

    if (!('IntersectionObserver' in window)) {
        counters.forEach(counter => {
            counter.textContent = counter.getAttribute('data-target') || counter.textContent;
        });
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const rawTarget = el.getAttribute('data-target');
                const suffix = el.getAttribute('data-suffix') || '';
                const prefix = el.getAttribute('data-prefix') || '';
                const targetValue = parseFloat(rawTarget.replace(/,/g, ''));
                
                if (isNaN(targetValue)) return;

                const duration = 1600;
                const startTime = performance.now();

                function updateCount(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(1, elapsed / duration);
                    // Apple-style easeOutExpo curve
                    const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                    const currentVal = Math.floor(easeProgress * targetValue);

                    el.textContent = `${prefix}${currentVal.toLocaleString()}${suffix}`;

                    if (progress < 1) {
                        requestAnimationFrame(updateCount);
                    } else {
                        el.textContent = `${prefix}${targetValue.toLocaleString()}${suffix}`;
                    }
                }

                requestAnimationFrame(updateCount);
                obs.unobserve(el);
            }
        });
    }, { threshold: 0.3 });

    counters.forEach(c => observer.observe(c));
}

// ==========================================================================
// CIRCULAR SVG SCROLL-TO-TOP PROGRESS WIDGET
// ==========================================================================
function initCircularScrollWidget() {
    let widget = document.querySelector('.scroll-top-widget');
    if (!widget) {
        widget = document.createElement('div');
        widget.className = 'scroll-top-widget';
        widget.setAttribute('aria-label', 'Scroll to top');
        widget.innerHTML = `
            <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="23" class="progress-ring-circle" />
            </svg>
            <i class="bi bi-chevron-up scroll-top-icon"></i>
        `;
        document.body.appendChild(widget);
    }

    const circle = widget.querySelector('.progress-ring-circle');
    const circumference = 2 * Math.PI * 23;
    if (circle) {
        circle.style.strokeDasharray = `${circumference}`;
        circle.style.strokeDashoffset = `${circumference}`;
    }

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) : 0;

        if (circle) {
            circle.style.strokeDashoffset = `${circumference - (scrollPercent * circumference)}`;
        }

        if (scrollTop > 350) {
            widget.classList.add('show');
        } else {
            widget.classList.remove('show');
        }
    }, { passive: true });

    widget.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ==========================================================================
// HORIZONTAL SHOWCASE TRACK CONTROLS & DRAG PHYSICS
// ==========================================================================
function initHorizontalScrollTrack() {
    const track = document.querySelector('.horizontal-scroll-track');
    if (!track) return;

    const prevBtn = document.querySelector('.horizontal-nav-btn.prev');
    const nextBtn = document.querySelector('.horizontal-nav-btn.next');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            track.scrollBy({ left: -360, behavior: 'smooth' });
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            track.scrollBy({ left: 360, behavior: 'smooth' });
        });
    }

    let isDown = false;
    let startX;
    let scrollLeft;

    track.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - track.offsetLeft;
        scrollLeft = track.scrollLeft;
    });

    track.addEventListener('mouseleave', () => { isDown = false; });
    track.addEventListener('mouseup', () => { isDown = false; });

    track.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - track.offsetLeft;
        const walk = (x - startX) * 1.5;
        track.scrollLeft = scrollLeft - walk;
    });
}

// ==========================================================================
// MULTI-LAYER FLOATING PARALLAX BADGES
// ==========================================================================
function initParallaxBadges() {
    const badgeLeft = document.querySelector('.badge-pos-left');
    const badgeRight = document.querySelector('.badge-pos-right');

    if (!badgeLeft && !badgeRight) return;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        if (scrollY < 900) {
            if (badgeLeft) badgeLeft.style.transform = `translateY(${scrollY * -0.12}px)`;
            if (badgeRight) badgeRight.style.transform = `translateY(${scrollY * 0.14}px)`;
        }
    }, { passive: true });
}

// ==========================================================================
// TOAST NOTIFICATION ENGINE
// ==========================================================================
function createToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(type, title, message, duration = 4000) {
    const container = createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    let iconClass = 'bi-info-circle-fill';
    if (type === 'success') iconClass = 'bi-check-circle-fill';
    else if (type === 'error') iconClass = 'bi-x-circle-fill';
    else if (type === 'warning') iconClass = 'bi-exclamation-triangle-fill';

    toast.innerHTML = `
        <i class="bi ${iconClass} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${escapeHTML(title)}</div>
            <div class="toast-message">${escapeHTML(message)}</div>
        </div>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 450);
    }, duration);
}

// ==========================================================================
// MODAL CONTROLS
// ==========================================================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function initModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay.id);
            }
        });
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) closeModal(modal.id);
        });
    });
}

// ==========================================================================
// MOBILE MENU & NAVBAR CONTROLS
// ==========================================================================
function initNavbar() {
    const hamburger = document.querySelector('.nav-hamburger');
    const navMenu = document.querySelector('.navbar-nav');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu on link click
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

// ==========================================================================
// GLOBAL AUTH STATE & NAVIGATION SYNC
// ==========================================================================
async function syncGlobalAuthState() {
    try {
        const res = await fetch(`${API_BASE}auth/check_session.php`);
        const json = await res.json();

        const authButtonsContainer = document.getElementById('navAuthActions');
        if (!authButtonsContainer) return;

        const isInsideSubdir = window.location.pathname.includes('/student/') || window.location.pathname.includes('/admin/');
        const rootPrefix = isInsideSubdir ? '../' : '';

        if (json.success && json.data.authenticated) {
            const user = json.data.user;
            const portalUrl = user.role === 'admin' ? `${rootPrefix}admin/dashboard.html` : `${rootPrefix}student/dashboard.html`;

            authButtonsContainer.innerHTML = `
                <a href="${portalUrl}" class="btn btn-secondary btn-sm btn-pill">
                    <i class="bi bi-person-circle"></i> ${escapeHTML(user.full_name.split(' ')[0])}
                </a>
                <button onclick="handleGlobalLogout()" class="btn btn-glass btn-sm" title="Logout">
                    <i class="bi bi-box-arrow-right"></i>
                </button>
            `;
        } else {
            authButtonsContainer.innerHTML = `
                <a href="${rootPrefix}login.html" class="btn btn-secondary btn-sm">Login</a>
                <a href="${rootPrefix}register.html" class="btn btn-primary btn-sm">Register</a>
            `;
        }
    } catch (err) {
        console.error('Session sync error:', err);
    }
}

async function handleGlobalLogout() {
    try {
        const res = await fetch(`${API_BASE}auth/logout.php`, { method: 'POST' });
        const json = await res.json();
        showToast('success', 'Logged Out', 'You have been successfully logged out.');
        
        const isInsideSubdir = window.location.pathname.includes('/student/') || window.location.pathname.includes('/admin/');
        const redirectUrl = isInsideSubdir ? '../login.html' : 'login.html';
        
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 800);
    } catch (err) {
        console.error('Logout error:', err);
    }
}

// ==========================================================================
// COUNTDOWN TIMER ENGINE
// ==========================================================================
function startCountdown(targetDateTime, containerEl) {
    if (!containerEl) return;

    const target = new Date(targetDateTime).getTime();

    function update() {
        const now = new Date().getTime();
        const diff = target - now;

        if (diff <= 0) {
            containerEl.innerHTML = '<span class="text-primary font-bold" style="font-size:1.1rem;"><i class="bi bi-broadcast"></i> Event is Live Now!</span>';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const pad = (n) => String(n).padStart(2, '0');

        containerEl.innerHTML = `
            <div class="countdown-unit">
                <span class="countdown-num">${pad(days)}</span>
                <span class="countdown-lbl">Days</span>
            </div>
            <span class="countdown-divider">:</span>
            <div class="countdown-unit">
                <span class="countdown-num">${pad(hours)}</span>
                <span class="countdown-lbl">Hours</span>
            </div>
            <span class="countdown-divider">:</span>
            <div class="countdown-unit">
                <span class="countdown-num">${pad(minutes)}</span>
                <span class="countdown-lbl">Mins</span>
            </div>
            <span class="countdown-divider">:</span>
            <div class="countdown-unit">
                <span class="countdown-num">${pad(seconds)}</span>
                <span class="countdown-lbl">Secs</span>
            </div>
        `;
    }

    update();
    return setInterval(update, 1000);
}

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
}

async function populateCategoryDropdown(selectEl) {
    if (!selectEl) return;
    try {
        const res = await fetch(`${API_BASE}categories/read.php`);
        const json = await res.json();
        if (json.success && json.data && json.data.categories) {
            const currentVal = selectEl.value;
            selectEl.innerHTML = `<option value="0">All Categories</option>` +
                json.data.categories.map(c => `<option value="${c.id}">${escapeHTML(c.name)} (${c.upcoming_events || 0} events)</option>`).join('');
            if (currentVal) selectEl.value = currentVal;
        }
    } catch (e) {
        console.error('Populate categories dropdown error:', e);
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initScrollProgress();
    initCircularScrollWidget();
    initNavbar();
    initModals();
    initScrollReveal();
    initAppleScrollDriven();
    initCardSheenEffect();
    initStickyStorytelling();
    initNumberCountUp();
    initHorizontalScrollTrack();
    initParallaxBadges();
    syncGlobalAuthState();
});

 