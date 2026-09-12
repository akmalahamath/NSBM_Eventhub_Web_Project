/**
 * NSBM Event Hub - Admin Command Center & Management JavaScript
 * Real MySQL Analytics, Chart.js Visualizations, CRUD Operations, and CSV Export
 */

// ==========================================================================
// ADMIN DASHBOARD ANALYTICS & CHARTS
// ==========================================================================
async function initAdminDashboard() {
    const admin = await enforceAuthGuard('admin');
    if (!admin) return;

    try {
        const response = await fetch(`${API_BASE}analytics/dashboard_stats.php`);
        const result = await response.json();

        if (!result.success) {
            showToast('error', 'Analytics Error', result.message);
            return;
        }

        const data = result.data;

        // 1. Populate Metric Cards
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('adminStatTotalEvents', data.stats.total_events);
        setVal('adminStatUpcomingEvents', data.stats.upcoming_events);
        setVal('adminStatTotalStudents', data.stats.total_students);
        setVal('adminStatTotalRegistrations', data.stats.total_registrations);
        setVal('adminStatTotalCategories', data.stats.total_categories);

        // 2. Render Charts if Chart.js is loaded
        if (window.Chart) {
            renderMonthlyRegistrationsChart(data.monthly_trends);
            renderCategoryDistributionChart(data.category_breakdown);
        }

        // 3. Render Recent Registrations Table
        const recentRegTable = document.getElementById('adminRecentRegistrationsTable');
        if (recentRegTable) {
            if (data.recent_registrations && data.recent_registrations.length > 0) {
                recentRegTable.innerHTML = data.recent_registrations.map(r => `
                    <tr>
                        <td><strong>${escapeHTML(r.student_name)}</strong><br><small class="text-muted">${escapeHTML(r.student_id || 'N/A')}</small></td>
                        <td>${escapeHTML(r.event_title)}</td>
                        <td><span class="font-mono text-primary">${escapeHTML(r.ticket_code)}</span></td>
                        <td>${formatDate(r.registration_date)}</td>
                        <td><span class="badge ${r.status === 'confirmed' ? 'status-upcoming' : 'status-cancelled'}" style="padding:0.25rem 0.6rem; border-radius:9999px; font-size:0.75rem;">${r.status.toUpperCase()}</span></td>
                    </tr>
                `).join('');
            } else {
                recentRegTable.innerHTML = `<tr><td colspan="5" class="text-center text-secondary py-3">No registrations logged yet.</td></tr>`;
            }
        }

        // 4. Render Popular Events Table
        const popularEventsTable = document.getElementById('adminPopularEventsTable');
        if (popularEventsTable) {
            if (data.popular_events && data.popular_events.length > 0) {
                popularEventsTable.innerHTML = data.popular_events.map(e => `
                    <tr>
                        <td><strong>${escapeHTML(e.title)}</strong></td>
                        <td><span class="badge" style="background:rgba(27,67,50,0.6); color:var(--primary); border:1px solid var(--border-glass-gold); padding:0.25rem 0.6rem; border-radius:9999px; font-size:0.75rem;">${escapeHTML(e.category_name || 'General')}</span></td>
                        <td>${formatDate(e.event_date)}</td>
                        <td><strong class="text-success">${e.registration_count}</strong> / ${e.max_participants}</td>
                    </tr>
                `).join('');
            } else {
                popularEventsTable.innerHTML = `<tr><td colspan="4" class="text-center text-secondary py-3">No events recorded.</td></tr>`;
            }
        }

    } catch (err) {
        console.error('Admin dashboard load error:', err);
    }
}

function renderMonthlyRegistrationsChart(trends) {
    const ctx = document.getElementById('chartMonthlyRegistrations');
    if (!ctx) return;

    const labels = trends.map(t => t.month_label);
    const counts = trends.map(t => t.total_count);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Student Registrations',
                data: counts,
                backgroundColor: 'rgba(251, 176, 45, 0.75)',
                borderColor: '#FBB02D',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(216, 243, 220, 0.08)' },
                    ticks: { color: '#95D5B2', stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#95D5B2' }
                }
            }
        }
    });
}

