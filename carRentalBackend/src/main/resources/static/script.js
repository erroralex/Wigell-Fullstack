// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// TILLSTÅNDSHANTERING - All applikationsdata och sorteringsstatus på ett ställe
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
// ANNONSER - Statiska annonskort som injiceras var 5:e kort i galleriet
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const ADS = [
    {
        title: 'Wigell Camping',
        tagline: 'Natur på riktigt',
        features: ['Tält och friluftsutrustning', 'Husbilar och husvagnar', 'Familjevänligt'],
        image: './images/wigell_camping_ad.png',
        url: 'https://wigellcamping.se'
    },    
    {
        title: 'SPRAY-ON SLIPS',
        tagline: 'Skräddarsy din stil på sekunder!',
        features: ['Enkel att tvätta bort', 'Torr på minuter', 'Oändliga designmöjligheter'],
        image: './images/spray_on_ad.png',
        url: 'https://spray-on.se'
    },
    {
        title: 'Wigell Padel',
        tagline: 'Boka din nästa match',
        features: ['Inomhus & utomhus', 'Öppet 06-22', 'Utrustning uthyres'],
        image: './images/wigell_padel_ad.png',
        url: 'https://wigellpadel.se'
    }    
];


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// DATAHJÄLPARE - Funktioner för att sortera, hämta och säkerställa att data finns
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


function toggleSortState(sortKey, descKey, value) {
    if (state[sortKey] === value) {
        state[descKey] = !state[descKey];
    } else {
        state[sortKey] = value;
        state[descKey] = false;
    }
}


async function ensureCarsLoaded() {
    if (state.cars && state.cars.length > 0) return;
    try {
        const response = await apiFetch(`${API_BASE}/cars`);
        state.cars = await response.json();
    } catch (error) {
        console.warn('Kunde inte förhämta bilar:', error.message);
    }
}


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// UI-hjälpare - Funktioner för att hantera användargränssnittet
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id)?.showModal();
}


function closeModal(id) {
    document.getElementById(id)?.close();
}


// Uppdaterar sorteringsindikatorer och aria-sort på tabellhuvuden
function updateAriaSortHeaders(tableId, sortBy, sortDesc) {
    document.querySelectorAll(`#${tableId} th.sortable`).forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        th.removeAttribute('aria-sort');
        if (th.getAttribute('data-col') === sortBy) {
            const direction = sortDesc ? 'descending' : 'ascending';
            th.classList.add(sortDesc ? 'sort-desc' : 'sort-asc');
            th.setAttribute('aria-sort', direction);
        } else {
            th.setAttribute('aria-sort', 'none');
        }
    });
}


// Funktion för att visa laddningsindikator i tabell
function setTableLoader(tbodyId, colSpan) {
    const tbody = document.getElementById(tbodyId);
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;"><div class="loader" style="margin:1rem auto;"></div></td></tr>`;
    }
    return tbody;
}


// Toast-funktion för att visa meddelanden
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


