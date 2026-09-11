/**
 * NSBM Event Hub - Event Discovery, Details, Search & Multi-Filter Logic
 */

// ==========================================================================
// REUSABLE EVENT CARD COMPONENT RENDERER
// ==========================================================================
function renderEventCardHTML(event) {
    const isInsideSubdir = window.location.pathname.includes('/student/') || window.location.pathname.includes('/admin/');
    const detailsPath = isInsideSubdir ? `../event-details.html?id=${event.id}` : `event-details.html?id=${event.id}`;
    
    // Capacity calculations
    const registered = parseInt(event.registered_count, 10) || 0;
    const max = parseInt(event.max_participants, 10) || 100;
    const percent = Math.min(100, Math.round((registered / max) * 100));
    
    let progressClass = '';
    let capacityBadge = `${registered} / ${max} Seats`;
    if (percent >= 100) {
        progressClass = 'full';
        capacityBadge = 'Event Full';
    } else if (percent >= 80) {
        progressClass = 'almost-full';
        capacityBadge = `Almost Full (${max - registered} left)`;
    }

    // Status Badge
    let statusBadgeClass = 'status-upcoming';
    if (event.status === 'ongoing') statusBadgeClass = 'status-ongoing';
    else if (event.status === 'completed') statusBadgeClass = 'status-completed';
    else if (event.status === 'cancelled') statusBadgeClass = 'status-cancelled';

    // Resolve image URL: uploaded images are stored as relative paths like 'uploads/events/x.jpg'
    // We need to prefix '../' if we're inside /admin/ or /student/
    function resolveImageUrl(imagePath) {
        if (!imagePath) return null;
        // If it's already an absolute URL (http/https), return as-is
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
        // If it's a relative path (uploaded file), resolve from site root
        const isSubdir = window.location.pathname.includes('/student/') || window.location.pathname.includes('/admin/');
        return isSubdir ? '../' + imagePath : imagePath;
    }

    const fallbackImg = '../uploads/events/.fallback';
    const imgSrc = resolveImageUrl(event.image);

    return `
        <div class="event-card animate-fade-up">
            <div class="event-card-img-wrapper">
                <img src="${imgSrc ? escapeHTML(imgSrc) : ''}" alt="${escapeHTML(event.title)}" class="event-card-img" onerror="this.parentElement.style.background='linear-gradient(135deg,#081C15,#1B4332)';this.style.display='none'" ${!imgSrc ? 'style="display:none"' : ''}>
                <div class="event-badge-category">
                    <i class="bi ${event.category_icon || 'bi-tag'}"></i>
                    ${escapeHTML(event.category_name || 'General')}
                </div>
                <div class="event-badge-status ${statusBadgeClass}">
                    ${escapeHTML(event.status)}
                </div>
            </div>
            
            <div class="event-card-body">
                <div class="event-card-date">
                    <i class="bi bi-calendar-event"></i>
                    ${formatDate(event.event_date)} &bull; ${formatTime(event.start_time)}
                </div>
                
                <h3 class="event-card-title">
                    <a href="${detailsPath}">${escapeHTML(event.title)}</a>
                </h3>
                
                <p class="event-card-desc">${escapeHTML(event.description)}</p>
                
                <div class="event-meta-info">
                    <div class="event-meta-item">
                        <i class="bi bi-geo-alt"></i>
                        <span>${escapeHTML(event.venue)}</span>
                    </div>
                    <div class="event-meta-item">
                        <i class="bi bi-person-badge"></i>
                        <span>${escapeHTML(event.organizer)}</span>
                    </div>
                </div>
                
                <!-- Capacity Progress Indicator -->
                <div class="capacity-container">
                    <div class="capacity-header">
                        <span class="text-secondary"><i class="bi bi-people"></i> Capacity</span>
                        <span class="font-bold ${percent >= 90 ? 'text-danger' : 'text-primary'}">${capacityBadge} (${percent}%)</span>
                    </div>
                    <div class="capacity-bar">
                        <div class="capacity-progress ${progressClass}" style="width: ${percent}%;"></div>
                    </div>
                </div>
                
                <div class="event-card-footer">
                    <a href="${detailsPath}" class="btn btn-secondary btn-sm">
                        View Details <i class="bi bi-arrow-right"></i>
                    </a>
                    ${event.is_user_registered ? 
                        `<span class="badge" style="background: rgba(82, 183, 136, 0.2); color: #52B788; border: 1px solid rgba(82, 183, 136, 0.4); padding: 0.4rem 0.85rem; border-radius: 9999px; font-weight:700; font-size:0.8rem;">
                            <i class="bi bi-check-circle-fill"></i> Registered
                         </span>` : 
                        (percent >= 100 ? 
                            `<span class="btn btn-glass btn-sm disabled" style="opacity:0.6;">Full</span>` : 
                            `<a href="${detailsPath}#register" class="btn btn-primary btn-sm">Register Now</a>`
                        )
                    }
                </div>
            </div>
        </div>
    `;
}

