// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// State Management
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const state = {
    currentUser: null,
    credentials: null,
    cars: [],
    bookings: [],
    users: [],
    carSortBy: 'name',
    carSortDesc: false,
    adminSortBy: 'id',
    adminSortDesc: false
};

const API_BASE = 'http://localhost:8080/api/v1';
let carToDeleteId = null;

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// SESSION PERSISTENCE
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
// API WRAPPER
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function apiFetch(url, opts = {}) {
    const headers = {...opts.headers};

    if (state.credentials) {
        headers['Authorization'] = `Basic ${state.credentials}`;
    }

    if (opts.body && !(opts.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
        ...opts,
        headers,
        credentials: 'include',
    });

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
// CAROUSEL & IMAGE UTILITIES
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function shadeHex(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (n >> 16) + amt));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
    const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
    return `rgb(${r},${g},${b})`;
}

function renderPlaceholderSVG(color) {
    const d = '#141414', rim = '#2a2a2a', glass = 'rgba(255,255,255,0.1)', gEdge = 'rgba(255,255,255,0.12)';
    const bodyShade = shadeHex(color, -35);
    const w = (cx, r) => `<circle cx="${cx}" cy="96" r="${r}" fill="${d}" stroke="${rim}" stroke-width="2"/><circle cx="${cx}" cy="96" r="${r * .58}" fill="${rim}" stroke="${color}" stroke-width="1.5"/><circle cx="${cx}" cy="96" r="${r * .22}" fill="${color}"/>`;
    const shape = `<path d="M 18,72 L 20,90 L 260,90 L 262,72 L 222,60 L 56,60 Z" fill="${color}"/><path d="M 66,60 L 76,28 L 195,28 L 200,60 Z" fill="${bodyShade}"/><path d="M 78,30 L 132,30 L 130,60 L 70,60 Z" fill="${glass}" stroke="${gEdge}" stroke-width="1"/><path d="M 135,30 L 193,30 L 197,60 L 133,60 Z" fill="${glass}" stroke="${gEdge}" stroke-width="1"/>${w(67, 21)} ${w(215, 21)}`;

    return `<svg viewBox="0 0 280 115" xmlns="http://www.w3.org/2000/svg" fill="none" style="width:100%; height:100%; padding: 20px;">${shape}</svg>`;
}

function mapCarTo3D(dbCar) {
    const colors = ['#e69d67', '#57cdfa', '#57a773', '#e55934'];
    const assignedColor = colors[dbCar.id % colors.length];

    return {
        id: dbCar.id,
        name: `${dbCar.name} ${dbCar.model || ''}`.trim(),
        type: dbCar.type || 'Okänd',
        price: dbCar.price,
        booked: dbCar.booked,
        color: assignedColor,
        bg: '#111111',
        feats: [dbCar.feature1, dbCar.feature2, dbCar.feature3].filter(Boolean),
        image: dbCar.image
    };
}

