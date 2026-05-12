// State
const state = {
    currentUser: null, // null | { id, username, isAdmin }
    credentials: null, // null | Base64-sträng "dXNlcjp1c2Vy" (Basic Auth-header-värde)
    cars: [],
    bookings: [],
    users: [],
    carSortBy: 'name',
    carSortDesc: false,
    adminSortBy: 'id',
    adminSortDesc: false
};

const API_BASE = 'http://localhost:8080/api/v1';

/**
 * Wrapper runt fetch() som automatiskt:
 *  - bifogar Authorization: Basic-header om användaren är inloggad
 *  - sätter credentials: 'include' för CORS med cookies
 *  - kastar ett Error med HTTP-statuskod om svaret inte är ok
 *
 * @param {string} url       - Relativ eller absolut URL
 * @param {RequestInit} opts - Vanliga fetch-options (method, body, headers, ...)
 * @returns {Promise<Response>}
 */
async function apiFetch(url, opts = {}) {
    const headers = { ...opts.headers };

    if (state.credentials) {
        headers['Authorization'] = `Basic ${state.credentials}`;
    }

    // Låt fetch sätta Content-Type automatiskt för FormData (multipart),
    // men sätt JSON-header annars om en body skickas.
    if (opts.body && !(opts.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
        ...opts,
        headers,
        credentials: 'include',   // Krävs av CORS allowCredentials: true
    });

    if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        // Försök plocka ut felmeddelande från JSON-kroppen
        try {
            const body = await res.clone().json();
            err.serverMessage = body.error || body.message || null;
        } catch (_) { /* ignorera parse-fel */ }
        throw err;
    }

    return res;
}

