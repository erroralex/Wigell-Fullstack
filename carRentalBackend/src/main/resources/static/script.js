// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// TILLSTÅNDSHANTERING - Håller all applikationsdata och sorteringsstatus på ett ställe
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const state = {
    currentUser: null,
    credentials: null,
    cars: [],
    bookings: [],
    userBookings: [],
    users: [],
    carSortBy: 'name',
    carSortDesc: false,
    adminSortBy: 'id',
    adminSortDesc: false,
    adminUsersSortBy: 'id',
    adminUsersSortDesc: false,
    adminBookingsSortBy: 'id',
    adminBookingsSortDesc: false,
    adminBookingsFilter: 'all',
    userBookingsSortBy: 'startDate',
    userBookingsSortDesc: false
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// SORTERINGSFUNKTION - Generisk sortering av arrayer baserat på en nyckel och sorteringsordning
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function sortData(arr, key, desc) {
    return [...arr].sort((a, b) => {
        let v1 = a[key];
        let v2 = b[key];
        if (typeof v1 === 'string') v1 = v1.toLowerCase();
        if (typeof v2 === 'string') v2 = v2.toLowerCase();
        if (v1 < v2) return desc ? 1 : -1;
        if (v1 > v2) return desc ? -1 : 1;
        return 0;
    });
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ARIA-SORT HJÄLP - Uppdaterar aria-sort och sorteringsklasser på tabellhuvuden
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function updateAriaSortHeaders(tableId, sortBy, sortDesc) {
    document.querySelectorAll(`#${tableId} th.sortable`).forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        th.removeAttribute('aria-sort');
        if (th.getAttribute('data-col') === sortBy) {
            const dir = sortDesc ? 'descending' : 'ascending';
            th.classList.add(sortDesc ? 'sort-desc' : 'sort-asc');
            th.setAttribute('aria-sort', dir);
        } else {
            th.setAttribute('aria-sort', 'none');
        }
    });
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// API-BASE - Bas-URL för alla API-anrop, lätt att ändra vid behov
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8080/api/v1';


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// SESSIONSHANTERING - Sparar inloggningsstatus i localStorage
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function saveSession() {
    if (state.currentUser && state.credentials) {
        localStorage.setItem('wigell_session', JSON.stringify({
            user: state.currentUser,
            creds: state.credentials
        }));
    } else {
        localStorage.removeItem('wigell_session');
    }
}

function loadSession() {
    const saved = localStorage.getItem('wigell_session');
    if (saved) {
        const data = JSON.parse(saved);
        state.currentUser = data.user;
        state.credentials = data.creds;
        return true;
    }
    return false;
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// API-HANTERARE - Hanterar autentisering och felhantering på ett ställe
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function apiFetch(url, opts = {}) {
    const headers = {...opts.headers};

    // Om användaren är inloggad, lägg till Authorization-headern med de sparade credentials (Base64-kodade användarnamn och lösenord)
    if (state.credentials) {
        headers['Authorization'] = `Basic ${state.credentials}`;
    }

    // Om det finns en body och den inte är en FormData, anta att det är JSON och sätt Content-Type
    if (opts.body && !(opts.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    // Skicka förfrågan till API:et med inkluderade credentials (cookies) och hantera eventuella fel
    const res = await fetch(url, {
        ...opts,
        headers,
        credentials: 'include',
    });

    // Om svaret inte är OK (statuskod utanför 200-299), skapa ett felobjekt med status och eventuellt meddelande från servern
    if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        try {
            const body = await res.clone().json();
            err.serverMessage = body.error || body.message || null;
        } catch (_) {
        }
        throw err;
    }
    return res;
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// HUVUDLOGIK - Hanterar routing, global klick-hantering, modaler och andra UI-interaktioner
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    // Försök ladda tidigare session (om den finns)
    loadSession();

    // Reset för kodexemplen i styleguiden
    const resetAllCodeToggles = () => {
        document.querySelectorAll('.code-wrapper.is-open').forEach(wrapper => wrapper.classList.remove('is-open'));
        document.querySelectorAll('.toggle-code-btn').forEach(btn => btn.innerHTML = 'Visa kod &lt;/&gt;');
    };

    // Hamburger-meny: Toggle och stängning vid navigering
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-links');

    function closeMenu() {
        if (navMenu) navMenu.classList.remove('open');
        if (hamburger) {
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

    // Navigering: Hantera visning av sektioner och åtkomstkontroll
    const topNavLinks = document.querySelectorAll('header .nav-link');
    const sections = document.querySelectorAll('main > .page-section');

    const updateNavVisibility = () => {
        const navLogin = document.getElementById('nav-login');
        const navProfile = document.getElementById('nav-profile');
        const navAdmin = document.getElementById('nav-admin');
        const navStyleguide = document.getElementById('nav-styleguide');
        const profileName = document.getElementById('nav-profile-name');

        if (state.currentUser) {
            if (navLogin)   navLogin.classList.add('d-none');
            if (navProfile) navProfile.classList.remove('d-none');

            if (profileName) {
                profileName.textContent = state.currentUser.firstName
                    || state.currentUser.username
                    || 'Profil';
            }

            if (state.currentUser.isAdmin) {
                if (navAdmin)      navAdmin.classList.remove('d-none');
                if (navStyleguide) navStyleguide.classList.remove('d-none');
            } else {
                if (navAdmin)      navAdmin.classList.add('d-none');
                if (navStyleguide) navStyleguide.classList.add('d-none');
            }
        } else {
            if (navLogin)      navLogin.classList.remove('d-none');
            if (navProfile)    navProfile.classList.add('d-none');
            if (navAdmin)      navAdmin.classList.add('d-none');
            if (navStyleguide) navStyleguide.classList.add('d-none');
        }
    };

    // Navigering: Visa rätt sektion och hantera åtkomstkontroll för admin-sektioner
    const navigateTo = (targetId) => {
        const isSubSection = ['branding', 'components', 'forms-tables', 'feedback', 'css'].includes(targetId);
        let actualSectionId = targetId;

        const adminViews = ['admin-cars', 'admin-styleguide', 'admin-users', 'admin-bookings', 'branding', 'components', 'forms-tables', 'feedback', 'css'];

        // Om en icke-admin försöker navigera till en admin-sektion, visa ett felmeddelande och omdirigera till login
        if (adminViews.includes(actualSectionId) && !state.currentUser?.isAdmin) {
            showToast('Åtkomst nekad. Logga in som admin.', 'error');
            actualSectionId = 'login';
        }

        resetAllCodeToggles();

        // Uppdatera aktiv länk i navigeringen
        topNavLinks.forEach(link => {
            link.classList.remove('active');
            let href = link.getAttribute('href');
            if (href === '#' + actualSectionId || (isSubSection && href === '#admin-styleguide')) {
                link.classList.add('active');
            }
        });

        // Visa endast den valda sektionen
        sections.forEach(sec => {
            sec.classList.remove('active');
            if (sec.id === actualSectionId) sec.classList.add('active');
        });

        // Scrolla alltid till toppen av sidan vid navigering
        window.scrollTo({top: 0, behavior: 'smooth'});

        // Ladda data för sektionen vid navigering
        if (actualSectionId === 'cars') fetchCars();
        if (actualSectionId === 'admin-cars') fetchCars('admin');
        if (actualSectionId === 'admin-users') fetchAdminUsers();
        if (actualSectionId === 'admin-bookings') fetchAdminBookingsByFilter();
        if (actualSectionId === 'mina-sidor') fetchUserBookings();

        // Om användaren navigerar till login-sektionen, fokusera på användarnamn-inputen
        if (actualSectionId === 'login') {
            setTimeout(() => {
                const usernameInput = document.getElementById('username');
                if (usernameInput) usernameInput.focus();
            }, 100);
        }
    };

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // GLOBALA KLICK-LYSSNARE - Hantera all klick-interaktion
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    document.body.addEventListener('click', (e) => {

        // Hantera Routing / Länkar
        const link = e.target.closest('a[href^="#"]');
        if (link) {
            const href = link.getAttribute('href');

            // Logga ut
            if (href === '#logout') {
                e.preventDefault();
                state.currentUser = null;
                state.credentials = null;
                saveSession();
                updateNavVisibility();
                navigateTo('cars');
                showToast('Utloggad', 'success');
                closeMenu();
                return;
            }

            // Förhindra sidhopp om länken är en ren trigger (href="#") och hantera navigering för andra hash-länkar
            if (href.length > 1) {
                e.preventDefault();
                const targetId = href.substring(1);
                navigateTo(targetId);
                const isSubSection = ['intro', 'branding', 'components', 'forms-tables', 'feedback', 'css'].includes(targetId);
                if (isSubSection) {
                    setTimeout(() => {
                        const el = document.getElementById(targetId);
                        if (el) {
                            const y = el.getBoundingClientRect().top + window.scrollY - 100;
                            window.scrollTo({top: y, behavior: 'smooth'});
                        }
                    }, 50);
                }
                closeMenu();
            }
        }

        // ─── VISA/DÖLJ KODBLOCK ──────────────────────────────────────────────────────────────────────────────────────────────
        if (e.target.classList.contains('toggle-code-btn')) {
            const codeWrapper = e.target.nextElementSibling;
            if (codeWrapper) {
                const isOpen = codeWrapper.classList.toggle('is-open');
                e.target.innerHTML = isOpen ? 'Dölj kod &#8743;' : 'Visa kod &lt;/&gt;';
            }
        }

        // ─── TABELLSORTERING FÖR ADMIN-BILAR ─────────────────────────────────────────────────────────────────────────────────
        const adminCarTh = e.target.closest('#admin-cars-table th.sortable');
        if (adminCarTh) {
            const col = adminCarTh.getAttribute('data-col');
            if (state.adminSortBy === col) {
                state.adminSortDesc = !state.adminSortDesc;
            } else {
                state.adminSortBy = col;
                state.adminSortDesc = false;
            }
            renderAdminCars();
        }

        // ─── TABELLSORTERING FÖR ADMIN-ANVÄNDARE ─────────────────────────────────────────────────────────────────────────────
        const adminUserTh = e.target.closest('#admin-users-table th.sortable');
        if (adminUserTh) {
            const col = adminUserTh.getAttribute('data-col');
            if (state.adminUsersSortBy === col) {
                state.adminUsersSortDesc = !state.adminUsersSortDesc;
            } else {
                state.adminUsersSortBy = col;
                state.adminUsersSortDesc = false;
            }
            renderAdminUsers();
        }

        // ─── TABELLSORTERING FÖR ADMIN-BOOKINGAR ─────────────────────────────────────────────────────────────────────────────
        const adminBookingTh = e.target.closest('#admin-bookings-table th.sortable');
        if (adminBookingTh) {
            const col = adminBookingTh.getAttribute('data-col');
            if (state.adminBookingsSortBy === col) {
                state.adminBookingsSortDesc = !state.adminBookingsSortDesc;
            } else {
                state.adminBookingsSortBy = col;
                state.adminBookingsSortDesc = false;
            }
            renderAdminBookings();
        }

        // ─── ADMIN - FILTRERA BOKNINGAR ──────────────────────────────────────────
        const bookingFilterBtn = e.target.closest('.booking-filter-btn');
        if (bookingFilterBtn) {
            const filter = bookingFilterBtn.getAttribute('data-filter');
            state.adminBookingsFilter = filter;

            document.querySelectorAll('.booking-filter-btn').forEach(btn => {
                const isActive = btn.getAttribute('data-filter') === filter;
                btn.classList.toggle('active-sort', isActive);
                btn.setAttribute('aria-pressed', String(isActive));
            });

            fetchAdminBookingsByFilter();
        }

        // ─── SORTERING AV KUNDGALLERIET — SORTKNAPP ──────────────────────────────────────────────────────────────────────────
        const sortCarBtn = e.target.closest('.sort-cars-btn');
        if (sortCarBtn) {
            const col = sortCarBtn.getAttribute('data-sort');
            if (state.carSortBy === col) {
                state.carSortDesc = !state.carSortDesc;
            } else {
                state.carSortBy = col;
                state.carSortDesc = false;
            }
            document.querySelectorAll('.sort-cars-btn').forEach(btn => {
                const isActive = btn.getAttribute('data-sort') === state.carSortBy;
                btn.classList.toggle('active-sort', isActive);
                btn.setAttribute('aria-pressed', String(isActive));
            });
            renderGallery();
        }

        // ─── BOKNING - ÖPPNA DIALOG ──────────────────────────────────────────────────────────────────────────────────────────
        const card = e.target.closest('.float-card');
        const bookBtn = e.target.closest('.book-car-btn') || (card ? card.querySelector('.book-car-btn') : null);
        if (bookBtn && !bookBtn.disabled) {
            if (!state.currentUser) {
                showToast('Du måste vara inloggad för att boka.', 'error');
                navigateTo('login');
                return;
            }

            const carId = bookBtn.getAttribute('data-id');
            const carName = bookBtn.getAttribute('data-name');

            document.getElementById('booking-car-id').value = carId;
            document.getElementById('booking-car-name').innerText = carName;

            const today = new Date().toISOString().split('T')[0];
            document.getElementById('start-date').min = today;
            document.getElementById('end-date').min = today;

            const bookingModal = document.getElementById('booking-modal');
            if (bookingModal) bookingModal.showModal();
        }
        
        // ─── ADMIN - ÖPPNA "Lägg till bil"-modal ─────────────────────────────────────────────────────────────────────────────
        const openAddCarBtn = e.target.closest('#open-add-car-btn');
        if (openAddCarBtn) {
            document.getElementById('edit-car-id').value = '';
            document.getElementById('add-car-title').innerText = 'Lägg till ny bil';
            document.getElementById('add-car-submit-btn').textContent = 'Spara bil';

            const addCarForm = document.getElementById('add-car-form');
            if (addCarForm) addCarForm.reset();

            const addCarModal = document.getElementById('add-car-modal');
            if (addCarModal) addCarModal.showModal();
        }
        
        // ─── ADMIN - REDIGERA BIL ────────────────────────────────────────────────────────────────────────────────────────────
        const editCarBtn = e.target.closest('.edit-car-btn');
        if (editCarBtn) {
            const carId = editCarBtn.getAttribute('data-id');
            const car = state.cars.find(c => c.id == carId);
            if (car) {
                document.getElementById('edit-car-id').value = car.id;
                document.getElementById('add-car-title').innerText = 'Redigera bil';
                document.getElementById('add-car-submit-btn').textContent = 'Spara ändringar';

                document.getElementById('name').value = car.name || '';
                document.getElementById('model').value = car.model || '';
                document.getElementById('type').value = car.type || '';
                document.getElementById('price').value = car.price || '';
                document.getElementById('feature1').value = car.feature1 || '';
                document.getElementById('feature2').value = car.feature2 || '';
                document.getElementById('feature3').value = car.feature3 || '';

                const addCarModal = document.getElementById('add-car-modal');
                if (addCarModal) addCarModal.showModal();
            }
        }

        // ─── ADMIN - Ta bort bil ────────────────────────────────────────────────────────────────────────────────────────────
        const deleteCarBtn = e.target.closest('.delete-car-btn');
        if (deleteCarBtn) {
            const carId = deleteCarBtn.getAttribute('data-id');
            const carName = deleteCarBtn.getAttribute('data-name');

            showConfirmModal({
                title: 'Ta bort bil',
                message: `Vill du verkligen ta bort ${carName}? Denna åtgärd kan inte ångras.`,
                confirmLabel: 'Ja, ta bort',
                onConfirm: async () => {
                    await apiFetch(`${API_BASE}/cars/${carId}`, {method: 'DELETE'});
                    showToast('Bilen har tagits bort från systemet', 'success');
                    fetchCars('admin');
                    fetchCars();
                }
            });
        }

        // ─── ADMIN - Redigera användare ─────────────────────────────────────────────────────────────────────────────────────
        const editUserBtn = e.target.closest('.edit-user-btn');
        if (editUserBtn) {
            const userId = editUserBtn.getAttribute('data-id');
            const user = state.users.find(u => u.id == userId);
            if (user) {
                const editUserModal = document.getElementById('edit-user-modal');
                document.getElementById('edit-user-id').value = user.id;
                document.getElementById('edit-user-username').value = user.username || '';
                document.getElementById('edit-user-firstname').value = user.firstName || '';
                document.getElementById('edit-user-lastname').value = user.lastName || '';
                document.getElementById('edit-user-phone').value = user.phone || '';
                document.getElementById('edit-user-email').value = user.email || '';
                document.getElementById('edit-user-role').value = user.role || 'ROLE_USER';
                if (editUserModal) editUserModal.showModal();
            }
        }

        // ─── ADMIN - Ta bort användare ─────────────────────────────────────────────────────────────────────────────────────
        const deleteUserBtn = e.target.closest('.delete-user-btn');
        if (deleteUserBtn) {
            const userId = deleteUserBtn.getAttribute('data-id');
            const userName = deleteUserBtn.getAttribute('data-name');

            showConfirmModal({
                title: 'Ta bort användare',
                message: `Vill du verkligen ta bort användaren ${userName}?`,
                confirmLabel: 'Ja, ta bort',
                onConfirm: async () => {
                    await apiFetch(`${API_BASE}/users/${userId}`, {method: 'DELETE'});
                    showToast('Användaren togs bort', 'success');
                    fetchAdminUsers();
                }
            });
        }

        // ─── ADMIN - VISA BOKNINGAR FÖR ANVÄNDARE ────────────────────────────────
        const viewUserBookingsBtn = e.target.closest('.view-user-bookings-btn');
        if (viewUserBookingsBtn) {
            const userId = viewUserBookingsBtn.getAttribute('data-id');
            const userName = viewUserBookingsBtn.getAttribute('data-name');
            openUserBookingsModal(userId, userName);
        }

        // ─── ADMIN - Redigera bokning ───────────────────────────────────────────────────────────────────────────────────────
        const editBookingBtn = e.target.closest('.edit-booking-btn');
        if (editBookingBtn) {
            const bookingId = editBookingBtn.getAttribute('data-id');
            const booking = state.bookings.find(b => b.id == bookingId);
            if (booking) {
                const editBookingModal = document.getElementById('edit-booking-modal');
                document.getElementById('edit-booking-id').value = booking.id;
                document.getElementById('edit-booking-start').value = booking.fromDate || '';
                document.getElementById('edit-booking-end').value = booking.toDate || '';
                document.getElementById('edit-booking-end').min = booking.fromDate || '';
                if (editBookingModal) editBookingModal.showModal();
            }
        }

        // ─── ADMIN - Ta bort bokning ────────────────────────────────────────────────────────────────────────────────────────
        const deleteBookingBtn = e.target.closest('.delete-booking-btn');
        if (deleteBookingBtn) {
            const bookingId = deleteBookingBtn.getAttribute('data-id');

            showConfirmModal({
                title: 'Ta bort bokning',
                message: 'Vill du verkligen ta bort bokningen?',
                confirmLabel: 'Ja, ta bort',
                onConfirm: async () => {
                    await apiFetch(`${API_BASE}/bookings/${bookingId}`, {method: 'DELETE'});
                    showToast('Bokningen togs bort', 'success');
                    fetchAdminBookingsByFilter();
                    fetchUserBookings();
                }
            });
        }

        // ─── ADMIN — Återlämna bokning ───────────────────────────────────────────────────────────────────────────────────────
        const returnBookingBtn = e.target.closest('.return-booking-btn');
        if (returnBookingBtn) {
            const bookingId = returnBookingBtn.getAttribute('data-id');
            showConfirmModal({
                title: 'Återlämna bil',
                message: 'Bekräfta att du vill återlämna denna bokning.',
                confirmLabel: 'Ja, återlämna',
                onConfirm: async () => {
                    await apiFetch(`${API_BASE}/bookings/return/${bookingId}`, { method: 'PUT' });
                    showToast('Bokningen markerades som återlämnad.', 'success');
                    fetchAdminBookingsByFilter();
                    fetchUserBookings();
                    fetchCars();
                }
            });
        }

        // ─── MINA SIDOR — Återlämna bil ──────────────────────────────────────────────────────────────────────────────────────
        const returnCarBtn = e.target.closest('.return-car-btn');
        if (returnCarBtn) {
            const bookingId = returnCarBtn.getAttribute('data-id');
            showConfirmModal({
                title: 'Återlämna bil',
                message: 'Bekräfta att du vill returnera bilen. Bokningen markeras som avslutad.',
                confirmLabel: 'Ja, återlämna',
                onConfirm: async () => {
                    await apiFetch(`${API_BASE}/bookings/return/${bookingId}`, { method: 'PUT' });
                    showToast('Bilen har återlämnats!', 'success');
                    fetchUserBookings();
                    fetchCars();
                }
            });
        }

        // ─── ÖPPNA DEMO-DIALOGER (STYLEGUIDE) ────────────────────────────────────────────────────────────────────────────────
        const demoModalTrigger = e.target.closest('.demo-modal-trigger');
        if (demoModalTrigger) {
            const targetId = demoModalTrigger.getAttribute('data-target');
            const modal = document.getElementById(targetId);
            if (modal) modal.showModal();
        }

        // ─── DROPDOWN-MENYER (KLICK-HANTERING) ───────────────────────────────────────────────────────────────────────────────
        const dropdownTrigger = e.target.closest('.example-nav-item > .nav-link');
        
        if (dropdownTrigger && dropdownTrigger.nextElementSibling?.classList.contains('sub-nav')) {
            // Förhindra sidhopp om länken är en ren trigger (href="#")
            if (dropdownTrigger.getAttribute('href') === '#') {
                e.preventDefault();
            }
            
            // Kolla nuvarande status för den klickade dropdownen
            const isExpanded = dropdownTrigger.getAttribute('aria-expanded') === 'true';
            
            // Stäng alla andra dropdowns först
            document.querySelectorAll('.example-nav-item > .nav-link').forEach(trigger => {
                trigger.setAttribute('aria-expanded', 'false');
            });
            
            // Toggla den klickade
            dropdownTrigger.setAttribute('aria-expanded', String(!isExpanded));
        }

        // Stäng alla dropdowns om klick sker var som helst utanför navigeringsfälten
        if (!e.target.closest('.example-nav-item')) {
            document.querySelectorAll('.example-nav-item > .nav-link').forEach(trigger => {
                trigger.setAttribute('aria-expanded', 'false');
            });
        }
    });

    // Vid sidladdning, navigera till den hash-sektion som anges i URL:en (om någon), annars visa "cars"
    const currentHash = window.location.hash.substring(1);
    if (currentHash) navigateTo(currentHash);
    else navigateTo('cars');


    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // TA BORT-DIALOG - Hantera Bekräfta och Avbryt
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const confirmActionModal = document.getElementById('confirm-action-modal');
    const confirmActionTitle = document.getElementById('confirm-action-title');
    const confirmActionMessage = document.getElementById('confirm-action-message');
    const confirmActionBtn = document.getElementById('confirm-action-btn');
    const cancelActionBtn = document.getElementById('cancel-action-btn');
    let confirmActionCallback = null;

    // Funktion för att visa bekräftelsemodalen med anpassat innehåll och callback
    function showConfirmModal({title, message, confirmLabel = 'Ja, fortsätt', onConfirm}) {
        if (!confirmActionModal || !confirmActionTitle || !confirmActionMessage || !confirmActionBtn) return;
        confirmActionTitle.textContent = title;
        confirmActionMessage.textContent = message;
        confirmActionBtn.textContent = confirmLabel;
        confirmActionBtn.disabled = false;
        confirmActionCallback = onConfirm;
        confirmActionModal.showModal();
    }

    // Hantera klick på "Bekräfta"-knappen i bekräftelsemodalen
    if (confirmActionBtn) {
        confirmActionBtn.addEventListener('click', async () => {
            if (!confirmActionCallback) return;
            confirmActionBtn.disabled = true;
            const originalLabel = confirmActionBtn.textContent;
            confirmActionBtn.textContent = 'Vänta...';

            try {
                await confirmActionCallback();
            } catch (err) {
                console.error(err);
                showToast(err.serverMessage || 'Åtgärden misslyckades. Försök igen.', 'error');
            } finally {
                if (confirmActionModal) confirmActionModal.close();
                confirmActionCallback = null;
                confirmActionBtn.textContent = originalLabel;
                confirmActionBtn.disabled = false;
            }
        });
    }

    // Hantera klick på "Avbryt"-knappen i bekräftelsemodalen
    if (cancelActionBtn) {
        cancelActionBtn.addEventListener('click', () => {
            if (confirmActionModal) confirmActionModal.close();
            confirmActionCallback = null;
        });
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // BOKNINGS-DIALOG - Hanterar avbryt och skicka (submit)
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const bookingModal = document.getElementById('booking-modal');
    const bookingForm = document.getElementById('booking-form');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // När startdatum ändras, uppdatera minimalt tillåtna slutdatum
    const startDateInput = document.getElementById('start-date');
    if (startDateInput) {
        startDateInput.addEventListener('change', function () {
            const endDateInput = document.getElementById('end-date');
            if (endDateInput) endDateInput.min = this.value;
        });
    }

    // Hantera stängning av bokningsmodalen
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            bookingModal.close();
            bookingForm.reset();
        });
    }

    // Hantera bokningsformulärets submission
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const carId = document.getElementById('booking-car-id').value;
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            const submitBtn = bookingForm.querySelector('button[type="submit"]');

            // Validera att slutdatum är efter startdatumet
            if (endDate < startDate) {
                showToast('Slutdatumet måste vara efter startdatumet.', 'error');
                return;
            }
            if (endDate === startDate) {
                showToast('Minsta hyrtid är en dag — välj ett slutdatum efter startdatumet.', 'error');
                return;
            }

            // Inaktivera submit-knappen och visa en laddningsindikator
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Bokar...';
            }

            // Skicka bokningsförfrågan till API:et
            try {
                await apiFetch(`${API_BASE}/bookings`, {
                    method: 'POST',
                    body: JSON.stringify({
                        carId: parseInt(carId),
                        userId: state.currentUser.id,
                        fromDate: startDate,
                        toDate: endDate
                    })
                });

                // Vid lyckad bokning, visa en bekräftelse och uppdatera bil- och bokningslistorna
                showToast('Bokning genomförd!', 'success');
                bookingModal.close();
                bookingForm.reset();
                fetchCars();
            
            // Vid fel, logga det och visa ett användarvänligt meddelande
            } catch (err) {
                console.error(err);
                showToast(err.serverMessage || 'Ett fel uppstod vid bokningen.', 'error');

            // Oavsett resultat, återställ submit-knappen till sitt ursprungliga skick
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Bekräfta';
            }
        });
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ADMIN: LÄGG TILL / REDIGERA BIL-DIALOG
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const addCarModal = document.getElementById('add-car-modal');
    const addCarForm = document.getElementById('add-car-form');
    const closeAddCarBtn = document.getElementById('close-add-car-btn');

    // Hantera stängning av "Lägg till bil"-modalen
    if (closeAddCarBtn) {
        closeAddCarBtn.addEventListener('click', () => {
            if (addCarModal) addCarModal.close();
            if (addCarForm) addCarForm.reset();
        });
    }

    // Hantera "Lägg till / Redigera bil"-formuläret
    if (addCarForm) {
        addCarForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = addCarForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sparar...';
            }

            // Hämta värden från formuläret
            const nameVal = document.getElementById('name').value;
            const modelVal = document.getElementById('model').value;
            const typeVal = document.getElementById('type').value;
            const priceVal = document.getElementById('price').value;
            const feature1Val = document.getElementById('feature1')?.value || '';
            const feature2Val = document.getElementById('feature2')?.value || '';
            const feature3Val = document.getElementById('feature3')?.value || '';
            const fileInput = document.getElementById('car-image');
            const editId = document.getElementById('edit-car-id').value;
            const method = editId ? 'PUT' : 'POST';
            const endpoint = editId ? `${API_BASE}/cars/${editId}` : `${API_BASE}/cars`;

            // Bevara existerande bokad status
            let isBooked = false;
            let existingImage = null;
            if (editId) {
                const existingCar = state.cars.find(c => c.id == editId);
                isBooked = existingCar ? existingCar.booked : false;
                existingImage = existingCar ? existingCar.image : null;
            }

            // Options-objekt för apiFetch
            let fetchOptions = {
                method: method
            };

            try {
                // LÄGG TILL BIL -> Förväntar sig multipart/form-data
                if (method === 'POST') {                    
                    const formData = new FormData();
                    formData.append('name', nameVal);
                    formData.append('model', modelVal);
                    formData.append('type', typeVal);
                    formData.append('price', priceVal);
                    formData.append('feature1', feature1Val);
                    formData.append('feature2', feature2Val);
                    formData.append('feature3', feature3Val);
                    formData.append('booked', isBooked);

                    if (fileInput && fileInput.files.length > 0) {
                        formData.append('image', fileInput.files[0]);
                    }

                    fetchOptions.body = formData;

                } else {
                    // REDIGERA BIL -> Förväntar sig APPLICATION/JSON
                    const carData = {
                        id: parseInt(editId),
                        name: nameVal,
                        model: modelVal,
                        type: typeVal,
                        price: parseFloat(priceVal),
                        feature1: feature1Val,
                        feature2: feature2Val,
                        feature3: feature3Val,
                        booked: isBooked,
                        image: existingImage
                    };

                    // Om admin har valt en ny fil, konvertera till Base64 för JSON-payload
                    if (fileInput && fileInput.files.length > 0) {
                        const file = fileInput.files[0];
                        carData.image = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            // Splitta på komma för att ta bort "data:image/png;base64,"-prefixet
                            reader.onload = () => resolve(reader.result.split(',')[1]);
                            reader.onerror = error => reject(error);
                            reader.readAsDataURL(file);
                        });
                    }

                    fetchOptions.body = JSON.stringify(carData);
                }

                // Skicka API-förfrågan för att skapa eller uppdatera bilen
                await apiFetch(endpoint, fetchOptions);

                showToast(`Bilen har ${editId ? 'uppdaterats' : 'lagts till'}!`, 'success');

                if (addCarModal) addCarModal.close();
                addCarForm.reset();

                fetchCars('admin');
                fetchCars();
            } catch (err) {
                console.error(err);
                showToast(`Kunde inte ${editId ? 'uppdatera' : 'lägga till'} bil.`, 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = editId ? 'Spara ändringar' : 'Spara bil';
                }
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
    // AUTENTISERINGS-LOGIK - Hantera inloggning, utloggning och session
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const loginForm = document.getElementById('login-form');
    
    // Hantera inloggningsformulärets submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errEl = document.getElementById('login-error');
            const btn = loginForm.querySelector('button[type="submit"]');

            // Dölj eventuella tidigare felmeddelanden
            errEl.style.display = 'none';
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Loggar in…';
            }

            // Skicka inloggningsförfrågan till API:et
            try {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify({username, password}),
                });

                // Om svaret inte är OK, kasta ett fel för att trigga catch-blocket
                if (!res.ok) throw new Error('unauthorized');

                const data = await res.json();
                state.currentUser = {
                    id:        data.userId,
                    username:  data.username,
                    firstName: data.firstName || null,
                    isAdmin:   data.isAdmin
                };
                state.credentials = btoa(`${username}:${password}`);

                // Spara sessionen, uppdatera navigeringen och dirigera användaren baserat på deras roll
                saveSession();
                loginForm.reset();
                updateNavVisibility();

                if (data.isAdmin) {
                    navigateTo('admin-cars');
                    showToast(`Inloggad som administratör`, 'success');
                } else {
                    navigateTo('cars');
                    showToast(`Inloggad som ${data.username}`, 'success');
                }

            } catch (err) {
                errEl.style.display = 'block';
                state.currentUser = null;
                state.credentials = null;
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Logga in';
                }
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────-
    // SKAPA ANVÄNDARE - Hantera registreringsdialogen
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const openRegisterBtn = document.getElementById('open-register-btn');
    const registerModal = document.getElementById('register-modal');
    const closeRegisterBtn = document.getElementById('close-register-btn');
    const registerForm = document.getElementById('register-form');

    // Hantera öppning av registreringsdialogen
    if (openRegisterBtn && registerModal) {
        openRegisterBtn.addEventListener('click', () => {
            registerModal.showModal();
            setTimeout(() => document.getElementById('register-username')?.focus(), 50);
        });
    }

    // Hantera stängning av registreringsdialogen
    if (closeRegisterBtn) {
        closeRegisterBtn.addEventListener('click', () => {
            if (registerModal) registerModal.close();
            registerForm?.reset();
        });
    }

    // Hantera submission av registreringsformuläret
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const username = document.getElementById('register-username').value.trim();
            const firstName = document.getElementById('register-firstname').value.trim();
            const lastName = document.getElementById('register-lastname').value.trim();
            const phone = document.getElementById('register-phone').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;

            // Validera att alla fält är ifyllda
            if (!username || !firstName || !lastName || !phone || !email || !password) {
                showToast('Fyll i alla fält.', 'error');
                return;
            }

            // Inaktivera submit-knappen och visa en laddningsindikator
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Skapar...';
            }

            // Skicka registreringsförfrågan till API:et
            try {
                await apiFetch(`${API_BASE}/users`, {
                    method: 'POST',
                    body: JSON.stringify({
                        username,
                        firstName,
                        lastName,
                        phone,
                        email,
                        password,
                        role: 'ROLE_USER',
                        noOfOrders: 0
                    })
                });

                // Vid lyckad registrering, visa en bekräftelse och förbered inloggningsformuläret
                showToast('Konto skapat', 'success');
                if (registerModal) registerModal.close();
                registerForm.reset();

                const loginUsername = document.getElementById('username');
                if (loginUsername) {
                    loginUsername.value = username;
                    loginUsername.focus();
                }
            } catch (err) {
                console.error(err);
                showToast(err.serverMessage || 'Kunde inte skapa konto.', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Skapa konto';
                }
            }
        });
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ADMIN - REDIGERA ANVÄNDARE & BOKNING - Hantera redigeringsdialoger
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const editUserModal = document.getElementById('edit-user-modal');
    const editUserForm = document.getElementById('edit-user-form');
    const closeEditUserBtn = document.getElementById('close-edit-user-btn');
    const editBookingModal = document.getElementById('edit-booking-modal');
    const editBookingForm = document.getElementById('edit-booking-form');
    const closeEditBookingBtn = document.getElementById('close-edit-booking-btn');
    const editBookingStart = document.getElementById('edit-booking-start');
    const editBookingEnd = document.getElementById('edit-booking-end');

    // Hantera stängning av redigeringsdialogen
    if (closeEditUserBtn) {
        closeEditUserBtn.addEventListener('click', () => {
            if (editUserModal) editUserModal.close();
            editUserForm?.reset();
        });
    }

    // Hantera redigeringsformulärets submission
    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('edit-user-id').value;
            const username = document.getElementById('edit-user-username').value.trim();
            const firstName = document.getElementById('edit-user-firstname').value.trim();
            const lastName = document.getElementById('edit-user-lastname').value.trim();
            const phone = document.getElementById('edit-user-phone').value.trim();
            const email = document.getElementById('edit-user-email').value.trim();
            const role = document.getElementById('edit-user-role').value;
            const submitBtn = editUserForm.querySelector('button[type="submit"]');

            // Validera att alla fält är ifyllda
            if (!username || !firstName || !lastName || !phone || !email) {
                showToast('Fyll i alla användarfält.', 'error');
                return;
            }

            // Inaktivera submit-knappen och visa en laddningsindikator
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sparar...';
            }

            // Skicka redigeringsförfrågan till API:et
            try {
                await apiFetch(`${API_BASE}/users/${userId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        username,
                        firstName,
                        lastName,
                        phone,
                        email,
                        role
                    })
                });

                // Vid lyckad uppdatering, visa en bekräftelse och uppdatera listan
                showToast('Användaren uppdaterades', 'success');
                if (editUserModal) editUserModal.close();
                editUserForm.reset();
                fetchAdminUsers();
            } catch (err) {
                console.error(err);
                showToast('Kunde inte uppdatera användaren', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Spara ändringar';
                }
            }
        });
    }

    // Hantera stängning av redigeringsdialogen
    if (closeEditBookingBtn) {
        closeEditBookingBtn.addEventListener('click', () => {
            if (editBookingModal) editBookingModal.close();
            editBookingForm?.reset();
        });
    }

    // Hantera stängning av användarens bokningsmodal
    const closeUserBookingsModalBtn = document.getElementById('close-user-bookings-modal-btn');
    const userBookingsModal = document.getElementById('user-bookings-modal');
    if (closeUserBookingsModalBtn && userBookingsModal) {
        closeUserBookingsModalBtn.addEventListener('click', () => {
            userBookingsModal.close();
        });
    }

    // Hantera ändringar i start- och slutdatum
    if (editBookingStart && editBookingEnd) {
        editBookingStart.addEventListener('change', function () {
            editBookingEnd.min = this.value;
        });
    }

    // Hantera redigeringsformulärets submission
    if (editBookingForm) {
        editBookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const bookingId = document.getElementById('edit-booking-id').value;
            const startDate = document.getElementById('edit-booking-start').value;
            const endDate = document.getElementById('edit-booking-end').value;
            const submitBtn = editBookingForm.querySelector('button[type="submit"]');

            if (endDate <= startDate) {
                showToast('Slutdatum måste vara efter startdatum.', 'error');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sparar...';
            }

            // Skicka redigeringsförfrågan till API:et
            try {
                await apiFetch(`${API_BASE}/bookings/${bookingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        fromDate: startDate,
                        toDate: endDate
                    })
                });

                // Vid lyckad uppdatering, visa en bekräftelse och uppdatera bokningslistorna
                showToast('Bokningen uppdaterades', 'success');
                if (editBookingModal) editBookingModal.close();
                editBookingForm.reset();
                fetchAdminBookingsByFilter();
                fetchUserBookings();
            } catch (err) {
                console.error(err);
                showToast('Kunde inte uppdatera bokningen', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Spara ändringar';
                }
            }
        });
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // BILUTHYRNINGSLOGIK - Hämtar och renderar bilar i både galleri- och adminvyer
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    
    function fetchCars(renderTarget = 'gallery') {
        if (renderTarget === 'gallery') {
            const carsContainer = document.getElementById('cars-container');
            if (carsContainer) {
                carsContainer.innerHTML = '<div class="loader" style="margin: 2rem auto;"></div>';
            }
        } else {
            const tbody = document.getElementById('admin-cars-tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><div class="loader" style="margin:1rem auto;"></div></td></tr>';
            }
        }

        apiFetch(`${API_BASE}/cars`)
            .then(res => res.json())
            .then(data => {
                state.cars = data;
                if (renderTarget === 'admin') {
                    renderAdminCars();
                } else {
                    renderGallery();
                }
            })
            .catch(err => {
                console.warn('Kunde inte hämta bilar:', err.message);
                if (renderTarget === 'gallery') {
                    showToast('Kunde inte nå servern.', 'error');
                    state.cars = [];
                    renderGallery();
                } else {
                    renderAdminCars();
                }
            });
    }