function build3DCard(car) {
    const div = document.createElement('div');
    div.className = 'car-card';

    const imgHtml = car.image
        ? `<img src="data:image/png;base64,${car.image}" style="width:100%; height:100%; object-fit:contain; position:absolute; top:0; left:0; border-radius: 8px 8px 0 0; padding: 1rem; box-sizing: border-box;">`
        : renderPlaceholderSVG(car.color);

    const btnHtml = car.booked
        ? `<button class="valj-btn" disabled style="background: var(--color-negative); color: #fff; cursor: not-allowed; opacity: 0.8;">
              <span class="dia" style="background:#fff"></span>BOKAD
           </button>`
        : `<button class="valj-btn book-car-btn" data-id="${car.id}" data-name="${car.name}" style="background:${car.color};color:#1a1a1a">
              <span class="dia" style="background:#1a1a1a"></span>VÄLJ
           </button>`;

    div.innerHTML = `
        <div class="car-img" style="background:${car.bg}; position:relative;">
            ${imgHtml}
            <div class="car-badge" style="color:${car.color};border-color:${car.color}; z-index:2;">${car.type}</div>
        </div>
        <div class="car-body">
            <div class="car-name" style="color:${car.color}">${car.name}</div>
            <div class="car-price"><strong>${car.price}</strong> kr/dag</div>
            <ul class="car-feats">
                ${car.feats.map(f => `<li><span style="background:${car.color};width:5px;height:5px;transform:rotate(45deg);flex-shrink:0;display:inline-block"></span>${f}</li>`).join('')}
            </ul>
            ${btnHtml}
        </div>`;
    return div;
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// MAIN APPLICATION LOGIC
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {

    loadSession();

    const resetAllCodeToggles = () => {
        document.querySelectorAll('.code-wrapper.is-open').forEach(wrapper => wrapper.classList.remove('is-open'));
        document.querySelectorAll('.toggle-code-btn').forEach(btn => btn.innerHTML = 'Visa kod &lt;/&gt;');
    };

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

    const topNavLinks = document.querySelectorAll('header .nav-link');
    const sections = document.querySelectorAll('main > .page-section');

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
        const isSubSection = ['branding', 'components', 'forms-tables', 'feedback', 'css'].includes(targetId);
        let actualSectionId = targetId;

        const adminViews = ['admin', 'admin-styleguide', 'branding', 'components', 'forms-tables', 'feedback', 'css'];

        if (adminViews.includes(actualSectionId) && !state.currentUser?.isAdmin) {
            showToast('Åtkomst nekad. Logga in som admin.', 'error');
            actualSectionId = 'loggain';
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

        if (actualSectionId === 'bilar') fetchCars();
        if (actualSectionId === 'admin') fetchAdminCars();

        if (actualSectionId === 'loggain') {
            setTimeout(() => {
                const usernameInput = document.getElementById('username');
                if (usernameInput) usernameInput.focus();
            }, 100);
        }
    };

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // GLOBAL EVENT DELEGATION (Klick-lyssnare för hela sidan)
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    document.body.addEventListener('click', (e) => {

        // Hantera Routing / Länkar
        const link = e.target.closest('a[href^="#"]');
        if (link) {
            const href = link.getAttribute('href');

            if (href === '#logout') {
                e.preventDefault();
                state.currentUser = null;
                state.credentials = null;
                saveSession();
                updateNavVisibility();
                navigateTo('bilar');
                showToast('Utloggad', 'success');
                closeMenu();
                return;
            }

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

        // Visa/Dölj Kodblock
        if (e.target.classList.contains('toggle-code-btn')) {
            const codeWrapper = e.target.nextElementSibling;
            if (codeWrapper) {
                const isOpen = codeWrapper.classList.toggle('is-open');
                e.target.innerHTML = isOpen ? 'Dölj kod &#8743;' : 'Visa kod &lt;/&gt;';
            }
        }

        // Tabellsortering
        const th = e.target.closest('#admin-cars-table th.sortable');
        if (th) {
            const col = th.getAttribute('data-col');
            if (state.adminSortBy === col) {
                state.adminSortDesc = !state.adminSortDesc;
            } else {
                state.adminSortBy = col;
                state.adminSortDesc = false;
            }
            renderAdminCars();
        }

        // BOKNING - Öppna modal
        const bookBtn = e.target.closest('.book-car-btn');
        if (bookBtn) {
            if (!state.currentUser) {
                showToast('Du måste vara inloggad för att boka.', 'error');
                navigateTo('loggain');
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

        // ADMIN - Öppna "Lägg till bil"-modal
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

        // ADMIN - Redigera Bil
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

        // ADMIN - Ta bort bil
        const deleteCarBtn = e.target.closest('.delete-car-btn');
        if (deleteCarBtn) {
            carToDeleteId = deleteCarBtn.getAttribute('data-id');
            const carName = deleteCarBtn.getAttribute('data-name');
            document.getElementById('delete-car-name').innerText = carName;

            const deleteModal = document.getElementById('delete-confirm-modal');
            if (deleteModal) deleteModal.showModal();
        }
    });

    const currentHash = window.location.hash.substring(1);
    if (currentHash) navigateTo(currentHash);
    else navigateTo('bilar');


    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // DELETE MODAL - Hantera Bekräfta och Avbryt
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            if (deleteConfirmModal) deleteConfirmModal.close();
            carToDeleteId = null;
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async (e) => {
            if (!carToDeleteId) return;

            const btn = e.target;
            btn.disabled = true;
            btn.textContent = 'Tar bort...';

            try {
                await apiFetch(`${API_BASE}/cars/${carToDeleteId}`, {method: 'DELETE'});
                showToast('Bilen har tagits bort från systemet', 'success');
                if (deleteConfirmModal) deleteConfirmModal.close();
                fetchAdminCars();
                fetchCars();
            } catch (err) {
                showToast('Kunde inte ta bort bilen', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Ja, ta bort';
                carToDeleteId = null;
            }
        });
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // BOKNINGS-MODAL: AVBRYT & SUBMIT
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const bookingModal = document.getElementById('booking-modal');
    const bookingForm = document.getElementById('booking-form');
    const closeModalBtn = document.getElementById('close-modal-btn');

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
                        userId: state.currentUser.id,
                        startDate: startDate,
                        endDate: endDate
                    })
                });

                showToast('Bokning genomförd!', 'success');
                bookingModal.close();
                bookingForm.reset();
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
    // ADMIN: LÄGG TILL / REDIGERA BIL-MODAL
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const addCarModal = document.getElementById('add-car-modal');
    const addCarForm = document.getElementById('add-car-form');
    const closeAddCarBtn = document.getElementById('close-add-car-btn');

    if (closeAddCarBtn) {
        closeAddCarBtn.addEventListener('click', () => {
            if (addCarModal) addCarModal.close();
            if (addCarForm) addCarForm.reset();
        });
    }

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

            // Bevara existerande booked status
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
                if (method === 'POST') {
                    // --- SKAPA BIL (POST) -> Förväntar sig MULTIPART_FORM_DATA ---
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
                    // --- REDIGERA BIL (PUT) -> Förväntar sig APPLICATION/JSON ---
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

                await apiFetch(endpoint, fetchOptions);

                showToast(`Bilen har ${editId ? 'uppdaterats' : 'lagts till'}!`, 'success');

                if (addCarModal) addCarModal.close();
                addCarForm.reset();

                fetchAdminCars();
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
    // AUTHENTICATION LOGIC
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errEl = document.getElementById('login-error');
            const btn = loginForm.querySelector('button[type="submit"]');

            errEl.style.display = 'none';
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Loggar in…';
            }

            try {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify({username, password}),
                });

                if (!res.ok) throw new Error('unauthorized');

                const data = await res.json();
                state.currentUser = {id: data.userId, username: data.username, isAdmin: data.isAdmin};
                state.credentials = btoa(`${username}:${password}`);

                saveSession();
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
    // CAR RENTAL LOGIC (STANDARD GRID)
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    function fetchCars() {
        const container = document.getElementById('cars-container');
        if (container) container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center;"><div class="loader" style="margin: 2rem auto;"></div></div>';

        const stage = document.getElementById('d9-stage');
        if (stage) stage.innerHTML = '<div style="text-align: center;"><div class="loader" style="margin: 2rem auto;"></div></div>';

        apiFetch(`${API_BASE}/cars`)
            .then(res => res.json())
            .then(data => {
                state.cars = data;
                renderCars();
                render3DCarousel();
            })
            .catch(err => {
                console.warn('Kunde inte hämta bilar:', err.message);
                showToast('Kunde inte nå servern.', 'error');
                renderCars();
                render3DCarousel();
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

        container.innerHTML = sorted.map(car => {
            const imgHTML = car.image
                ? `<img src="data:image/png;base64,${car.image}" style="width:100%; height:200px; object-fit:contain; border-radius:4px; margin-bottom:1rem; background: #111; padding: 10px; box-sizing: border-box;">`
                : `<div style="height:200px; background:#111; border-radius:4px; margin-bottom:1rem; display:flex; align-items:center; justify-content:center;">${renderPlaceholderSVG('var(--accent)')}</div>`;

            return `
        <div class="panel ${car.booked ? 'panel-negative' : 'panel-accent'}" style="padding: 2rem;">
            ${imgHTML}
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
            </div>`
        }).join('');
    }

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // 3D CAROUSEL RENDER LOGIC
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    let carouselCur = 0;

    function render3DCarousel() {
        const stage = document.getElementById('d9-stage');
        const cnt = document.getElementById('d9-cnt');

        if (!stage) return;

        stage.innerHTML = '';
        const n = state.cars.length;
        if (n === 0) {
            if (cnt) cnt.innerHTML = '';
            return;
        }

        if (carouselCur >= n) carouselCur = 0;

        const plane = document.createElement('div');
        plane.className = 'wrapper';
        stage.appendChild(plane);

        const cards = state.cars.map(dbCar => {
            const mappedCar = mapCarTo3D(dbCar);
            const c = build3DCard(mappedCar);
            plane.appendChild(c);
            return c;
        });

        function layout() {
            plane.style.transform = `translateX(${carouselCur * -160}px) rotateX(25deg)`;
            cards.forEach((c, i) => {
                const dist = i - carouselCur;
                if (i === carouselCur) {
                    c.style.transform = `translateX(${i * 160}px) translateZ(80px) rotateX(-25deg) scale(1.05)`;
                    c.style.opacity = 1;
                    c.style.filter = 'brightness(1)';
                    c.style.zIndex = 10;
                    c.style.boxShadow = '0 30px 50px rgba(0,0,0,0.6)';
                    c.style.pointerEvents = 'auto';
                } else {
                    c.style.transform = `translateX(${i * 160}px) translateZ(0) rotateX(0) scale(0.85)`;
                    c.style.opacity = Math.abs(dist) < 3 ? 0.6 : 0;
                    c.style.filter = 'brightness(0.4)';
                    c.style.zIndex = 5;
                    c.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5)';
                    c.style.pointerEvents = 'none';
                }
            });
            if (cnt) cnt.innerHTML = `<em style="color:var(--accent)">${carouselCur + 1}</em> / ${n}`;
        }

        const nextBtn = document.getElementById('d9-next');
        const prevBtn = document.getElementById('d9-prev');
        if (nextBtn) nextBtn.onclick = () => {
            carouselCur = (carouselCur + 1) % n;
            layout();
        };
        if (prevBtn) prevBtn.onclick = () => {
            carouselCur = (carouselCur - 1 + n) % n;
            layout();
        };

        setTimeout(layout, 50);
    }

    document.getElementById('sort-name')?.addEventListener('click', () => {
        if (state.carSortBy === 'name') state.carSortDesc = !state.carSortDesc;
        else {
            state.carSortBy = 'name';
            state.carSortDesc = false;
        }
        renderCars();
    });
    document.getElementById('sort-type')?.addEventListener('click', () => {
        if (state.carSortBy === 'type') state.carSortDesc = !state.carSortDesc;
        else {
            state.carSortBy = 'type';
            state.carSortDesc = false;
        }
        renderCars();
    });

    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ADMIN DASHBOARD LOGIC
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    function fetchAdminCars() {
        const tbody = document.getElementById('admin-cars-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;"><div class="loader" style="margin: 1rem auto;"></div></td></tr>';

        apiFetch(`${API_BASE}/cars`)
            .then(res => res.json())
            .then(data => {
                state.cars = data;
                renderAdminCars();
            })
            .catch(err => {
                console.warn('Kunde inte hämta bilar:', err.message);
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
            tbody.innerHTML = '<tr><td colspan="6">Inga bilar hittades.</td></tr>';
            return;
        }

        tbody.innerHTML = sorted.map(car => `
            <tr>
                <td>${car.id}</td>
                <td><strong>${car.name}</strong></td>
                <td>${car.type}</td>
                <td>${car.price} kr</td>
                <td>
                    ${car.booked ?
            '<span style="color: var(--color-negative);">Bokad</span>' :
            '<span style="color: var(--color-positive);">Ledig</span>'}
                </td>
                <td style="white-space: nowrap;">
                    <button class="btn-icon edit-car-btn" data-id="${car.id}" title="Redigera">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="btn-icon danger delete-car-btn" data-id="${car.id}" data-name="${car.name} ${car.model || ''}" title="Ta bort">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('#admin-cars-table th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.getAttribute('data-col') === state.adminSortBy) {
                th.classList.add(state.adminSortDesc ? 'sort-desc' : 'sort-asc');
            }
        });
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