// ==========================================================================
// FEATURED EVENTS LOADER (HOMEPAGE)
// ==========================================================================
async function loadFeaturedEvents(containerId = 'featuredEventsGrid') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-img"></div>
    `;

    try {
        const response = await fetch(`${API_BASE}events/read.php?limit=6&status=upcoming&sort=date_asc`);
        const result = await response.json();

        if (result.success && result.data.events && result.data.events.length > 0) {
            container.innerHTML = result.data.events.map(renderEventCardHTML).join('');
            if (window.initScrollReveal) window.initScrollReveal();
            if (window.initCardSheenEffect) window.initCardSheenEffect();
            
            // If home countdown box exists, start countdown to the nearest event
            const nearestEvent = result.data.events[0];
            const countdownEl = document.getElementById('homeNextEventCountdown');
            if (countdownEl && nearestEvent) {
                const targetDateTime = `${nearestEvent.event_date}T${nearestEvent.start_time}`;
                startCountdown(targetDateTime, countdownEl);

                const eventTitleEl = document.getElementById('homeNextEventTitle');
                if (eventTitleEl) eventTitleEl.textContent = nearestEvent.title;
            }
        } else {
            container.innerHTML = `
                <div class="glass-panel text-center" style="grid-column: 1 / -1; padding: 3rem;">
                    <i class="bi bi-calendar-x" style="font-size: 3rem; color: var(--text-muted);"></i>
                    <h4 style="margin-top: 1rem;">No Upcoming Events Found</h4>
                    <p class="text-secondary">Check back soon for new university workshops, competitions, and seminars.</p>
                </div>
            `;
        }
    } catch (err) {
        console.error('Featured events load error:', err);
        container.innerHTML = `<div class="alert text-danger">Failed to load events.</div>`;
    }
}

// ==========================================================================
// FULL EVENTS DIRECTORY WITH MULTI-FILTER & SEARCH
// ==========================================================================
async function initEventsDirectory() {
    const container = document.getElementById('eventsDirectoryGrid');
    if (!container) return;

    const searchInput = document.getElementById('eventSearchInput');
    const categorySelect = document.getElementById('eventCategoryFilter');
    const statusSelect = document.getElementById('eventStatusFilter');
    const timeSelect = document.getElementById('eventTimeFilter');
    const sortSelect = document.getElementById('eventSortFilter');
    const resultsCountEl = document.getElementById('eventsCountDisplay');

    // Load category options into dropdown
    await populateCategoryDropdown(categorySelect);

    async function fetchAndRender() {
        container.innerHTML = `
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton skeleton-img"></div>
        `;

        const search = searchInput ? searchInput.value.trim() : '';
        const categoryId = categorySelect ? categorySelect.value : '0';
        const status = statusSelect ? statusSelect.value : 'all';
        const timeFilter = timeSelect ? timeSelect.value : 'all';
        const sort = sortSelect ? sortSelect.value : 'date_asc';

        const params = new URLSearchParams({
            search,
            category_id: categoryId,
            status,
            time_filter: timeFilter,
            sort,
            limit: 50
        });

        try {
            const response = await fetch(`${API_BASE}events/read.php?${params.toString()}`);
            const result = await response.json();

            if (result.success && result.data.events && result.data.events.length > 0) {
                container.innerHTML = result.data.events.map(renderEventCardHTML).join('');
                if (window.initScrollReveal) window.initScrollReveal();
                if (window.initCardSheenEffect) window.initCardSheenEffect();
                if (resultsCountEl) {
                    resultsCountEl.textContent = `Showing ${result.data.events.length} event(s)`;
                }
            } else {
                container.innerHTML = `
                    <div class="glass-panel text-center" style="grid-column: 1 / -1; padding: 4rem 2rem;">
                        <i class="bi bi-search" style="font-size: 3rem; color: var(--text-muted);"></i>
                        <h3 style="margin-top: 1rem;">No matching events found</h3>
                        <p class="text-secondary">Try adjusting your keyword search, category, or date filters.</p>
                        <button onclick="resetEventFilters()" class="btn btn-secondary btn-sm" style="margin-top: 1rem;">
                            <i class="bi bi-arrow-counterclockwise"></i> Reset Filters
                        </button>
                    </div>
                `;
                if (resultsCountEl) resultsCountEl.textContent = '0 events found';
            }
        } catch (err) {
            console.error('Directory fetch error:', err);
            container.innerHTML = `<div class="alert text-danger">Failed to load events.</div>`;
        }
    }

    // Debounce search input
    let debounceTimer;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(fetchAndRender, 350);
        });
    }

    // Dropdown filters trigger immediate reload
    [categorySelect, statusSelect, timeSelect, sortSelect].forEach(select => {
        if (select) {
            select.addEventListener('change', fetchAndRender);
        }
    });

    // Check if category ID was passed via URL query
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('category') && categorySelect) {
        categorySelect.value = urlParams.get('category');
    }
    if (urlParams.has('search') && searchInput) {
        searchInput.value = urlParams.get('search');
    }

    window.resetEventFilters = () => {
        if (searchInput) searchInput.value = '';
        if (categorySelect) categorySelect.value = '0';
        if (statusSelect) statusSelect.value = 'all';
        if (timeSelect) timeSelect.value = 'all';
        if (sortSelect) sortSelect.value = 'date_asc';
        fetchAndRender();
    };

    fetchAndRender();
}

async function populateCategoryDropdown(selectEl) {
    if (!selectEl) return;
    try {
        const res = await fetch(`${API_BASE}categories/read.php`);
        const json = await res.json();
        if (json.success && json.data.categories) {
            const currentVal = selectEl.value;
            selectEl.innerHTML = `<option value="0">All Categories</option>` +
                json.data.categories.map(c => `<option value="${c.id}">${escapeHTML(c.name)} (${c.upcoming_events} events)</option>`).join('');
            selectEl.value = currentVal;
        }
    } catch (e) {
        console.error('Populate categories error:', e);
    }
}

// ==========================================================================
// SINGLE EVENT DETAILS PAGE LOADER
// ==========================================================================
async function loadSingleEventDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        window.location.href = 'events.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}events/read.php?id=${eventId}`);
        const result = await response.json();

        if (!result.success || !result.data) {
            document.getElementById('eventDetailsContainer').innerHTML = `
                <div class="glass-panel text-center" style="padding: 4rem;">
                    <h3>Event Not Found</h3>
                    <p class="text-secondary">The requested event may have been removed or does not exist.</p>
                    <a href="events.html" class="btn btn-primary" style="margin-top: 1rem;">Back to Events</a>
                </div>
            `;
            return;
        }

        const event = result.data;

        // Populate elements
        document.title = `${event.title} — NSBM Event Hub`;
        
        const titleEl = document.getElementById('eventTitle');
        if (titleEl) titleEl.textContent = event.title;

        const categoryEl = document.getElementById('eventCategory');
        if (categoryEl) {
            categoryEl.innerHTML = `<i class="bi ${event.category_icon || 'bi-tag'}"></i> ${escapeHTML(event.category_name || 'General')}`;
        }

        const statusEl = document.getElementById('eventStatus');
        if (statusEl) {
            statusEl.textContent = event.status.toUpperCase();
            statusEl.className = `event-badge-status status-${event.status}`;
        }

        const descEl = document.getElementById('eventDescription');
        if (descEl) descEl.textContent = event.description;

        const dateEl = document.getElementById('eventDate');
        if (dateEl) dateEl.textContent = formatDate(event.event_date);

        const timeEl = document.getElementById('eventTime');
        if (timeEl) timeEl.textContent = `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`;

        const venueEl = document.getElementById('eventVenue');
        if (venueEl) venueEl.textContent = event.venue;

        const organizerEl = document.getElementById('eventOrganizer');
        if (organizerEl) organizerEl.textContent = event.organizer;

        const deadlineEl = document.getElementById('eventDeadline');
        if (deadlineEl) deadlineEl.textContent = formatDate(event.registration_deadline);

        const bannerImg = document.getElementById('eventBannerImg');
        if (bannerImg) {
            if (event.image) {
                // Resolve relative uploaded images vs absolute URLs
                const isSubdir = window.location.pathname.includes('/student/') || window.location.pathname.includes('/admin/');
                const imgSrc = (event.image.startsWith('http://') || event.image.startsWith('https://'))
                    ? event.image
                    : (isSubdir ? '../' + event.image : event.image);
                bannerImg.src = imgSrc;
                bannerImg.onerror = () => { bannerImg.parentElement && (bannerImg.parentElement.style.background = 'linear-gradient(135deg, #0f1729, #1e3a5f)'); bannerImg.style.display='none'; };
            } else {
                // No image: hide banner or show gradient placeholder
                bannerImg.style.display = 'none';
            }
        }

        // Capacity Progress
        const registered = parseInt(event.registered_count, 10) || 0;
        const max = parseInt(event.max_participants, 10) || 100;
        const percent = Math.min(100, Math.round((registered / max) * 100));

        const capTextEl = document.getElementById('eventCapacityText');
        if (capTextEl) capTextEl.textContent = `${registered} / ${max} Registered (${percent}%)`;

        const capBarEl = document.getElementById('eventCapacityProgressBar');
        if (capBarEl) {
            capBarEl.style.width = `${percent}%`;
            if (percent >= 100) capBarEl.className = 'capacity-progress full';
            else if (percent >= 80) capBarEl.className = 'capacity-progress almost-full';
        }

        // Live Countdown
        const countdownContainer = document.getElementById('eventDetailsCountdown');
        if (countdownContainer) {
            startCountdown(`${event.event_date}T${event.start_time}`, countdownContainer);
        }

        // Setup Registration CTA Button
        const registerContainer = document.getElementById('eventRegistrationCTA');
        if (registerContainer) {
            if (event.is_user_registered) {
                registerContainer.innerHTML = `
                    <div class="glass-panel text-center" style="background: rgba(82, 183, 136, 0.15); border: 1px solid rgba(82, 183, 136, 0.4); box-shadow: var(--shadow-glow-emerald);">
                        <i class="bi bi-check-circle-fill text-success" style="font-size: 2.5rem;"></i>
                        <h4 style="margin: 0.5rem 0;">You are Registered!</h4>
                        <p class="text-secondary" style="font-size: 0.9rem;">Ticket Code: <strong class="text-primary font-mono">${escapeHTML(event.user_ticket_code || 'TKT-CONFIRMED')}</strong></p>
                        <a href="student/my-events.html" class="btn btn-success btn-sm btn-pill" style="margin-top: 0.5rem;">
                            <i class="bi bi-qr-code"></i> View Ticket Pass
                        </a>
                    </div>
                `;
            } else if (event.is_full) {
                registerContainer.innerHTML = `
                    <div class="glass-panel text-center">
                        <i class="bi bi-exclamation-octagon text-danger" style="font-size: 2rem;"></i>
                        <h4 style="margin: 0.5rem 0;">Event is Full</h4>
                        <p class="text-secondary">Maximum capacity of ${max} students has been reached.</p>
                    </div>
                `;
            } else if (event.is_deadline_passed) {
                registerContainer.innerHTML = `
                    <div class="glass-panel text-center">
                        <i class="bi bi-clock-history text-warning" style="font-size: 2rem;"></i>
                        <h4 style="margin: 0.5rem 0;">Registration Closed</h4>
                        <p class="text-secondary">Deadline was ${formatDate(event.registration_deadline)}.</p>
                    </div>
                `;
            } else {
                registerContainer.innerHTML = `
                    <button onclick="handleEventRegistrationClick(${event.id}, '${escapeHTML(event.title)}')" class="btn btn-primary btn-lg" style="width: 100%;">
                        <i class="bi bi-ticket-perforated"></i> Register for this Event
                    </button>
                `;
            }
        }

    } catch (err) {
        console.error('Load single event error:', err);
    }
}