// ──────────────────────────────────────────────────────────────────────────────────────────────
// SVG-PLATSHÅLLARE FÖR BILAR UTAN BILD
// ──────────────────────────────────────────────────────────────────────────────────────────────
function renderPlaceholderSVG(color = '#e69d67') {
    return `<svg viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg"
                 aria-hidden="true" focusable="false"
                 style="width:80%;height:80%;opacity:0.25;">
        <rect x="5" y="22" width="110" height="34" rx="5"
              fill="none" stroke="${color}" stroke-width="2"/>
        <polygon points="18,22 28,6 92,6 102,22"
                 fill="none" stroke="${color}" stroke-width="2"/>
        <circle cx="28" cy="58" r="8" fill="none" stroke="${color}" stroke-width="2"/>
        <circle cx="92" cy="58" r="8" fill="none" stroke="${color}" stroke-width="2"/>
        <rect x="42" y="10" width="36" height="12" rx="2"
              fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5"/>
    </svg>`;
}

    // Funktion för att bygga HTML-innehållet för en bil i galleriet
    function buildFloatCard(car) {
        const imageSrc = car.imageUrl || car.image || '';
        const hasImage = Boolean(imageSrc);
        const modelName = [car.name, car.model].filter(Boolean).join(' ');

        const imgContent = car.image
            ? `<img src="data:image/png;base64,${car.image}"
                    alt="Foto av ${car.name}${car.model ? ' ' + car.model : ''}"
                    style="width:80%;height:80%;object-fit:contain;">`
            : renderPlaceholderSVG('#e69d67');

        const feats = [car.feature1, car.feature2, car.feature3].filter(Boolean);
        const specsHTML = feats.length
            ? `<ul class="car-specs">
                 ${feats.map(f => `<li>${f}</li>`).join('')}
               </ul>`
            : '';

        const ctaBtn = car.booked
            ? `<button class="float-card__cta float-card__cta--booked"
                       disabled aria-disabled="true">
                 BOKAD
               </button>`
            : `<button class="float-card__cta book-car-btn"
                       data-id="${car.id}"
                       data-name="${(car.name + ' ' + (car.model || '')).trim()}"
                       aria-label="Boka ${car.name}${car.model ? ' ' + car.model : ''}">
                 BOKA
               </button>`;

        return `
            <article class="float-card" aria-label="${car.name}${car.model ? ' ' + car.model : ''} – ${car.type || 'Okänd typ'}">
              <div class="car-badge"
                   style="color:var(--color-function); border-color:var(--color-function);">
                ${car.type || 'Okänd'}
              </div>

              <div class="car-img">
                ${imgContent}
              </div>

              <div class="car-body">
                <div class="car-title" style="color:var(--accent);">
                  ${car.name.toUpperCase()}${car.model ? ' ' + car.model.toUpperCase() : ''}
                </div>
                <div class="car-price">
                  <strong>${car.price.toLocaleString('sv-SE')}</strong> kr/dag
                </div>
                ${specsHTML}
                ${ctaBtn}
              </div>
            </article>`;
    }

    // Funktion för att rendera galleriet med bilar
    function renderGallery() {
        const container = document.getElementById('cars-container');
        if (!container) return;

        if (!state.cars || state.cars.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Inga bilar tillgängliga just nu. Försök igen senare eller kontakta support.</p>
                </div>
            `;
            return;
        }

        // Sortera bilarna baserat på valt sorteringsfält och ordning
        const sorted = sortData(state.cars, state.carSortBy, state.carSortDesc);

        // Bygg HTML-innehållet för varje bil och uppdatera galleriet
        container.innerHTML = sorted.map(buildFloatCard).join('');
    }



    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ADMIN DASHBOARD-LOGIK
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Funktion för att rendera bilar i admin-tabellen
    function renderAdminCars() {
        const tbody = document.getElementById('admin-cars-tbody');
        if (!tbody) return;

        let sorted = sortData(state.cars, state.adminSortBy, state.adminSortDesc);

        // Om inga bilar hittades, visa ett meddelande i tabellen
        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Inga bilar hittades.</td></tr>';
            return;
        }

        // Bygg HTML-innehållet för varje bil i tabellen
        tbody.innerHTML = sorted.map(car => `
            <tr>
                <td>${car.id}</td>
                <td><strong>${car.name}</strong></td>
                <td>${car.type}</td>
                <td>${car.price} kr</td>
                <td>
                    ${car.booked ?
            '<span class="status-booked">Bokad</span>' :
            '<span class="status-free">Ledig</span>'}
                </td>
                <td style="white-space: nowrap;">
                    <button class="btn-icon edit-car-btn" data-id="${car.id}"
                            aria-label="Redigera ${car.name}" title="Redigera">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="btn-icon danger delete-car-btn" data-id="${car.id}" data-name="${car.name} ${car.model || ''}"
                            aria-label="Ta bort ${car.name}" title="Ta bort">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            </tr>
        `).join('');

        updateAriaSortHeaders('admin-cars-table', state.adminSortBy, state.adminSortDesc);
    }

    // Funktion för att hämta användare från API:et
    function fetchAdminUsers() {
        const tbody = document.getElementById('admin-users-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;"><div class="loader" style="margin: 1rem auto;"></div></td></tr>';

        // Hämta användare från API:et
        apiFetch(`${API_BASE}/users`)
            .then(res => res.json())
            .then(data => {
                state.users = data;
                renderAdminUsers();
            })
            .catch(err => {
                console.warn('Kunde inte hämta användare:', err.message);
                renderAdminUsers();
            });
    }

    // Funktion för att rendera användare i admin-tabellen
    function renderAdminUsers() {
        const tbody = document.getElementById('admin-users-tbody');
        if (!tbody) return;

        let sorted = sortData(state.users, state.adminUsersSortBy, state.adminUsersSortDesc);

        // Om inga användare hittades, visa ett meddelande i tabellen
        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">Inga användare hittades.</td></tr>';
            return;
        }

        // Bygg HTML-innehållet för varje användare i tabellen
        tbody.innerHTML = sorted.map(user => `
            <tr>
                <td>${user.id}</td>
                <td><strong>${user.username || '-'}</strong></td>
                <td>${user.firstName || '-'}</td>
                <td>${user.lastName || '-'}</td>
                <td>${user.email || '-'}</td>
                <td>${user.noOfOrders ?? 0}</td>
                <td>${(user.role || 'USER').replace('ROLE_', '')}</td>
                <td style="white-space: nowrap;">
                    <button class="btn-icon edit-user-btn" data-id="${user.id}" data-name="${user.username}"
                            aria-label="Redigera ${user.username}" title="Redigera">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="btn-icon view-user-bookings-btn" data-id="${user.id}" data-name="${user.username}"
                            aria-label="Visa bokningar för ${user.username}" title="Visa bokningar">
                        <i class="bi bi-file-earmark-text" aria-hidden="true"></i>
                    </button>
                    <button class="btn-icon danger delete-user-btn" data-id="${user.id}" data-name="${user.username}"
                            aria-label="Ta bort ${user.username}" title="Ta bort">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            </tr>
        `).join('');

        updateAriaSortHeaders('admin-users-table', state.adminUsersSortBy, state.adminUsersSortDesc);
    }

    // Funktion för att hämta bokningar från API:et
    async function fetchAdminBookings() {
        const tbody = document.getElementById('admin-bookings-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;"><div class="loader" style="margin: 1rem auto;"></div></td></tr>';

        // Ladda bilar om cache är tom — vänta på resultatet
        if (state.cars.length === 0) {
            try {
                const carsRes = await apiFetch(`${API_BASE}/cars`);
                state.cars = await carsRes.json();
            } catch (err) {
                console.warn('Kunde inte förhämta bilar:', err.message);
            }
        }

        // Hämta bokningar från API:et
        apiFetch(`${API_BASE}/bookings`)
            .then(res => res.json())
            .then(data => {
                state.bookings = data;
                renderAdminBookings();
            })
            .catch(err => {
                console.warn('Kunde inte hämta bokningar:', err.message);
                renderAdminBookings();
            });
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ADMIN: FILTRERA BOKNINGAR - Hantera filtrering av bokningar i adminvyn
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────    
    async function fetchAdminBookingsByFilter() {
        const tbody = document.getElementById('admin-bookings-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><div class="loader" style="margin:1rem auto;"></div></td></tr>';

        // Förhämta bilar om cache är tom
        if (state.cars.length === 0) {
            try {
                const carsRes = await apiFetch(`${API_BASE}/cars`);
                state.cars = await carsRes.json();
            } catch (err) {
                console.warn('Kunde inte förhämta bilar:', err.message);
            }
        }

        const endpoint = state.adminBookingsFilter === 'active'
            ? `${API_BASE}/bookings/active`
            : `${API_BASE}/bookings`;

        apiFetch(endpoint)
            .then(res => res.json())
            .then(data => {
                state.bookings = data;
                renderAdminBookings();
            })
            .catch(err => {
                console.warn('Kunde inte hämta bokningar:', err.message);
                renderAdminBookings();
            });
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ADMIN: VISA ANVÄNDBOKNINGAR - Hantera visning av en specifik användares bokningar i en dialog
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────    
    async function openUserBookingsModal(userId, userName) {
        const modal = document.getElementById('user-bookings-modal');
        const tbody = document.getElementById('user-bookings-modal-tbody');
        const usernameSpan = document.getElementById('modal-username');

        if (!modal || !tbody) return;

        if (usernameSpan) usernameSpan.textContent = userName;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;"><div class="loader" style="margin:1rem auto;"></div></td></tr>';
        modal.showModal();

        if (state.cars.length === 0) {
            try {
                const carsRes = await apiFetch(`${API_BASE}/cars`);
                state.cars = await carsRes.json();
            } catch (err) {
                console.warn('Kunde inte förhämta bilar:', err.message);
            }
        }

        try {
            const res = await apiFetch(`${API_BASE}/bookings/user/${userId}`);
            const bookings = await res.json();

            if (!bookings || bookings.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5">Inga bokningar hittades för denna användare.</td></tr>';
                return;
            }

            tbody.innerHTML = bookings.map(booking => {
                const carObj = state.cars.find(c => c.id === booking.carId);
                const carInfo = carObj
                    ? `${carObj.name} ${carObj.model || ''}`.trim()
                    : `Bil #${booking.carId}`;
                const isActive = booking.active;
                const statusBadge = isActive
                    ? `<span class="status-active">Aktiv</span>`
                    : `<span class="status-inactive">Avslutad</span>`;

                return `
                    <tr>
                        <td>${booking.id}</td>
                        <td>${carInfo}</td>
                        <td>${booking.fromDate || '-'}</td>
                        <td>${booking.toDate || '-'}</td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            console.warn('Kunde inte hämta bokningar för användaren:', err.message);
            if (err.status === 404) {
                tbody.innerHTML = '<tr><td colspan="5">Inga bokningar hittades för denna användare.</td></tr>';
            } else {
                tbody.innerHTML = '<tr><td colspan="5">Kunde inte hämta bokningar.</td></tr>';
                showToast('Kunde inte hämta bokningar för användaren.', 'error');
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ADMIN: RENDERA BOKNINGAR - Bygg och rendera bokningar i admin-tabellen
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    function renderAdminBookings() {
        const tbody = document.getElementById('admin-bookings-tbody');
        if (!tbody) return;

        let sorted = [...state.bookings];
        sorted.sort((a, b) => {
            const resolveValue = (item, key) => {
                if (key === 'car') {
                    const carObj = item.car || state.cars.find(c => c.id === item.carId);
                    return carObj ? `${carObj.name || ''} ${carObj.model || ''}`.trim() : item.carId || '';
                }
                if (key === 'user') return item.user?.username || item.userId || '';
                if (key === 'startDate') return item.fromDate || '';
                if (key === 'endDate') return item.toDate || '';
                return item[key] || '';
            };
            let v1 = resolveValue(a, state.adminBookingsSortBy);
            let v2 = resolveValue(b, state.adminBookingsSortBy);
            if (typeof v1 === 'string') v1 = v1.toLowerCase();
            if (typeof v2 === 'string') v2 = v2.toLowerCase();
            if (v1 < v2) return state.adminBookingsSortDesc ? 1 : -1;
            if (v1 > v2) return state.adminBookingsSortDesc ? -1 : 1;
            return 0;
        });

        // Om inga bokningar hittades, visa ett meddelande i tabellen
        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">Inga bokningar hittades.</td></tr>';
            return;
        }

        // Bygg HTML-innehållet för varje bokning i tabellen
        tbody.innerHTML = sorted.map(booking => {
            const carObj = booking.car || state.cars.find(c => c.id === booking.carId);
            const carInfo = carObj ? `${carObj.name || ''} ${carObj.model || ''}`.trim() : `Bil #${booking.carId}`;
            const userInfo = booking.user ? booking.user.username : booking.userId || '-';
            const isActive = booking.active;
            const statusBadge = isActive
                ? `<span class="status-active">Aktiv</span>`
                : `<span class="status-inactive">Avslutad</span>`;
            const returnBtn = isActive
                ? `<button class="btn-icon btn-secondary return-booking-btn"
                               data-id="${booking.id}"
                               aria-label="Återlämna bokning ${booking.id}"
                               title="Återlämna">
                           <i class="bi bi-arrow-return-left" aria-hidden="true"></i>
                       </button>`
                : '';
            return `
            <tr>
                <td>${booking.id}</td>
                <td>${carInfo}</td>
                <td>${userInfo}</td>
                <td>${booking.fromDate || '-'}</td>
                <td>${booking.toDate || '-'}</td>
                <td>${statusBadge}</td>
                <td style="white-space: nowrap;">
                    <button class="btn-icon edit-booking-btn" data-id="${booking.id}"
                            aria-label="Redigera bokning ${booking.id}" title="Redigera">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="btn-icon danger delete-booking-btn" data-id="${booking.id}"
                            aria-label="Ta bort bokning ${booking.id}" title="Ta bort">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    ${returnBtn}
                </td>
            </tr>
        `;
        }).join('');

        updateAriaSortHeaders('admin-bookings-table', state.adminBookingsSortBy, state.adminBookingsSortDesc);
    }

    // Funktion för att hämta användarens bokningar från API:et
    async function fetchUserBookings() {
        const tbody = document.getElementById('user-bookings-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;"><div class="loader" style="margin: 1rem auto;"></div></td></tr>';

        // Ladda bilar om cache är tom — vänta på resultatet
        if (!state.currentUser) {
            tbody.innerHTML = '<tr><td colspan="4">Logga in för att se dina bokningar.</td></tr>';
            return;
        }

        // Ladda bilar om cache är tom — vänta på resultatet
        if (state.cars.length === 0) {
            try {
                const carsRes = await apiFetch(`${API_BASE}/cars`);
                state.cars = await carsRes.json();
            } catch (err) {
                console.warn('Kunde inte förhämta bilar:', err.message);
            }
        }

        // Hämta användarens bokningar från API:et
        apiFetch(`${API_BASE}/bookings/me`)
            .then(res => res.json())
            .then(data => {
                state.userBookings = data;
                renderUserBookings();
            })
            .catch(err => {
                console.warn('Kunde inte hämta dina bokningar:', err.message);
                if (err.status === 404) {
                    state.userBookings = [];
                    const noBookingTbody = document.getElementById('user-bookings-tbody');
                    if (noBookingTbody) {
                        noBookingTbody.innerHTML = '<tr><td colspan="4">Du har inga bokningar.</td></tr>';
                    }
                } else {
                    showToast('Kunde inte hämta bokningar.', 'error');
                }
            });
    }

    // Funktion för att rendera användarens bokningar i listan
    function renderUserBookings() {
        const tbody = document.getElementById('user-bookings-tbody');
        if (!tbody) return;
        if (!state.currentUser) {
            tbody.innerHTML = '<tr><td colspan="6">Logga in för att se dina bokningar.</td></tr>';
            return;
        }

        const bookings = state.userBookings;

        // Om inga bokningar hittades, visa ett meddelande i listan
        if (!bookings || bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Du har inga bokningar.</td></tr>';
            return;
        }

        // Bygg HTML-innehållet för varje bokning i listan
        tbody.innerHTML = bookings.map(booking => {
            const carObj = state.cars.find(c => c.id === booking.carId);
            const carInfo = carObj ? `${carObj.name} ${carObj.model || ''}`.trim() : `Bil #${booking.carId}`;
            const isActive = booking.active;
            const statusBadge = isActive
                ? `<span class="status-active">Aktiv</span>`
                : `<span class="status-inactive">Avslutad</span>`;
            const returnBtn = isActive
                ? `<button class="btn btn-secondary return-car-btn" data-id="${booking.id}"
                           aria-label="Återlämna bokning ${booking.id}">Återlämna</button>`
                : `<span style="color: var(--text-muted); font-size: 0.85rem;">—</span>`;
            return `
                <tr>
                    <td>${booking.id}</td>
                    <td>${carInfo}</td>
                    <td>${booking.fromDate || '-'}</td>
                    <td>${booking.toDate || '-'}</td>
                    <td>${statusBadge}</td>
                    <td>${returnBtn}</td>
                </tr>
            `;
        }).join('');
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SYSTEMMEDDELANDEN (TOASTS)
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    function showToast(message, type = 'success') {
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
    }
    
    updateNavVisibility();
});