function renderCategoryDistributionChart(categories) {
    const ctx = document.getElementById('chartCategoryDistribution');
    if (!ctx) return;

    const labels = categories.map(c => c.category_name);
    const data = categories.map(c => c.event_count);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#FBB02D', '#52B788', '#2D6A4F', '#38BDF8', '#8B5CF6', '#F59E0B', '#EF4444'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#D8F3DC', boxWidth: 12, padding: 15 }
                }
            },
            cutout: '68%'
        }
    });
}

// ==========================================================================
// ADMIN EVENT CRUD OPERATIONS
// ==========================================================================
async function initAdminEvents() {
    const admin = await enforceAuthGuard('admin');
    if (!admin) return;

    const tableBody = document.getElementById('adminEventsTableBody');
    const searchInput = document.getElementById('adminEventSearch');
    const categorySelect = document.getElementById('adminEventCategoryFilter');

    if (!tableBody) return;

    // Load category options into dropdown safely
    if (categorySelect && typeof populateCategoryDropdown === 'function') {
        try {
            await populateCategoryDropdown(categorySelect);
        } catch (e) {
            console.error('Failed to populate category dropdown:', e);
        }
    }

    async function loadEvents() {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><span class="spinner"></span> Loading events...</td></tr>`;

        const search = searchInput ? searchInput.value.trim() : '';
        const categoryId = categorySelect ? categorySelect.value : '0';

        const params = new URLSearchParams({ search, category_id: categoryId, limit: 100 });

        try {
            const res = await fetch(`${API_BASE}events/read.php?${params.toString()}`);
            const json = await res.json();

            if (json.success && json.data && json.data.events && json.data.events.length > 0) {
                tableBody.innerHTML = json.data.events.map(event => {
                    const regCount = parseInt(event.registered_count, 10) || 0;
                    const max = parseInt(event.max_participants, 10) || 100;
                    const percent = Math.min(100, Math.round((regCount / max) * 100));
                    const safeTitle = escapeHTML(event.title);
                    const safeTitleJs = (event.title || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

                    return `
                        <tr>
                            <td><strong>${safeTitle}</strong><br><small class="text-muted"><i class="bi bi-geo-alt"></i> ${escapeHTML(event.venue)}</small></td>
                            <td><span class="badge" style="background:rgba(27,67,50,0.6); color:var(--primary); border:1px solid var(--border-glass-gold); padding:0.25rem 0.6rem; border-radius:9999px; font-size:0.75rem;">${escapeHTML(event.category_name || 'General')}</span></td>
                            <td>${formatDate(event.event_date)}<br><small class="text-muted">${formatTime(event.start_time)}</small></td>
                            <td>
                                <div><small class="font-bold">${regCount} / ${max} (${percent}%)</small></div>
                                <div class="capacity-bar" style="width:100px; height:5px; margin-top:4px;">
                                    <div class="capacity-progress ${percent >= 100 ? 'full' : (percent >= 80 ? 'almost-full' : '')}" style="width:${percent}%;"></div>
                                </div>
                            </td>
                            <td><span class="event-badge-status status-${event.status}" style="position:static; display:inline-block; font-size:0.7rem; padding:0.2rem 0.5rem;">${event.status.toUpperCase()}</span></td>
                            <td>
                                <div class="table-actions">
                                    <a href="participants.html?event_id=${event.id}" class="btn btn-secondary btn-sm" title="View Participants">
                                        <i class="bi bi-people-fill"></i>
                                    </a>
                                    <a href="edit-event.html?id=${event.id}" class="btn btn-secondary btn-sm" title="Edit Event">
                                        <i class="bi bi-pencil-square"></i>
                                    </a>
                                    <button onclick="handleDeleteEvent(${event.id}, '${safeTitleJs}')" class="btn btn-danger btn-sm" title="Delete Event">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            } else {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary py-4"><i class="bi bi-calendar-x" style="font-size:1.5rem; display:block; margin-bottom:0.5rem;"></i> No campus events found matching your criteria.</td></tr>`;
            }
        } catch (e) {
            console.error('Events load error:', e);
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load events from database.</td></tr>`;
        }
    }

    if (searchInput) {
        let debounce;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(loadEvents, 300);
        });
    }
    if (categorySelect) categorySelect.addEventListener('change', loadEvents);

    loadEvents();
}

async function handleDeleteEvent(id, title) {
    const displayTitle = title || `Event #${id}`;
    if (!confirm(`Are you sure you want to permanently delete event "${displayTitle}"?\n\nAll student registrations and ticket records for this event will also be removed.`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}events/delete.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const json = await res.json();
        if (json.success) {
            showToast('success', 'Event Deleted', json.message);
            if (typeof initAdminEvents === 'function') initAdminEvents();
        } else {
            showToast('error', 'Delete Failed', json.message);
        }
    } catch (e) {
        console.error('Delete event error:', e);
        showToast('error', 'Network Error', 'Could not delete event.');
    }
}