// Hantera formulärinlämningar asynkront
async function handleAsyncSubmit(e, options) {
    e.preventDefault();
    const { form, submitLogic, successMsg, onSuccess, loadingText = 'Sparar...' } = options;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = loadingText;
    }

    try {
        await submitLogic();
        if (successMsg) showToast(successMsg, 'success');
        
        const modal = form.closest('dialog');
        if (modal) modal.close();
        form.reset();
        
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error(error);
        showToast(error.serverMessage || 'Ett fel uppstod. Försök igen.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// API och session - Funktioner för att hantera API-anrop och användarsession
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8080/api/v1';


// Sparar användarsession i localStorage
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


// Laddar användarsession från localStorage
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


// Funktion som paketerar fetch-anrop och hanterar autentisering, JSON-body och fel
async function apiFetch(url, opts = {}) {
    const headers = {...opts.headers};
    if (state.credentials) headers['Authorization'] = `Basic ${state.credentials}`;
    if (opts.body && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const response = await fetch(url, { ...opts, headers, credentials: 'include' });

    if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        try {
            const body = await response.clone().json();
            error.serverMessage = body.error || body.message || null;
        } catch (_) {}
        throw error;
    }
    return response;
}


// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// HUVUDLOGIK - DOMContentLoaded
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    loadSession();

    // Viktiga DOM-element
    const topNavLinks = document.querySelectorAll('header .nav-link');
    const sections = document.querySelectorAll('main > .page-section');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-links');

    const resetAllCodeToggles = () => {
        document.querySelectorAll('.code-wrapper.is-open').forEach(wrapper => wrapper.classList.remove('is-open'));
        document.querySelectorAll('.toggle-code-btn').forEach(btn => btn.innerHTML = 'Visa kod &lt;/&gt;');
    };


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


    // Uppdatera navigationsmenyn baserat på inloggningsstatus och roll
    const updateNavVisibility = () => {
        const navLogin = document.getElementById('nav-login');
        const navProfile = document.getElementById('nav-profile');
        const navAdmin = document.getElementById('nav-admin');
        const navStyleguide = document.getElementById('nav-styleguide');
        const profileName = document.getElementById('nav-profile-name');

        if (state.currentUser) {
            if (navLogin) navLogin.classList.add('d-none');
            if (navProfile) navProfile.classList.remove('d-none');
            if (profileName) profileName.textContent = state.currentUser.firstName || state.currentUser.username || 'Profil';

            if (state.currentUser.isAdmin) {
                if (navAdmin) navAdmin.classList.remove('d-none');
                if (navStyleguide) navStyleguide.classList.remove('d-none');
            } else {
                if (navAdmin) navAdmin.classList.add('d-none');
                if (navStyleguide) navStyleguide.classList.add('d-none');
            }
        } else {
            if (navLogin) navLogin.classList.remove('d-none');
            if (navProfile) navProfile.classList.add('d-none');
            if (navAdmin) navAdmin.classList.add('d-none');
            if (navStyleguide) navStyleguide.classList.add('d-none');
        }
    };


    // Navigationsfunktion som visar rätt sektion och laddar data vid behov
    const navigateTo = (targetId) => {
        const isSubSection = ['branding', 'components', 'forms-tables', 'feedback', 'css'].includes(targetId);
        let actualSectionId = targetId;
        const adminViews = ['admin-cars', 'admin-styleguide', 'admin-users', 'admin-bookings', 'branding', 'components', 'forms-tables', 'feedback', 'css'];

        if (adminViews.includes(actualSectionId) && !state.currentUser?.isAdmin) {
            showToast('Åtkomst nekad. Logga in som admin.', 'error');
            actualSectionId = 'login';
        }

        resetAllCodeToggles();

        topNavLinks.forEach(link => {
            link.classList.remove('active');
            let href = link.getAttribute('href');
            if (href === '#' + actualSectionId || (isSubSection && href === '#admin-styleguide')) {
                link.classList.add('active');
            }
        });

        sections.forEach(sec => {
            sec.classList.remove('active');
            if (sec.id === actualSectionId) sec.classList.add('active');
        });

        window.scrollTo({top: 0, behavior: 'smooth'});

        if (actualSectionId === 'cars') fetchCars();
        if (actualSectionId === 'admin-cars') fetchCars('admin');
        if (actualSectionId === 'admin-users') fetchAdminUsers();
        if (actualSectionId === 'admin-bookings') fetchAdminBookingsByFilter();
        if (actualSectionId === 'mina-sidor') fetchUserBookings();

        if (actualSectionId === 'login') {
            setTimeout(() => {
                const usernameInput = document.getElementById('username');
                if (usernameInput) usernameInput.focus();
            }, 100);
        }
    };


    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // KLICK-HANTERARE - Hanterar alla klick på sidan och avgör vad som ska göras baserat på vad som klickats på
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────    
    function handleRouting(e) {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return false;

        // Hantera utloggning
        const href = link.getAttribute('href');
        if (href === '#logout') {
            e.preventDefault();
            state.currentUser = null;
            state.credentials = null;
            saveSession();
            updateNavVisibility();
            navigateTo('cars');
            showToast('Utloggad', 'success');
            closeMenu();
            return true;
        }

        // Om det är en intern länk som börjar med #, navigera till sektionen
        if (href.length > 1) {
            e.preventDefault();
            const targetId = href.substring(1);
            navigateTo(targetId);
            const isSubSection = ['intro', 'branding', 'components', 'forms-tables', 'feedback', 'css'].includes(targetId);
            if (isSubSection) {
                setTimeout(() => {
                    const el = document.getElementById(targetId);
                    if (el) window.scrollTo({top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth'});
                }, 50);
            }
            closeMenu();
            return true;
        }
        return false;
    }

    // Hantera dialoger, kodexempel och dropdowns
    function handleModalsAndUI(e) {
        const closeBtnIds = ['close-modal-btn', 'close-add-car-btn', 'close-register-btn', 'close-edit-user-btn', 'close-edit-booking-btn', 'close-user-bookings-modal-btn'];
        const clickedCloseBtn = e.target.closest(closeBtnIds.map(id => `#${id}`).join(', '));
        
        // Hantera alla stäng-knappar för dialoger
        if (clickedCloseBtn) {
            const modal = clickedCloseBtn.closest('dialog');
            const form = modal?.querySelector('form');
            if (modal) modal.close();
            if (form) form.reset();
            return true;
        }

        // Hantera kodexempel-toggle
        if (e.target.classList.contains('toggle-code-btn')) {
            const codeWrapper = e.target.nextElementSibling;
            if (codeWrapper) {
                const isOpen = codeWrapper.classList.toggle('is-open');
                e.target.innerHTML = isOpen ? 'Dölj kod &#8743;' : 'Visa kod &lt;/&gt;';
            }
            return true;
        }

        // Hantera dropdowns i Styleguide-sektionen
        const demoModalTrigger = e.target.closest('.demo-modal-trigger');
        if (demoModalTrigger) {
            openModal(demoModalTrigger.getAttribute('data-target'));
            return true;
        }

        // Hantera dropdowns i navigationsmenyn
        const dropdownTrigger = e.target.closest('.example-nav-item > .nav-link');
        if (dropdownTrigger && dropdownTrigger.nextElementSibling?.classList.contains('sub-nav')) {
            if (dropdownTrigger.getAttribute('href') === '#') e.preventDefault();
            const isExpanded = dropdownTrigger.getAttribute('aria-expanded') === 'true';
            document.querySelectorAll('.example-nav-item > .nav-link').forEach(t => t.setAttribute('aria-expanded', 'false'));
            dropdownTrigger.setAttribute('aria-expanded', String(!isExpanded));
            return true;
        }
        
        if (!e.target.closest('.example-nav-item')) {
            document.querySelectorAll('.example-nav-item > .nav-link').forEach(t => t.setAttribute('aria-expanded', 'false'));
        }

        return false;
    }


    // Hantera sortering av tabeller och galleriet
    function handleSorting(e) {
        const sortableTh = e.target.closest('th.sortable');
        if (sortableTh) {
            const table = sortableTh.closest('table');
            const configMap = {
                'admin-cars-table': { by: 'adminSortBy', desc: 'adminSortDesc', render: renderAdminCars },
                'admin-users-table': { by: 'adminUsersSortBy', desc: 'adminUsersSortDesc', render: renderAdminUsers },
                'admin-bookings-table': { by: 'adminBookingsSortBy', desc: 'adminBookingsSortDesc', render: renderAdminBookings }
            };
            
            if (table && configMap[table.id]) {
                const config = configMap[table.id];
                const col = sortableTh.getAttribute('data-col');
                toggleSortState(config.by, config.desc, col);
                config.render();
                return true;
            }
        }

        // Hantera sortering i bil-galleriet
        const sortCarBtn = e.target.closest('.sort-cars-btn');
        if (sortCarBtn) {
            toggleSortState('carSortBy', 'carSortDesc', sortCarBtn.getAttribute('data-sort'));
            document.querySelectorAll('.sort-cars-btn').forEach(btn => {
                const isActive = btn.getAttribute('data-sort') === state.carSortBy;
                btn.classList.toggle('active-sort', isActive);
                btn.setAttribute('aria-pressed', String(isActive));
            });
            renderGallery();
            return true;
        }

        // Hantera filterknappar i admin-bokningsvyn
        const bookingFilterBtn = e.target.closest('.booking-filter-btn');
        if (bookingFilterBtn) {
            state.adminBookingsFilter = bookingFilterBtn.getAttribute('data-filter');
            document.querySelectorAll('.booking-filter-btn').forEach(btn => {
                const isActive = btn.getAttribute('data-filter') === state.adminBookingsFilter;
                btn.classList.toggle('active-sort', isActive);
                btn.setAttribute('aria-pressed', String(isActive));
            });
            fetchAdminBookingsByFilter();
            return true;
        }

        return false;
    }


    function handleAdminActions(e) {
        // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        // ADMIN - Boka bil
        // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        const card = e.target.closest('.float-card');
        const bookBtn = e.target.closest('.book-car-btn') || (card ? card.querySelector('.book-car-btn') : null);
        if (bookBtn && !bookBtn.disabled) {
            if (!state.currentUser) {
                showToast('Du måste vara inloggad för att boka.', 'error');
                navigateTo('login');
                return true;
            }
            document.getElementById('booking-car-id').value = bookBtn.getAttribute('data-id');
            document.getElementById('booking-car-name').innerText = bookBtn.getAttribute('data-name');
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('start-date').min = today;
            document.getElementById('end-date').min = today;
            openModal('booking-modal');
            return true;
        }


        // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        // ADMIN - Lägg till bil
        // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        const openAddCarBtn = e.target.closest('#open-add-car-btn');
        if (openAddCarBtn) {
            document.getElementById('edit-car-id').value = '';
            document.getElementById('add-car-title').innerText = 'Lägg till ny bil';
            document.getElementById('add-car-submit-btn').textContent = 'Spara bil';
            document.getElementById('add-car-form')?.reset();
            openModal('add-car-modal');
            return true;
        }

        
        // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        // ADMIN - Redigera bil
        // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        const editCarBtn = e.target.closest('.edit-car-btn');
        if (editCarBtn) {
            const car = state.cars.find(c => c.id == editCarBtn.getAttribute('data-id'));
            if (car) {
                document.getElementById('edit-car-id').value = car.id;
                document.getElementById('add-car-title').innerText = 'Redigera bil';
                document.getElementById('add-car-submit-btn').textContent = 'Spara ändringar';
                ['name', 'model', 'type', 'price', 'feature1', 'feature2', 'feature3'].forEach(field => {
                    const el = document.getElementById(field);
                    if (el) el.value = car[field] || '';
                });
                openModal('add-car-modal');
            }
            return true;
        }


        // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        // ADMIN - Redigera användare
        // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        const editUserBtn = e.target.closest('.edit-user-btn');
        if (editUserBtn) {
            const user = state.users.find(u => u.id == editUserBtn.getAttribute('data-id'));
            if (user) {
                document.getElementById('edit-user-id').value = user.id;
                ['username', 'firstName', 'lastName', 'phone', 'email'].forEach(field => {
                    const el = document.getElementById(`edit-user-${field.toLowerCase()}`);
                    if (el) el.value = user[field] || '';
                });
                document.getElementById('edit-user-role').value = user.role || 'ROLE_USER';
                openModal('edit-user-modal');
            }
            return true;
        }


        // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        // ADMIN - Redigera bokning
        // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        const editBookingBtn = e.target.closest('.edit-booking-btn');
        if (editBookingBtn) {
            const booking = state.bookings.find(b => b.id == editBookingBtn.getAttribute('data-id'));
            if (booking) {
                document.getElementById('edit-booking-id').value = booking.id;
                document.getElementById('edit-booking-start').value = booking.fromDate || '';
                const endInput = document.getElementById('edit-booking-end');
                endInput.value = booking.toDate || '';
                endInput.min = booking.fromDate || '';
                openModal('edit-booking-modal');
            }
            return true;
        }


        // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        // ADMIN - Visa bokningar för användare
        // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        const viewUserBookingsBtn = e.target.closest('.view-user-bookings-btn');
        if (viewUserBookingsBtn) {
            openUserBookingsModal(viewUserBookingsBtn.getAttribute('data-id'), viewUserBookingsBtn.getAttribute('data-name'));
            return true;
        }
        return false;
    }


    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ADMIN - Hantera borttagning av bilar, användare och bokningar samt återlämning av bilar
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    function handleDeletionsAndReturns(e) {
        const handleDeleteOrReturn = (btn, confirmData) => {
            if (btn) {
                showConfirmModal(confirmData);
                return true;
            }
            return false;
        };
        
        // Ta bort bil
        if (handleDeleteOrReturn(e.target.closest('.delete-car-btn'), {
            title: 'Ta bort bil',
            message: `Vill du verkligen ta bort ${e.target.closest('.delete-car-btn')?.getAttribute('data-name')}?`,
            confirmLabel: 'Ja, ta bort',
            onConfirm: async () => {
                await apiFetch(`${API_BASE}/cars/${e.target.closest('.delete-car-btn').getAttribute('data-id')}`, { method: 'DELETE' });
                showToast('Bilen har tagits bort', 'success');
                fetchCars('admin');
                fetchCars();
            }
        })) return true;

        // Ta bort användare
        if (handleDeleteOrReturn(e.target.closest('.delete-user-btn'), {
            title: 'Ta bort användare',
            message: `Vill du verkligen ta bort ${e.target.closest('.delete-user-btn')?.getAttribute('data-name')}?`,
            confirmLabel: 'Ja, ta bort',
            onConfirm: async () => {
                await apiFetch(`${API_BASE}/users/${e.target.closest('.delete-user-btn').getAttribute('data-id')}`, { method: 'DELETE' });
                showToast('Användaren togs bort', 'success');
                fetchAdminUsers();
            }
        })) return true;

        // Ta bort bokning
        if (handleDeleteOrReturn(e.target.closest('.delete-booking-btn'), {
            title: 'Ta bort bokning',
            message: 'Vill du verkligen ta bort bokningen?',
            confirmLabel: 'Ja, ta bort',
            onConfirm: async () => {
                await apiFetch(`${API_BASE}/bookings/${e.target.closest('.delete-booking-btn').getAttribute('data-id')}`, { method: 'DELETE' });
                showToast('Bokningen togs bort', 'success');
                fetchAdminBookingsByFilter();
                fetchUserBookings();
            }
        })) return true;

        // Återlämna bil
        const returnBtn = e.target.closest('.return-booking-btn') || e.target.closest('.return-car-btn');
        if (handleDeleteOrReturn(returnBtn, {
            title: 'Återlämna bil',
            message: 'Bekräfta att du vill återlämna denna bokning.',
            confirmLabel: 'Ja, återlämna',
            onConfirm: async () => {
                await apiFetch(`${API_BASE}/bookings/return/${returnBtn.getAttribute('data-id')}`, { method: 'PUT' });
                showToast('Bilen har återlämnats!', 'success');
                fetchAdminBookingsByFilter();
                fetchUserBookings();
                fetchCars();
            }
        })) return true;

        return false;
    }


    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Global klickhanterare - Hanterar alla klick på sidan och delegerar till rätt funktion
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────    
    document.body.addEventListener('click', (e) => {
        if (handleRouting(e)) return;
        if (handleModalsAndUI(e)) return;
        if (handleSorting(e)) return;
        if (handleAdminActions(e)) return;
        if (handleDeletionsAndReturns(e)) return;
    });

    // Vid sidladdning, navigera till rätt sektion baserat på URL-hash eller default till "cars"
    const currentHash = window.location.hash.substring(1);
    if (currentHash) navigateTo(currentHash);
    else navigateTo('cars');


    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Bekräftelsedialoglogik
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    let confirmActionCallback = null;

    // Visar en bekräftelse-dialog med anpassat meddelande och callback-funktion för när användaren bekräftar
    function showConfirmModal({title, message, confirmLabel = 'Ja, fortsätt', onConfirm}) {
        document.getElementById('confirm-action-title').textContent = title;
        document.getElementById('confirm-action-message').textContent = message;
        const confirmBtn = document.getElementById('confirm-action-btn');
        confirmBtn.textContent = confirmLabel;
        confirmBtn.disabled = false;
        confirmActionCallback = onConfirm;
        openModal('confirm-action-modal');
    }


    // Hantera klick på bekräfta-knappen i bekräftelse-dialogen
    document.getElementById('confirm-action-btn')?.addEventListener('click', async (e) => {
        if (!confirmActionCallback) return;
        const btn = e.target;
        const originalLabel = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Vänta...';
        try {
            await confirmActionCallback();
        } catch (error) {
            console.error(error);
            showToast(error.serverMessage || 'Åtgärden misslyckades.', 'error');
        } finally {
            closeModal('confirm-action-modal');
            confirmActionCallback = null;
            btn.textContent = originalLabel;
            btn.disabled = false;
        }
    });


    // Hantera klick på avbryt-knappen i bekräftelse-dialogen och stäng dialogen
    document.getElementById('cancel-action-btn')?.addEventListener('click', () => {
        closeModal('confirm-action-modal');
        confirmActionCallback = null;
    });


    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Formulärhantering - Datumbegränsningar, asynkrona formulärinlämningar och validering
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────    
    document.querySelectorAll('input[type="date"][id$="-start"], input[type="date"][id="start-date"]').forEach(input => {
        input.addEventListener('change', function () {
            const endInput = document.getElementById(this.id.replace('start', 'end'));
            if (endInput) endInput.min = this.value;
        });
    });


    // Hantera bokningsformuläret
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;

            if (endDate <= startDate) {
                e.preventDefault();
                showToast('Minsta hyrtid är en dag — välj ett slutdatum efter startdatumet.', 'error');
                return;
            }

            handleAsyncSubmit(e, {
                form: bookingForm,
                loadingText: 'Bokar...',
                successMsg: 'Bokning genomförd!',
                submitLogic: async () => {
                    await apiFetch(`${API_BASE}/bookings`, {
                        method: 'POST',
                        body: JSON.stringify({
                            carId: parseInt(document.getElementById('booking-car-id').value),
                            userId: state.currentUser.id,
                            fromDate: startDate,
                            toDate: endDate
                        })
                    });
                },
                onSuccess: fetchCars
            });
        });
    }


    // Hantera formuläret för att lägga till eller redigera bilar
    const addCarForm = document.getElementById('add-car-form');
    if (addCarForm) {
        addCarForm.addEventListener('submit', (e) => {
            const editId = document.getElementById('edit-car-id').value;
            handleAsyncSubmit(e, {
                form: addCarForm,
                successMsg: `Bilen har ${editId ? 'uppdaterats' : 'lagts till'}!`,
                submitLogic: async () => {
                    const method = editId ? 'PUT' : 'POST';
                    const endpoint = editId ? `${API_BASE}/cars/${editId}` : `${API_BASE}/cars`;
                    const fileInput = document.getElementById('car-image');
                    let fetchOptions = { method };

                    const existingCar = editId ? state.cars.find(c => c.id == editId) : null;
                    const isBooked = existingCar ? existingCar.booked : false;

                    if (method === 'POST') {
                        const formData = new FormData();
                        ['name', 'model', 'type', 'price', 'feature1', 'feature2', 'feature3'].forEach(f => 
                            formData.append(f, document.getElementById(f)?.value || '')
                        );
                        formData.append('booked', isBooked);
                        if (fileInput?.files.length > 0) formData.append('image', fileInput.files[0]);
                        fetchOptions.body = formData;
                    } else {
                        const carData = {
                            id: parseInt(editId),
                            name: document.getElementById('name').value,
                            model: document.getElementById('model').value,
                            type: document.getElementById('type').value,
                            price: parseFloat(document.getElementById('price').value),
                            feature1: document.getElementById('feature1')?.value || '',
                            feature2: document.getElementById('feature2')?.value || '',
                            feature3: document.getElementById('feature3')?.value || '',
                            booked: isBooked,
                            image: existingCar?.image || null
                        };

                        if (fileInput?.files.length > 0) {
                            carData.image = await new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result.split(',')[1]);
                                reader.onerror = reject;
                                reader.readAsDataURL(fileInput.files[0]);
                            });
                        }
                        fetchOptions.body = JSON.stringify(carData);
                    }
                    await apiFetch(endpoint, fetchOptions);
                },
                onSuccess: () => { fetchCars('admin'); fetchCars(); }
            });
        });
    }


    // Hantera registreringsformuläret för ny användare
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            const username = document.getElementById('register-username').value.trim();
            handleAsyncSubmit(e, {
                form: registerForm,
                loadingText: 'Skapar...',
                successMsg: 'Konto skapat',
                submitLogic: async () => {
                    await apiFetch(`${API_BASE}/users`, {
                        method: 'POST',
                        body: JSON.stringify({
                            username,
                            firstName: document.getElementById('register-firstname').value.trim(),
                            lastName: document.getElementById('register-lastname').value.trim(),
                            phone: document.getElementById('register-phone').value.trim(),
                            email: document.getElementById('register-email').value.trim(),
                            password: document.getElementById('register-password').value,
                            role: 'ROLE_USER',
                            noOfOrders: 0
                        })
                    });
                },
                onSuccess: () => {
                    const loginUsername = document.getElementById('username');
                    if (loginUsername) {
                        loginUsername.value = username;
                        loginUsername.focus();
                    }
                }
            });
        });
    }


    // Hantera formuläret för att redigera användare
    const editUserForm = document.getElementById('edit-user-form');
    if (editUserForm) {
        editUserForm.addEventListener('submit', (e) => {
            handleAsyncSubmit(e, {
                form: editUserForm,
                successMsg: 'Användaren uppdaterades',
                submitLogic: async () => {
                    await apiFetch(`${API_BASE}/users/${document.getElementById('edit-user-id').value}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            username: document.getElementById('edit-user-username').value.trim(),
                            firstName: document.getElementById('edit-user-firstname').value.trim(),
                            lastName: document.getElementById('edit-user-lastname').value.trim(),
                            phone: document.getElementById('edit-user-phone').value.trim(),
                            email: document.getElementById('edit-user-email').value.trim(),
                            role: document.getElementById('edit-user-role').value
                        })
                    });
                },
                onSuccess: fetchAdminUsers
            });
        });
    }


    // Hantera formuläret för att redigera bokningar
    const editBookingForm = document.getElementById('edit-booking-form');
    if (editBookingForm) {
        editBookingForm.addEventListener('submit', (e) => {
            const startDate = document.getElementById('edit-booking-start').value;
            const endDate = document.getElementById('edit-booking-end').value;

            if (endDate <= startDate) {
                e.preventDefault();
                showToast('Slutdatum måste vara efter startdatum.', 'error');
                return;
            }

            handleAsyncSubmit(e, {
                form: editBookingForm,
                successMsg: 'Bokningen uppdaterades',
                submitLogic: async () => {
                    await apiFetch(`${API_BASE}/bookings/${document.getElementById('edit-booking-id').value}`, {
                        method: 'PUT',
                        body: JSON.stringify({ fromDate: startDate, toDate: endDate })
                    });
                },
                onSuccess: () => { fetchAdminBookingsByFilter(); fetchUserBookings(); }
            });
        });
    }


    // Hantera inloggningsformuläret, autentisera användaren och spara sessionen
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errorElement = document.getElementById('login-error');
            const btn = loginForm.querySelector('button[type="submit"]');

            errorElement.style.display = 'none';
            if (btn) { btn.disabled = true; btn.textContent = 'Loggar in…'; }

            try {
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify({username, password}),
                });

                if (!response.ok) throw new Error('unauthorized');

                const data = await response.json();
                state.currentUser = { id: data.userId, username: data.username, firstName: data.firstName || null, isAdmin: data.isAdmin };
                state.credentials = btoa(`${username}:${password}`);

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
            } catch (error) {
                errorElement.style.display = 'block';
                state.currentUser = null;
                state.credentials = null;
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = 'Logga in'; }
            }
        });
    }


    // Hantera klick på "Skapa Konto"-knappen
    document.getElementById('open-register-btn')?.addEventListener('click', () => {
        openModal('register-modal');
        setTimeout(() => document.getElementById('register-username')?.focus(), 50);
    });

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // KODEXEMPEL - Hantera visning och kopiering av kodexempel i Styleguide-sektionen
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
    // Hämt- och visningsfunktioner (API) - Funktioner som hämtar data från API:et och visar det i olika format
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────    
    function fetchCars(renderTarget = 'gallery') {
        if (renderTarget === 'gallery') {
            const container = document.getElementById('cars-container');
            if (container) container.innerHTML = '<div class="loader" style="margin: 2rem auto;"></div>';
        } else {
            setTableLoader('admin-cars-tbody', 6);
        }

        apiFetch(`${API_BASE}/cars`)
            .then(response => response.json())
            .then(data => {
                state.cars = data;
                renderTarget === 'admin' ? renderAdminCars() : renderGallery();
            })
            .catch(error => {
                console.warn('Kunde inte hämta bilar:', error.message);
                if (renderTarget === 'gallery') {
                    showToast('Kunde inte nå servern.', 'error');
                    state.cars = [];
                    renderGallery();
                } else {
                    renderAdminCars();
                }
            });
    }


    // Renderar en enkel SVG som platshållare för bilar utan bild, med anpassningsbar färg
    function renderPlaceholderSVG(color = '#e69d67') {
        return `<svg viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="width:80%;height:80%;opacity:0.25;">
            <rect x="5" y="22" width="110" height="34" rx="5" fill="none" stroke="${color}" stroke-width="2"/>
            <polygon points="18,22 28,6 92,6 102,22" fill="none" stroke="${color}" stroke-width="2"/>
            <circle cx="28" cy="58" r="8" fill="none" stroke="${color}" stroke-width="2"/>
            <circle cx="92" cy="58" r="8" fill="none" stroke="${color}" stroke-width="2"/>
            <rect x="42" y="10" width="36" height="12" rx="2" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5"/>
        </svg>`;
    }

    // Bygger HTML-strukturen för ett bilkort i galleriet, inklusive bild, titel, pris, specifikationer och bokningsknapp
    function buildFloatCard(car) {
        const imgContent = car.image
            ? `<img src="data:image/png;base64,${car.image}" alt="Foto av ${car.name}${car.model ? ' ' + car.model : ''}" style="width:80%;height:80%;object-fit:contain;">`
            : renderPlaceholderSVG('#e69d67');

        const feats = [car.feature1, car.feature2, car.feature3].filter(Boolean);
        const specsHTML = feats.length ? `<ul class="car-specs">${feats.map(f => `<li>${f}</li>`).join('')}</ul>` : '';
        const ctaBtn = car.booked
            ? `<button class="float-card__cta float-card__cta--booked" disabled aria-disabled="true">BOKAD</button>`
            : `<button class="float-card__cta book-car-btn" data-id="${car.id}" data-name="${(car.name + ' ' + (car.model || '')).trim()}" aria-label="Boka ${car.name}">BOKA</button>`;

        return `
            <article class="float-card" aria-label="${car.name}${car.model ? ' ' + car.model : ''} – ${car.type || 'Okänd typ'}">
              <div class="car-badge" style="color:var(--color-function); border-color:var(--color-function);">${car.type || 'Okänd'}</div>
              <div class="car-img">${imgContent}</div>
              <div class="car-body">
                <div class="car-title" style="color:var(--accent);">${car.name.toUpperCase()}${car.model ? ' ' + car.model.toUpperCase() : ''}</div>
                <div class="car-price"><strong>${car.price.toLocaleString('sv-SE')}</strong> kr/dag</div>
                ${specsHTML}${ctaBtn}
              </div>
            </article>`;
    }


    // Bygger HTML-strukturen för ett annonsskort – följer samma struktur som buildFloatCard
    function buildAdCard(ad) {
        const imgContent = `<img src="${ad.image}" alt="${ad.title}" style="width:80%;height:80%;object-fit:contain;">`;
        const specsHTML = ad.features?.length
            ? `<ul class="car-specs">${ad.features.map(f => `<li>${f}</li>`).join('')}</ul>`
            : '';

        return `
        <article class="float-card float-card--ad" aria-label="Annons: ${ad.title}">
          <div class="car-badge" style="color:var(--accent);border-color:var(--accent);">Annons</div>
          <div class="car-img">${imgContent}</div>
          <div class="car-body">
            <div class="car-title" style="color:var(--color-function);">${ad.title.toUpperCase()}</div>
            <div class="car-price">${ad.tagline}</div>
            ${specsHTML}
            <a href="${ad.url}" target="_blank" rel="noopener" class="float-card__cta float-card__cta--ad">LÄS MER</a>
          </div>
        </article>`;
    }


    // Bil-galleriet på startsidan, injicerar ett annonsskort var 5:e kort
    function renderGallery() {
        const container = document.getElementById('cars-container');
        if (!container) return;
        if (!state.cars || state.cars.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>Inga bilar tillgängliga just nu. Försök igen senare.</p></div>`;
            return;
        }
        const sorted = sortData(state.cars, state.carSortBy, state.carSortDesc);
        const cards = [];
        sorted.forEach((car, i) => {
            cards.push(buildFloatCard(car));
            if ((i + 1) % 5 === 0) {
                cards.push(buildAdCard(ADS[Math.floor(i / 5) % ADS.length]));
            }
        });
        container.innerHTML = cards.join('');
    }


    // Tabellen över bilar i admin-sektionen
    function renderAdminCars() {
        const tbody = document.getElementById('admin-cars-tbody');
        if (!tbody) return;
        let sorted = sortData(state.cars, state.adminSortBy, state.adminSortDesc);
        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Inga bilar hittades.</td></tr>';
            return;
        }
        tbody.innerHTML = sorted.map(car => `
            <tr>
                <td>${car.id}</td>
                <td><strong>${car.name}</strong></td>
                <td>${car.type}</td>
                <td>${car.price} kr</td>
                <td>${car.booked ? '<span class="status-booked">Bokad</span>' : '<span class="status-free">Ledig</span>'}</td>
                <td style="white-space: nowrap;">
                    <button class="btn-icon edit-car-btn" data-id="${car.id}" aria-label="Redigera ${car.name}" title="Redigera">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="btn-icon danger delete-car-btn" data-id="${car.id}" data-name="${car.name}" aria-label="Ta bort ${car.name}" title="Ta bort">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            </tr>`).join('');
        updateAriaSortHeaders('admin-cars-table', state.adminSortBy, state.adminSortDesc);
    }


    // Tabellen över användare i admin-sektionen
    function fetchAdminUsers() {
        setTableLoader('admin-users-tbody', 7);
        apiFetch(`${API_BASE}/users`)
            .then(response => response.json())
            .then(data => { state.users = data; renderAdminUsers(); })
            .catch(error => { console.warn('Kunde inte hämta användare:', error.message); renderAdminUsers(); });
    }


    // Tabellen över användare i admin-sektionen
    function renderAdminUsers() {
        const tbody = document.getElementById('admin-users-tbody');
        if (!tbody) return;
        let sorted = sortData(state.users, state.adminUsersSortBy, state.adminUsersSortDesc);
        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">Inga användare hittades.</td></tr>';
            return;
        }
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
                    <button class="btn-icon edit-user-btn" data-id="${user.id}" aria-label="Redigera användare ${user.username || user.id}" title="Redigera">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="btn-icon view-user-bookings-btn" data-id="${user.id}" data-name="${user.username}" aria-label="Visa bokningar för ${user.username || user.id}" title="Visa bokningar">
                        <i class="bi bi-file-earmark-text" aria-hidden="true"></i>
                    </button>
                    <button class="btn-icon danger delete-user-btn" data-id="${user.id}" data-name="${user.username}" aria-label="Ta bort användare ${user.username || user.id}" title="Ta bort">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            </tr>`).join('');
        updateAriaSortHeaders('admin-users-table', state.adminUsersSortBy, state.adminUsersSortDesc);
    }


    // Hämtar bokningar baserat på det valda filtret (aktiva eller alla)
    async function fetchAdminBookingsByFilter() {
        setTableLoader('admin-bookings-tbody', 7);
        await ensureCarsLoaded();

        const endpoint = state.adminBookingsFilter === 'active' ? `${API_BASE}/bookings/active` : `${API_BASE}/bookings`;
        apiFetch(endpoint)
            .then(response => response.json())
            .then(data => { state.bookings = data; renderAdminBookings(); })
            .catch(error => { console.warn('Kunde inte hämta bokningar:', error.message); renderAdminBookings(); });
    }


    // Hämtar och visar bokningar för en specifik användare i en dialog, inklusive bilinformation och status
    async function openUserBookingsModal(userId, userName) {
        const usernameSpan = document.getElementById('modal-username');
        if (usernameSpan) usernameSpan.textContent = userName;
        
        const tbody = setTableLoader('user-bookings-modal-tbody', 5);
        openModal('user-bookings-modal');

        await ensureCarsLoaded();

        try {
            const bookings = await (await apiFetch(`${API_BASE}/bookings/user/${userId}`)).json();
            if (!bookings || bookings.length === 0) {
                if(tbody) tbody.innerHTML = '<tr><td colspan="5">Inga bokningar hittades.</td></tr>';
                return;
            }
            if(tbody) tbody.innerHTML = bookings.map(booking => {
                const carObj = state.cars.find(c => c.id === booking.carId);
                const carInfo = carObj ? `${carObj.name} ${carObj.model || ''}`.trim() : `Bil #${booking.carId}`;
                const statusBadge = booking.active ? `<span class="status-active">Aktiv</span>` : `<span class="status-inactive">Avslutad</span>`;
                return `<tr><td>${booking.id}</td><td>${carInfo}</td><td>${booking.fromDate || '-'}</td><td>${booking.toDate || '-'}</td><td>${statusBadge}</td></tr>`;
            }).join('');
        } catch (error) {
            if(tbody) tbody.innerHTML = error.status === 404 ? '<tr><td colspan="5">Inga bokningar hittades.</td></tr>' : '<tr><td colspan="5">Kunde inte hämta bokningar.</td></tr>';
        }
    }


    // Tabellen över bokningar i admin-sektionen
    function renderAdminBookings() {
        const tbody = document.getElementById('admin-bookings-tbody');
        if (!tbody) return;

        let sorted = [...state.bookings].sort((a, b) => {
            const resolveValue = (item, key) => {
                if (key === 'car') {
                    const carObj = item.car || state.cars.find(c => c.id === item.carId);
                    return carObj ? `${carObj.name || ''} ${carObj.model || ''}`.trim() : item.carId || '';
                }
                if (key === 'user') return item.user?.username || item.userId || '';
                if (key === 'startDate') return item.fromDate || '';
                if (key === 'endDate') return item.toDate || '';
                return item[key] !== undefined && item[key] !== null ? item[key] : '';
            };
            let v1 = resolveValue(a, state.adminBookingsSortBy);
            let v2 = resolveValue(b, state.adminBookingsSortBy);
            if (typeof v1 === 'string') v1 = v1.toLowerCase();
            if (typeof v2 === 'string') v2 = v2.toLowerCase();
            if (v1 < v2) return state.adminBookingsSortDesc ? 1 : -1;
            if (v1 > v2) return state.adminBookingsSortDesc ? -1 : 1;
            return 0;
        });

        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">Inga bokningar hittades.</td></tr>';
            return;
        }

        tbody.innerHTML = sorted.map(booking => {
            const carObj = booking.car || state.cars.find(c => c.id === booking.carId);
            const carInfo = carObj ? `${carObj.name || ''} ${carObj.model || ''}`.trim() : `Bil #${booking.carId}`;
            const userInfo = booking.user ? booking.user.username : booking.userId || '-';
            const statusBadge = booking.active ? `<span class="status-active">Aktiv</span>` : `<span class="status-inactive">Avslutad</span>`;
            const returnBtn = booking.active ? `<button class="btn-icon btn-secondary return-booking-btn" data-id="${booking.id}" aria-label="Återlämna bil för bokning ${booking.id}" title="Återlämna"><i class="bi bi-arrow-return-left" aria-hidden="true"></i></button>` : '';
            return `
            <tr>
                <td>${booking.id}</td>
                <td>${carInfo}</td>
                <td>${userInfo}</td>
                <td>${booking.fromDate || '-'}</td>
                <td>${booking.toDate || '-'}</td>
                <td>${statusBadge}</td>
                <td style="white-space: nowrap;">
                    <button class="btn-icon edit-booking-btn" data-id="${booking.id}" aria-label="Redigera bokning ${booking.id}" title="Redigera">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="btn-icon danger delete-booking-btn" data-id="${booking.id}" aria-label="Ta bort bokning ${booking.id}" title="Ta bort">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    ${returnBtn}
                </td>
            </tr>`;
        }).join('');
        updateAriaSortHeaders('admin-bookings-table', state.adminBookingsSortBy, state.adminBookingsSortDesc);
    }


    // Hämtar bokningar för den inloggade användaren i "Mina bokningar"-sektionen
    async function fetchUserBookings() {
        const tbody = document.getElementById('user-bookings-tbody');
        if (!tbody || !state.currentUser) {
            if(tbody) tbody.innerHTML = '<tr><td colspan="6">Logga in för att se dina bokningar.</td></tr>';
            return;
        }

        setTableLoader('user-bookings-tbody', 6);
        await ensureCarsLoaded();

        apiFetch(`${API_BASE}/bookings/me`)
            .then(response => response.json())
            .then(data => { state.userBookings = data; renderUserBookings(); })
            .catch(error => {
                if (error.status === 404) {
                    state.userBookings = [];
                    tbody.innerHTML = '<tr><td colspan="6">Du har inga bokningar.</td></tr>';
                } else {
                    showToast('Kunde inte hämta bokningar.', 'error');
                }
            });
    }


    // Visar bokningarna för den inloggade användaren i "Mina bokningar"-sektionen
    function renderUserBookings() {
        const tbody = document.getElementById('user-bookings-tbody');
        if (!tbody || !state.currentUser) return;

        if (!state.userBookings || state.userBookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Du har inga bokningar.</td></tr>';
            return;
        }

        tbody.innerHTML = state.userBookings.map(booking => {
            const carObj = state.cars.find(c => c.id === booking.carId);
            const carInfo = carObj ? `${carObj.name} ${carObj.model || ''}`.trim() : `Bil #${booking.carId}`;
            const statusBadge = booking.active ? `<span class="status-active">Aktiv</span>` : `<span class="status-inactive">Avslutad</span>`;
            const returnBtn = booking.active 
                ? `<button class="btn btn-secondary return-car-btn" data-id="${booking.id}">Återlämna</button>`
                : `<span style="color: var(--text-muted); font-size: 0.85rem;">—</span>`;
            return `<tr><td>${booking.id}</td><td>${carInfo}</td><td>${booking.fromDate || '-'}</td><td>${booking.toDate || '-'}</td><td>${statusBadge}</td><td>${returnBtn}</td></tr>`;
        }).join('');
    }


    updateNavVisibility();
});