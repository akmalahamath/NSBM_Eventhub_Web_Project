/**
 * NSBM Event Hub - Event Registration, Ticket Generation & Schedule Logic
 */

// Handle registration click from event details or cards
async function handleEventRegistrationClick(eventId, eventTitle) {
    // 1. Verify authentication
    try {
        const sessionRes = await fetch(`${API_BASE}auth/check_session.php`);
        const sessionData = await sessionRes.json();

        if (!sessionData.success || !sessionData.data.authenticated) {
            showToast('warning', 'Login Required', 'Please sign in or create an account to register for events.');
            setTimeout(() => {
                const isInsideSubdir = window.location.pathname.includes('/student/') || window.location.pathname.includes('/admin/');
                window.location.href = isInsideSubdir ? '../login.html' : 'login.html';
            }, 1200);
            return;
        }

        const user = sessionData.data.user;
        if (user.role !== 'student') {
            showToast('error', 'Student Account Required', 'Only registered students can claim event tickets.');
            return;
        }

        // 2. Submit Registration Request
        const regRes = await fetch(`${API_BASE}registrations/register.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_id: eventId })
        });

        const regData = await regRes.json();

        if (regData.success) {
            showToast('success', 'Pass Confirmed!', regData.message);
            
            // Render and open Digital Ticket Pass Modal
            showTicketPassModal({
                ticketCode: regData.data.ticket_code,
                eventTitle: regData.data.event_title || eventTitle,
                eventDate: regData.data.event_date,
                venue: regData.data.venue,
                studentName: user.full_name,
                studentId: user.student_id
            });

            // Reload event details or registration list if available
            if (typeof loadSingleEventDetails === 'function') {
                loadSingleEventDetails();
            }
        } else {
            showToast('error', 'Registration Failed', regData.message || 'Unable to register.');
        }

    } catch (err) {
        console.error('Registration trigger error:', err);
        showToast('error', 'Network Error', 'Could not complete registration.');
    }
}

// ==========================================================================
// DIGITAL TICKET PASS MODAL WITH REAL QR CODE
// ==========================================================================
function showTicketPassModal(ticket) {
    let modal = document.getElementById('ticketPassModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ticketPassModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 480px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="bi bi-qr-code text-primary"></i> Digital Event Pass</h3>
                    <button class="modal-close-btn" data-close-modal>&times;</button>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    <div class="ticket-card">
                        <div class="ticket-header-logo">
                            <i class="bi bi-shield-check"></i> NSBM GREEN UNIVERSITY
                        </div>
                        <h4 id="ticketEventTitle" style="font-size: 1.25rem; margin-bottom: 0.5rem; color: #fff;"></h4>
                        <p id="ticketEventMeta" class="text-secondary" style="font-size: 0.9rem; margin-bottom: 1rem;"></p>
                        
                        <div id="ticketQrWrapper" class="ticket-qr-box"></div>
                        
                        <div id="ticketCodeDisplay" class="ticket-code-text"></div>
                        
                        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.15); display: flex; justify-content: space-between; font-size: 0.85rem;">
                            <div style="text-align: left;">
                                <div class="text-secondary">Student</div>
                                <strong id="ticketStudentName" class="text-white"></strong>
                            </div>
                            <div style="text-align: right;">
                                <div class="text-secondary">Student ID</div>
                                <strong id="ticketStudentId" class="text-white"></strong>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="justify-content: space-between;">
                    <button class="btn btn-secondary btn-sm" onclick="window.print()">
                        <i class="bi bi-printer"></i> Print Pass
                    </button>
                    <button class="btn btn-primary btn-sm" data-close-modal>
                        Done
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        initModals();
    }

    // Fill details
    document.getElementById('ticketEventTitle').textContent = ticket.eventTitle || 'University Event';
    document.getElementById('ticketEventMeta').innerHTML = `<i class="bi bi-calendar-check"></i> ${formatDate(ticket.eventDate)} &bull; ${ticket.venue || 'NSBM Campus'}`;
    document.getElementById('ticketCodeDisplay').textContent = ticket.ticketCode;
    document.getElementById('ticketStudentName').textContent = ticket.studentName || 'Student';
    document.getElementById('ticketStudentId').textContent = ticket.studentId || 'NSBM Student';

    // Generate Dynamic QR Code
    const qrContainer = document.getElementById('ticketQrWrapper');
    qrContainer.innerHTML = '';
    if (window.QRCode) {
        new QRCode(qrContainer, {
            text: JSON.stringify({
                ticket: ticket.ticketCode,
                event: ticket.eventTitle,
                student: ticket.studentId
            }),
            width: 160,
            height: 160,
            colorDark: '#081C15',
            colorLight: '#ffffff'
        });
    }

    openModal('ticketPassModal');
}

// ==========================================================================
// MY REGISTERED EVENTS (STUDENT PORTAL)
// ==========================================================================
async function loadMyRegisteredEvents(statusFilter = 'all') {
    const container = document.getElementById('myEventsList');
    if (!container) return;

    container.innerHTML = `
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-img"></div>
    `;

    try {
        const response = await fetch(`${API_BASE}registrations/read.php?status=${statusFilter}`);
        const result = await response.json();

        if (result.success && result.data.registrations && result.data.registrations.length > 0) {
            container.innerHTML = result.data.registrations.map(reg => {
                const isConfirmed = reg.registration_status === 'confirmed';
                return `
                    <div class="glass-card animate-fade-up" style="display: flex; flex-direction: row; gap: 1.5rem; padding: 1.5rem; align-items: center; flex-wrap: wrap;">
                        <img src="${escapeHTML(reg.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80')}" 
                             style="width: 130px; height: 100px; object-fit: cover; border-radius: var(--radius-md);" 
                             alt="${escapeHTML(reg.title)}">
                        
                        <div style="flex: 1; min-width: 250px;">
                            <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem;">
                                <span class="badge" style="background: rgba(8, 28, 21, 0.85); border: 1px solid var(--border-glass-gold); color: #FBB02D; padding: 0.3rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">
                                    ${escapeHTML(reg.category_name || 'Event')}
                                </span>
                                <span class="badge ${isConfirmed ? 'status-upcoming' : 'status-cancelled'}" style="padding: 0.25rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
                                    ${escapeHTML(reg.registration_status.toUpperCase())}
                                </span>
                            </div>
                            
                            <h4 style="margin-bottom: 0.4rem; font-size: 1.15rem;">
                                <a href="../event-details.html?id=${reg.event_id}">${escapeHTML(reg.title)}</a>
                            </h4>
                            
                            <div class="text-secondary" style="font-size: 0.85rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                                <span><i class="bi bi-calendar-event text-primary"></i> ${formatDate(reg.event_date)} &bull; ${formatTime(reg.start_time)}</span>
                                <span><i class="bi bi-geo-alt text-primary"></i> ${escapeHTML(reg.venue)}</span>
                                <span><i class="bi bi-ticket-perforated text-success"></i> Ticket: <strong class="text-white">${escapeHTML(reg.ticket_code)}</strong></span>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 0.75rem; align-items: center;">
                            ${isConfirmed ? `
                                <button onclick="showTicketPassModal({
                                    ticketCode: '${reg.ticket_code}',
                                    eventTitle: '${escapeHTML(reg.title)}',
                                    eventDate: '${reg.event_date}',
                                    venue: '${escapeHTML(reg.venue)}'
                                })" class="btn btn-primary btn-sm">
                                    <i class="bi bi-qr-code"></i> View Ticket
                                </button>
                                <button onclick="handleCancelRegistration(${reg.registration_id}, '${escapeHTML(reg.title)}')" class="btn btn-danger btn-sm">
                                    <i class="bi bi-x-circle"></i> Cancel
                                </button>
                            ` : `
                                <span class="text-muted" style="font-size: 0.85rem;"><i class="bi bi-slash-circle"></i> Cancelled</span>
                            `}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="glass-panel text-center" style="padding: 3rem;">
                    <i class="bi bi-calendar-check" style="font-size: 3rem; color: var(--text-muted);"></i>
                    <h4 style="margin-top: 1rem;">No Registered Events Found</h4>
                    <p class="text-secondary">Explore upcoming university events and register for workshops, hackathons, and fairs.</p>
                    <a href="../events.html" class="btn btn-primary btn-sm" style="margin-top: 1rem;">Browse Events</a>
                </div>
            `;
        }
    } catch (err) {
        console.error('My events fetch error:', err);
    }
}

async function handleCancelRegistration(regId, eventTitle) {
    if (!confirm(`Are you sure you want to cancel your registration for "${eventTitle}"? Your reserved seat will be released.`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}registrations/cancel.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registration_id: regId })
        });

        const json = await res.json();
        if (json.success) {
            showToast('success', 'Registration Cancelled', json.message);
            loadMyRegisteredEvents();
        } else {
            showToast('error', 'Cancellation Error', json.message);
        }
    } catch (e) {
        console.error('Cancel reg error:', e);
    }
}

// ==========================================================================
// PERSONAL SCHEDULE / TIMELINE VIEW (STUDENT PORTAL)
// ==========================================================================
async function loadPersonalSchedule() {
    const container = document.getElementById('personalScheduleContainer');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}registrations/read.php?status=confirmed&time_filter=upcoming`);
        const result = await response.json();

        if (result.success && result.data.registrations && result.data.registrations.length > 0) {
            container.innerHTML = `
                <div class="timeline" style="position: relative; padding-left: 2rem; border-left: 2px solid var(--border-glass-light);">
                    ${result.data.registrations.map(event => `
                        <div style="position: relative; margin-bottom: 2.5rem;" class="animate-fade-up">
                            <div style="position: absolute; left: -2.6rem; top: 0; width: 20px; height: 20px; border-radius: 50%; background: var(--primary); border: 4px solid var(--bg-base); box-shadow: 0 0 10px var(--primary);"></div>
                            <div class="glass-card" style="padding: 1.5rem;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                                    <span class="badge" style="background: rgba(82, 183, 136, 0.2); color: #52B788; border: 1px solid rgba(82, 183, 136, 0.4); font-weight: 700; padding: 0.4rem 0.85rem; border-radius: 9999px;">
                                        <i class="bi bi-clock"></i> ${formatDate(event.event_date)} @ ${formatTime(event.start_time)}
                                    </span>
                                    <span class="text-secondary" style="font-size: 0.85rem;"><i class="bi bi-geo-alt"></i> ${escapeHTML(event.venue)}</span>
                                </div>
                                <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">
                                    <a href="../event-details.html?id=${event.event_id}">${escapeHTML(event.title)}</a>
                                </h3>
                                <p class="text-secondary" style="font-size: 0.9rem; margin-bottom: 1rem;">${escapeHTML(event.description)}</p>
                                <div style="display: flex; gap: 1rem; align-items: center;">
                                    <button onclick="showTicketPassModal({
                                        ticketCode: '${event.ticket_code}',
                                        eventTitle: '${escapeHTML(event.title)}',
                                        eventDate: '${event.event_date}',
                                        venue: '${escapeHTML(event.venue)}'
                                    })" class="btn btn-secondary btn-sm">
                                        <i class="bi bi-qr-code"></i> Show Ticket Pass
                                    </button>
                                    <span class="font-mono text-muted" style="font-size: 0.8rem;">Pass: ${event.ticket_code}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="glass-panel text-center" style="padding: 3rem;">
                    <i class="bi bi-calendar-event" style="font-size: 3rem; color: var(--text-muted);"></i>
                    <h4 style="margin-top: 1rem;">Your Schedule is Clear</h4>
                    <p class="text-secondary">You haven't registered for any upcoming events yet.</p>
                    <a href="../events.html" class="btn btn-primary btn-sm" style="margin-top: 1rem;">Explore Events</a>
                </div>
            `;
        }
    } catch (err) {
        console.error('Schedule fetch error:', err);
    }
}