// ==========================================================================
// PARTICIPANT ROSTER & CSV EXPORT
// ==========================================================================
async function initAdminParticipants() {
    const admin = await enforceAuthGuard('admin');
    if (!admin) return;

    const eventSelect = document.getElementById('participantEventSelector');
    const tableBody = document.getElementById('participantTableBody');
    const searchInput = document.getElementById('participantSearchInput');
    const statusSelect = document.getElementById('participantStatusFilter');
    const exportBtn = document.getElementById('exportParticipantsCsvBtn');

    let currentParticipants = [];

    // Populate events in dropdown
    try {
        const evRes = await fetch(`${API_BASE}events/read.php?limit=100`);
        const evJson = await evRes.json();
        if (evJson.success && evJson.data && evJson.data.events) {
            eventSelect.innerHTML = `<option value="0">Select an Event to View Attendees...</option>` +
                evJson.data.events.map(e => `<option value="${e.id}">${escapeHTML(e.title)} (${e.registered_count || 0} registered)</option>`).join('');

            // Pre-select if passed in URL
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('event_id')) {
                const paramId = urlParams.get('event_id');
                eventSelect.value = paramId;
                if (eventSelect.value && eventSelect.value !== '0') {
                    loadParticipants();
                }
            }
        }
    } catch (e) {
        console.error('Events dropdown load error:', e);
    }

    async function loadParticipants() {
        const eventId = eventSelect.value;
        const search = searchInput ? searchInput.value.trim() : '';
        const status = statusSelect ? statusSelect.value : 'all';

        if (eventId === '0' || !eventId) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-5">Please select an event above to view attendee roster.</td></tr>`;
            if (exportBtn) exportBtn.disabled = true;
            return;
        }

        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><span class="spinner"></span> Loading participants...</td></tr>`;

        const params = new URLSearchParams({
            view: 'admin',
            event_id: eventId,
            search,
            status
        });

        try {
            const res = await fetch(`${API_BASE}registrations/read.php?${params.toString()}`);
            const json = await res.json();

            if (json.success && json.data) {
                currentParticipants = json.data.registrations || [];
                if (exportBtn) exportBtn.disabled = currentParticipants.length === 0;

                // Event Header Meta
                const headerInfo = document.getElementById('participantEventHeaderInfo');
                if (headerInfo && json.data.event) {
                    const ev = json.data.event;
                    headerInfo.innerHTML = `
                        <div class="glass-panel" style="margin-bottom: 1.5rem; padding: 1.25rem;">
                            <h3 style="margin-bottom: 0.25rem;">${escapeHTML(ev.title)}</h3>
                            <div class="text-secondary" style="font-size: 0.9rem;">
                                <span><i class="bi bi-calendar"></i> ${formatDate(ev.event_date)}</span> &bull; 
                                <span><i class="bi bi-geo-alt"></i> ${escapeHTML(ev.venue)}</span> &bull; 
                                <span><i class="bi bi-people"></i> <strong>${ev.confirmed_count || 0}</strong> confirmed attendees</span>
                            </div>
                        </div>
                    `;
                }

                if (currentParticipants.length > 0) {
                    tableBody.innerHTML = currentParticipants.map((p, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td><strong class="font-mono text-primary">${escapeHTML(p.student_id || 'N/A')}</strong></td>
                            <td><strong>${escapeHTML(p.student_name || 'N/A')}</strong></td>
                            <td>${escapeHTML(p.student_email || '')}<br><small class="text-muted">${escapeHTML(p.student_phone || '')}</small></td>
                            <td><span class="font-mono text-primary" style="font-size:0.85rem; font-weight:700;">${escapeHTML(p.ticket_code || '')}</span></td>
                            <td>${formatDate(p.registration_date)}</td>
                            <td>
                                <select onchange="handleRegistrationStatusChange(${p.registration_id}, this.value)" class="form-select form-select-sm" style="padding:0.3rem 1.8rem 0.3rem 0.6rem; font-size:0.8rem; width:130px;">
                                    <option value="confirmed" ${p.registration_status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                                    <option value="attended" ${p.registration_status === 'attended' ? 'selected' : ''}>Attended</option>
                                    <option value="cancelled" ${p.registration_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                            </td>
                        </tr>
                    `).join('');
                } else {
                    tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-4"><i class="bi bi-person-x" style="font-size:1.5rem; display:block; margin-bottom:0.5rem;"></i> No participants found matching this criteria.</td></tr>`;
                }
            } else {
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-4">No participants found.</td></tr>`;
            }
        } catch (e) {
            console.error('Participants load error:', e);
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load participants.</td></tr>`;
        }
    }

    eventSelect.addEventListener('change', loadParticipants);
    if (statusSelect) statusSelect.addEventListener('change', loadParticipants);
    if (searchInput) {
        let debounce;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(loadParticipants, 300);
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const selectedOption = eventSelect.options[eventSelect.selectedIndex];
            let eventTitle = '';
            if (selectedOption && eventSelect.value !== '0') {
                eventTitle = selectedOption.text.replace(/\s*\(\d+\s+registered\)$/i, '').trim();
            }
            exportParticipantsToCSV(currentParticipants, eventTitle);
        });
    }

    if (eventSelect.value !== '0') {
        loadParticipants();
    }
}

async function handleRegistrationStatusChange(regId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}registrations/update_status.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registration_id: regId, status: newStatus })
        });
        const json = await res.json();
        if (json.success) {
            showToast('success', 'Status Updated', json.message);
        } else {
            showToast('error', 'Update Failed', json.message);
        }
    } catch (e) {
        console.error('Update status error:', e);
    }
}

// ==========================================================================
// CSV EXPORT GENERATOR (RFC 4180 COMPLIANT WITH UTF-8 BOM & BLOB DOWNLOAD)
// ==========================================================================
function exportParticipantsToCSV(participants, eventTitle) {
    if (!participants || participants.length === 0) {
        showToast('warning', 'No Data', 'There are no participants to export.');
        return;
    }

    // Helper to safely format and escape CSV cell (RFC 4180)
    const escapeCsvCell = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    // Standard CSV Column Headers
    const headers = [
        '#',
        'Student ID',
        'Full Name',
        'Email Address',
        'Contact Phone',
        'Ticket Pass Code',
        'Event Title',
        'Registration Date',
        'Attendance Status'
    ];

    // Map participant data rows
    const rows = participants.map((p, idx) => [
        idx + 1,
        escapeCsvCell(p.student_id || 'N/A'),
        escapeCsvCell(p.student_name || 'N/A'),
        escapeCsvCell(p.student_email || ''),
        escapeCsvCell(p.student_phone || ''),
        escapeCsvCell(p.ticket_code || ''),
        escapeCsvCell(p.event_title || eventTitle || 'NSBM Campus Event'),
        escapeCsvCell(p.registration_date || ''),
        escapeCsvCell((p.registration_status || 'confirmed').toUpperCase())
    ]);

    // Build standard CSV string with CRLF line endings
    const headerRow = headers.map(h => escapeCsvCell(h)).join(',');
    const dataRows = rows.map(r => r.join(','));
    const csvContent = [headerRow, ...dataRows].join('\r\n');

    // Create Blob with UTF-8 BOM (\uFEFF) for Excel & Sheets compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);

    // Clean title for safe, valid filename
    const cleanTitle = (eventTitle || 'Event_Participants')
        .replace(/<[^>]*>/g, '')
        .replace(/&[a-z0-9#]+;/gi, '')
        .replace(/\(\d+\s+registered\)/gi, '')
        .replace(/[^a-zA-Z0-9_\- ]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .substring(0, 35);

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `NSBM_${cleanTitle || 'Participants'}_${dateStr}.csv`;

    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', fileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
    }, 1000);

    showToast('success', 'Export Successful', `Exported ${participants.length} attendee records to "${fileName}".`);
}