window.addEventListener('load', () => {    

    // Återställer alla kod-toggles till stängt tillstånd
    const resetAllCodeToggles = () => {
        document.querySelectorAll('.code-wrapper.is-open').forEach(wrapper => {
            wrapper.classList.remove('is-open');
        });
        document.querySelectorAll('.toggle-code-btn').forEach(btn => {
            btn.innerHTML = 'Visa kod &lt;/&gt;';
        });
    };


    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SPA ROUTING
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

    const allNavLinks = document.querySelectorAll('.nav-link, .nav-trigger, #logo-link');
    const topNavLinks = document.querySelectorAll('header .nav-link');
    const sections    = document.querySelectorAll('main > .page-section'); // Only top-level sections

    const updateNavVisibility = () => {
        const navLoggain = document.getElementById('nav-loggain');
        const navAdmin = document.getElementById('nav-admin');
        const navStyleguide = document.getElementById('nav-styleguide');
        const navLogout = document.getElementById('nav-logout');

        if (state.currentUser) {
            if (navLoggain) navLoggain.style.display = 'none';
            if (navLogout) navLogout.style.display = 'flex';
            if (state.currentUser.isAdmin) {
                if (navAdmin) navAdmin.style.display = 'flex';
                if (navStyleguide) navStyleguide.style.display = 'flex';
            } else {
                if (navAdmin) navAdmin.style.display = 'none';
                if (navStyleguide) navStyleguide.style.display = 'none';
            }
        } else {
            if (navLoggain) navLoggain.style.display = 'flex';
            if (navLogout) navLogout.style.display = 'none';
            if (navAdmin) navAdmin.style.display = 'none';
            if (navStyleguide) navStyleguide.style.display = 'none';
        }
    };

    const navigateTo = (targetId) => {
        // Sub-section of admin-styleguide
        const isSubSection = ['intro', 'branding', 'components', 'forms-tables', 'feedback', 'css'].includes(targetId);
        if (isSubSection) {
            targetId = 'admin-styleguide';
        }

        // Auth Guard
        const adminViews = ['admin', 'admin-styleguide'];
        if (adminViews.includes(targetId) && !state.currentUser?.isAdmin) {
            showToast('Åtkomst nekad. Logga in som admin.', 'error');
            targetId = 'loggain';
        }

        resetAllCodeToggles();

        topNavLinks.forEach(link => {
            link.classList.remove('active');
            let href = link.getAttribute('href');
            if (href === '#' + targetId || (isSubSection && href === '#admin-styleguide')) {
                link.classList.add('active');
            }
        });

        sections.forEach(sec => {
            sec.classList.remove('active');
            if (sec.id === targetId) sec.classList.add('active');
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });

        // View logic
        if (targetId === 'bilar') fetchCars();
        if (targetId === 'admin') fetchAdminCars();
    };

    allNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            let targetId = link.getAttribute('href');
            if (!targetId || targetId === '#') return;
            
            if (targetId === '#logout') {
                e.preventDefault();
                state.currentUser = null;
                state.credentials = null;
                updateNavVisibility();
                navigateTo('bilar');
                showToast('Utloggad', 'success');
                closeMenu();
                return;
            }

            e.preventDefault();
            const idToNavigate = targetId.substring(1);
            navigateTo(idToNavigate);
            
            // If it was a subsection, scroll to it inside the styleguide
            const isSubSection = ['intro', 'branding', 'components', 'forms-tables', 'feedback', 'css'].includes(idToNavigate);
            if(isSubSection) {
                setTimeout(() => {
                    const el = document.getElementById(idToNavigate);
                    if(el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
            
            closeMenu();
        });
    });

    if (window.location.hash) {
        let initialTarget = window.location.hash.substring(1);
        if (document.getElementById(initialTarget) || ['intro', 'branding', 'components', 'forms-tables', 'feedback', 'css'].includes(initialTarget)) {
            navigateTo(initialTarget);
            const isSubSection = ['intro', 'branding', 'components', 'forms-tables', 'feedback', 'css'].includes(initialTarget);
            if(isSubSection) {
                setTimeout(() => {
                    const el = document.getElementById(initialTarget);
                    if(el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        } else {
            navigateTo('bilar');
        }
    } else {
        navigateTo('bilar');
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // BOKNINGSFLÖDE & MODAL
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const carsContainer = document.getElementById('cars-container');
    const bookingModal = document.getElementById('booking-modal');
    const bookingForm = document.getElementById('booking-form');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // Event Delegation för "Välj"-knapparna
    if (carsContainer) {
        carsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('book-car-btn')) {
                if (!state.currentUser) {
                    showToast('Du måste vara inloggad för att boka.', 'error');
                    navigateTo('loggain');
                    return;
                }

                const carId = e.target.getAttribute('data-id');
                const carName = e.target.getAttribute('data-name');

                document.getElementById('booking-car-id').value = carId;
                document.getElementById('booking-car-name').innerText = carName;

                // Sätt dagens datum som minimum
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('start-date').min = today;
                document.getElementById('end-date').min = today;

                bookingModal.showModal();
            }
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            bookingModal.close();
            bookingForm.reset();
        });
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const carId = document.getElementById('booking-car-id').value;
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            const submitBtn = bookingForm.querySelector('button[type="submit"]');

            submitBtn.disabled = true;
            submitBtn.textContent = 'Bokar...';

            try {
                await apiFetch(`${API_BASE}/bookings`, {
                    method: 'POST',
                    body: JSON.stringify({
                        carId: parseInt(carId),
                        userId: state.currentUser.id, // Krävs av din backend
                        startDate: startDate,
                        endDate: endDate
                    })
                });

                showToast('Bokning genomförd!', 'success');
                bookingModal.close();
                bookingForm.reset();

                // Uppdatera billistan så den valda bilen försvinner/blir markerad som bokad
                fetchCars();

            } catch (err) {
                console.error(err);
                showToast(err.serverMessage || 'Ett fel uppstod vid bokningen.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Bekräfta';
            }
        });
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // KOPIERA KOD TILL URKLIPP
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const codeText = btn.nextElementSibling.querySelector('code').innerText;
            navigator.clipboard.writeText(codeText).then(() => {
                const originalText = btn.innerText;
                btn.innerText = 'Kopierad!';
                btn.style.background = 'var(--color-positive)';
                btn.style.color = '#000';
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.background = 'rgba(255,255,255,0.1)';
                    btn.style.color = '#fff';
                }, 2000);
            });
        });
    });

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // HAMBURGER-MENY (MOBIL)
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const navMenu   = document.querySelector('.nav-links');
    function closeMenu() {
        if(navMenu) navMenu.classList.remove('open');
        if(hamburger) {
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    }
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('open');
            hamburger.classList.toggle('open', isOpen);
            hamburger.setAttribute('aria-expanded', String(isOpen));
        });
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // TOGGLE — DÖLJ/VISA KODBLOCK
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    document.querySelectorAll('.toggle-code-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const codeWrapper = btn.nextElementSibling;
            const isOpen = codeWrapper.classList.toggle('is-open');
            btn.innerHTML = isOpen ? 'Dölj kod &#8743;' : 'Visa kod &lt;/&gt;';
        });
    });

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // AUTHENTICATION LOGIC
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errEl    = document.getElementById('login-error');
            const btn      = loginForm.querySelector('button[type="submit"]');

            errEl.style.display = 'none';
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Loggar in…';
            }

            try {
                // Anropa login-endpoint (ej skyddad, skicka utan Authorization-header)
                const res  = await fetch(`${API_BASE}/auth/login`, {
                    method:      'POST',
                    headers:     { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body:        JSON.stringify({ username, password }),
                });

                if (!res.ok) throw new Error('unauthorized');

                const data = await res.json();

                // Spara state
                state.currentUser = {
                    id:      data.userId,
                    username: data.username,
                    isAdmin:  data.isAdmin,
                };
                // Base64-koda "username:password" för Basic Auth på efterföljande anrop
                state.credentials = btoa(`${username}:${password}`);

                loginForm.reset();
                updateNavVisibility();

                if (data.isAdmin) {
                    navigateTo('admin');
                    showToast(`Inloggad som administratör`, 'success');
                } else {
                    navigateTo('bilar');
                    showToast(`Inloggad som ${data.username}`, 'success');
                }

            } catch (err) {
                errEl.style.display = 'block';
                // Dölj eventuellt lösenord ur state om ett partiellt tillstånd uppstod
                state.currentUser = null;
                state.credentials = null;
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Logga In';
                }
            }
        });
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // CAR RENTAL LOGIC
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    function fetchCars() {
        const container = document.getElementById('cars-container');
        if (!container) return;
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center;"><div class="loader" style="margin: 2rem auto;"></div></div>';
        
        // Mock data fallback if backend is not running
        const mockData = [
            {id: 1, name: 'Volvo', model: 'XC60', type: 'SUV', price: 800, booked: false, feature1: 'AWD', feature2: 'Automat', feature3: 'GPS'},
            {id: 2, name: 'Tesla', model: 'Model 3', type: 'Sedan', price: 1200, booked: true, feature1: 'El', feature2: 'Autopilot', feature3: 'Long Range'}
        ];

        apiFetch(`${API_BASE}/cars`)
            .then(res => res.json())
            .then(data => {
                state.cars = data;
                renderCars();
            })
            .catch(err => {
                console.warn('Kunde inte hämta bilar:', err.message);
                // Behåll mock-data som fallback under dev
                state.cars = mockData;
                renderCars();
            });
    }

    function renderCars() {
        const container = document.getElementById('cars-container');
        if (!container) return;

        let sorted = [...state.cars];
        sorted.sort((a, b) => {
            let v1 = a[state.carSortBy];
            let v2 = b[state.carSortBy];
            if (typeof v1 === 'string') v1 = v1.toLowerCase();
            if (typeof v2 === 'string') v2 = v2.toLowerCase();
            if (v1 < v2) return state.carSortDesc ? 1 : -1;
            if (v1 > v2) return state.carSortDesc ? -1 : 1;
            return 0;
        });

        if (sorted.length === 0) {
            container.innerHTML = '<p>Inga bilar tillgängliga.</p>';
            return;
        }

        container.innerHTML = sorted.map(car => `
            <div class="panel ${car.booked ? 'panel-negative' : 'panel-accent'}" style="padding: 2rem;">
                <h3>${car.name} ${car.model || ''}</h3>
                <p style="margin-bottom: 0.5rem; color: var(--text);"><strong>Typ:</strong> ${car.type}</p>
                <p style="margin-bottom: 0.5rem; color: var(--text);"><strong>Pris:</strong> ${car.price} kr/dag</p>
                <ul style="margin-left: 1.5rem; margin-bottom: 1.5rem; color: var(--text-muted);">
                    <li>${car.feature1 || '-'}</li>
                    <li>${car.feature2 || '-'}</li>
                    <li>${car.feature3 || '-'}</li>
                </ul>
                ${car.booked ? 
                    '<span style="color: var(--color-negative); font-weight: bold;">Bokad</span>' : 
                    `<button class="btn btn-primary book-car-btn" data-id="${car.id}" data-name="${car.name} ${car.model || ''}">Välj</button>`
                }
            </div>
        `).join('');
    }

    document.getElementById('sort-name')?.addEventListener('click', () => {
        if (state.carSortBy === 'name') state.carSortDesc = !state.carSortDesc;
        else { state.carSortBy = 'name'; state.carSortDesc = false; }
        renderCars();
    });
    document.getElementById('sort-type')?.addEventListener('click', () => {
        if (state.carSortBy === 'type') state.carSortDesc = !state.carSortDesc;
        else { state.carSortBy = 'type'; state.carSortDesc = false; }
        renderCars();
    });

    window.orderCar = function(id) {
        if (!state.currentUser) {
            showToast('Du måste vara inloggad för att boka.', 'error');
            navigateTo('loggain');
            return;
        }
        showToast('Bokning initierad för bil ID ' + id, 'success');
    };

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ADMIN DASHBOARD LOGIC
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    function fetchAdminCars() {
        const tbody = document.getElementById('admin-cars-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;"><div class="loader" style="margin: 1rem auto;"></div></td></tr>';
        
        apiFetch(`${API_BASE}/cars`)
            .then(res => res.json())
            .then(data => {
                state.cars = data;
                renderAdminCars();
            })
            .catch(err => {
                console.warn('Kunde inte hämta bilar:', err.message);
                // using state.cars already populated or mock it again
                renderAdminCars();
            });
    }

    function renderAdminCars() {
        const tbody = document.getElementById('admin-cars-tbody');
        if (!tbody) return;

        let sorted = [...state.cars];
        sorted.sort((a, b) => {
            let v1 = a[state.adminSortBy];
            let v2 = b[state.adminSortBy];
            if (typeof v1 === 'string') v1 = v1.toLowerCase();
            if (typeof v2 === 'string') v2 = v2.toLowerCase();
            if (v1 < v2) return state.adminSortDesc ? 1 : -1;
            if (v1 > v2) return state.adminSortDesc ? -1 : 1;
            return 0;
        });

        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">Inga bilar hittades.</td></tr>';
            return;
        }

        tbody.innerHTML = sorted.map(car => `
            <tr>
                <td>${car.id}</td>
                <td><strong>${car.name}</strong></td>
                <td>${car.type}</td>
                <td>${car.price}</td>
                <td>
                    ${car.booked ? 
                        '<span style="color: var(--color-negative);">Bokad</span>' : 
                        '<span style="color: var(--color-positive);">Ledig</span>'}
                </td>
            </tr>
        `).join('');
    }

    document.querySelectorAll('#admin-cars-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-col');
            if (state.adminSortBy === col) {
                state.adminSortDesc = !state.adminSortDesc;
            } else {
                state.adminSortBy = col;
                state.adminSortDesc = false;
            }
            renderAdminCars();
        });
    });

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SYSTEMMEDDELANDEN (TOASTS)
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    window.showToast = function(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.animation = 'fadeIn 0.3s ease forwards';
        toast.innerHTML = `<span class="diamond-icon"></span> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Initial state check
    updateNavVisibility();
});
