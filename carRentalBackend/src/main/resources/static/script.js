// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// State Management
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
    userBookingsSortBy: 'startDate',
    userBookingsSortDesc: false
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
        const navLogin = document.getElementById('nav-login');
        const navLogout = document.getElementById('nav-logout');
        const navCars = document.getElementById('nav-cars');
        const navMinaSidor = document.getElementById('nav-mina-sidor');

        // Admin-länkar
        const navAdmin = document.getElementById('nav-admin');
        const navStyleguide = document.getElementById('nav-styleguide');


        if (state.currentUser) {
            if (navLogin) navLogin.style.display = 'none';
            if (navLogout) navLogout.style.display = 'flex';

            if (state.currentUser.isAdmin) {
                if (navAdmin) navAdmin.style.display = 'flex';
                if (navStyleguide) navStyleguide.style.display = 'flex';

                if (navMinaSidor) navMinaSidor.style.display = 'none';
                if (navCars) navCars.style.display = 'none';
            } else {
                if (navCars) navCars.style.display = 'flex';
                if (navMinaSidor) navMinaSidor.style.display = 'flex';

                if (navAdmin) navAdmin.style.display = 'none';
                if (navStyleguide) navStyleguide.style.display = 'none';
            }
        } else {
            if (navLogin) navLogin.style.display = 'flex';
            if (navLogout) navLogout.style.display = 'none';

            if (navMinaSidor) navMinaSidor.style.display = 'none';
            if (navAdmin) navAdmin.style.display = 'none';
            if (navStyleguide) navStyleguide.style.display = 'none';

            if (navCars) navCars.style.display = 'flex';
        }
    };

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
        if (actualSectionId === 'admin-cars') fetchAdminCars();
        if (actualSectionId === 'admin-users') fetchAdminUsers();
        if (actualSectionId === 'admin-bookings') fetchAdminBookings();
        if (actualSectionId === 'mina-sidor') fetchUserBookings();

        if (actualSectionId === 'login') {
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
                navigateTo('cars');
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

        // Tabellsortering för bil-listan
        const carTh = e.target.closest('#cars-table th.sortable');
        if (carTh) {
            const col = carTh.getAttribute('data-col');
            if (state.carSortBy === col) {
                state.carSortDesc = !state.carSortDesc;
            } else {
                state.carSortBy = col;
                state.carSortDesc = false;
            }
            renderCars();
        }

        // Tabellsortering för admin-bilar
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

        // Tabellsortering för admin-användare
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

        // Tabellsortering för admin-bokningar
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

        // BOKNING - Öppna modal
        const bookBtn = e.target.closest('.book-car-btn');
        if (bookBtn) {
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

        // ADMIN - Redigera användare
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

        const deleteUserBtn = e.target.closest('.delete-user-btn');
        if (deleteUserBtn) {
            const userId = deleteUserBtn.getAttribute('data-id');
            const userName = deleteUserBtn.getAttribute('data-name');
            if (!confirm(`Vill du verkligen ta bort användaren ${userName}?`)) return;
            apiFetch(`${API_BASE}/users/${userId}`, {method: 'DELETE'})
                .then(() => {
                    showToast('Användaren togs bort', 'success');
                    fetchAdminUsers();
                })
                .catch(() => showToast('Kunde inte ta bort användaren', 'error'));
        }

        // ADMIN - Redigera bokning
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

        const deleteBookingBtn = e.target.closest('.delete-booking-btn');
        if (deleteBookingBtn) {
            const bookingId = deleteBookingBtn.getAttribute('data-id');
            if (!confirm('Vill du verkligen ta bort bokningen?')) return;
            apiFetch(`${API_BASE}/bookings/${bookingId}`, {method: 'DELETE'})
                .then(() => {
                    showToast('Bokningen togs bort', 'success');
                    fetchAdminBookings();
                    fetchUserBookings();
                })
                .catch(() => showToast('Kunde inte ta bort bokningen', 'error'));
        }
    });

    const currentHash = window.location.hash.substring(1);
    if (currentHash) navigateTo(currentHash);
    else navigateTo('cars');


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
                        fromDate: startDate,
                        toDate: endDate
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
                    btn.textContent = 'Logga In';
                }
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────-
    // USER REGISTRATION (SKAPA ANVÄNDARE)
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const openRegisterBtn = document.getElementById('open-register-btn');
    const registerModal = document.getElementById('register-modal');
    const closeRegisterBtn = document.getElementById('close-register-btn');
    const registerForm = document.getElementById('register-form');

    if (openRegisterBtn && registerModal) {
        openRegisterBtn.addEventListener('click', () => {
            registerModal.showModal();
            setTimeout(() => document.getElementById('register-username')?.focus(), 50);
        });
    }

    if (closeRegisterBtn) {
        closeRegisterBtn.addEventListener('click', () => {
            if (registerModal) registerModal.close();
            registerForm?.reset();
        });
    }

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

            if (!username || !firstName || !lastName || !phone || !email || !password) {
                showToast('Fyll i alla fält.', 'error');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Skapar...';
            }

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

    const editUserModal = document.getElementById('edit-user-modal');
    const editUserForm = document.getElementById('edit-user-form');
    const closeEditUserBtn = document.getElementById('close-edit-user-btn');
    const editBookingModal = document.getElementById('edit-booking-modal');
    const editBookingForm = document.getElementById('edit-booking-form');
    const closeEditBookingBtn = document.getElementById('close-edit-booking-btn');
    const editBookingStart = document.getElementById('edit-booking-start');
    const editBookingEnd = document.getElementById('edit-booking-end');

    if (closeEditUserBtn) {
        closeEditUserBtn.addEventListener('click', () => {
            if (editUserModal) editUserModal.close();
            editUserForm?.reset();
        });
    }

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

            if (!username || !firstName || !lastName || !phone || !email) {
                showToast('Fyll i alla användarfält.', 'error');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sparar...';
            }

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

    if (closeEditBookingBtn) {
        closeEditBookingBtn.addEventListener('click', () => {
            if (editBookingModal) editBookingModal.close();
            editBookingForm?.reset();
        });
    }

    if (editBookingStart && editBookingEnd) {
        editBookingStart.addEventListener('change', function () {
            editBookingEnd.min = this.value;
        });
    }

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

            try {
                await apiFetch(`${API_BASE}/bookings/${bookingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        fromDate: startDate,
                        toDate: endDate
                    })
                });

                showToast('Bokningen uppdaterades', 'success');
                if (editBookingModal) editBookingModal.close();
                editBookingForm.reset();
                fetchAdminBookings();
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
    // CAR RENTAL LOGIC (STANDARD GRID)
    // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    function fetchCars() {
        const carsBody = document.getElementById('cars-tbody');
        if (carsBody) carsBody.innerHTML = '<tr><td colspan="5" style="text-align: center;"><div class="loader" style="margin: 2rem auto;"></div></td></tr>';

        apiFetch(`${API_BASE}/cars`)
            .then(res => res.json())
            .then(data => {
                state.cars = data;
                renderCars();
            })
            .catch(err => {
                console.warn('Kunde inte hämta bilar:', err.message);
                showToast('Kunde inte nå servern.', 'error');
                renderCars();
            });
    }

    function renderCars() {
        const tbody = document.getElementById('cars-tbody');
        if (!tbody) return;

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
            tbody.innerHTML = '<tr><td colspan="5">Inga bilar tillgängliga.</td></tr>';
            return;
        }

        tbody.innerHTML = sorted.map(car => `
            <tr>
                <td><strong>${car.name}</strong> ${car.model || ''}</td>
                <td>${car.type || 'Okänd'}</td>
                <td>${car.price} kr/dag</td>
                <td>${car.booked ? '<span style="color: var(--color-negative);">Bokad</span>' : '<span style="color: var(--color-positive);">Ledig</span>'}</td>
                <td style="white-space: nowrap;">
                    ${car.booked ?
                        '<button class="btn btn-negative" disabled>Bokad</button>' :
                        `<button class="btn btn-primary book-car-btn" data-id="${car.id}" data-name="${car.name} ${car.model || ''}">Välj</button>`
                    }
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('#cars-table th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            th.removeAttribute('aria-sort');
            if (th.getAttribute('data-col') === state.carSortBy) {
                const dir = state.carSortDesc ? 'descending' : 'ascending';
                th.classList.add(state.carSortDesc ? 'sort-desc' : 'sort-asc');
                th.setAttribute('aria-sort', dir);
            } else {
                th.setAttribute('aria-sort', 'none');
            }
        });
    }



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
            th.removeAttribute('aria-sort');
            if (th.getAttribute('data-col') === state.adminSortBy) {
                const dir = state.adminSortDesc ? 'descending' : 'ascending';
                th.classList.add(state.adminSortDesc ? 'sort-desc' : 'sort-asc');
                th.setAttribute('aria-sort', dir);
            } else {
                th.setAttribute('aria-sort', 'none');
            }
        });
    }

    function fetchAdminUsers() {
        const tbody = document.getElementById('admin-users-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;"><div class="loader" style="margin: 1rem auto;"></div></td></tr>';

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

    function renderAdminUsers() {
        const tbody = document.getElementById('admin-users-tbody');
        if (!tbody) return;

        let sorted = [...state.users];
        sorted.sort((a, b) => {
            let v1 = a[state.adminUsersSortBy];
            let v2 = b[state.adminUsersSortBy];
            if (typeof v1 === 'string') v1 = v1.toLowerCase();
            if (typeof v2 === 'string') v2 = v2.toLowerCase();
            if (v1 < v2) return state.adminUsersSortDesc ? 1 : -1;
            if (v1 > v2) return state.adminUsersSortDesc ? -1 : 1;
            return 0;
        });

        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">Inga användare hittades.</td></tr>';
            return;
        }

        tbody.innerHTML = sorted.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username || '-'}</td>
                <td>${(user.role || 'USER').toUpperCase()}</td>
                <td style="white-space: nowrap;">
                    <button class="btn-icon edit-user-btn" data-id="${user.id}" data-name="${user.username}" title="Redigera">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="btn-icon danger delete-user-btn" data-id="${user.id}" data-name="${user.username}" title="Ta bort">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('#admin-users-table th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            th.removeAttribute('aria-sort');
            if (th.getAttribute('data-col') === state.adminUsersSortBy) {
                const dir = state.adminUsersSortDesc ? 'descending' : 'ascending';
                th.classList.add(state.adminUsersSortDesc ? 'sort-desc' : 'sort-asc');
                th.setAttribute('aria-sort', dir);
            } else {
                th.setAttribute('aria-sort', 'none');
            }
        });
    }

    function fetchAdminBookings() {
        if (state.cars.length === 0) {
            fetchAdminCars();
        }

        const tbody = document.getElementById('admin-bookings-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;"><div class="loader" style="margin: 1rem auto;"></div></td></tr>';

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

        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Inga bokningar hittades.</td></tr>';
            return;
        }

        tbody.innerHTML = sorted.map(booking => {
            const carObj = booking.car || state.cars.find(c => c.id === booking.carId);
            const carInfo = carObj ? `${carObj.name || ''} ${carObj.model || ''}`.trim() : `Bil #${booking.carId}`;
            const userInfo = booking.user ? booking.user.username : booking.userId || '-';
            return `
            <tr>
                <td>${booking.id}</td>
                <td>${carInfo}</td>
                <td>${userInfo}</td>
                <td>${booking.fromDate || '-'}</td>
                <td>${booking.toDate || '-'}</td>
                <td style="white-space: nowrap;">
                    <button class="btn-icon edit-booking-btn" data-id="${booking.id}" title="Redigera">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="btn-icon danger delete-booking-btn" data-id="${booking.id}" title="Ta bort">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            </tr>
        `;
        }).join('');

        document.querySelectorAll('#admin-bookings-table th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            th.removeAttribute('aria-sort');
            if (th.getAttribute('data-col') === state.adminBookingsSortBy) {
                const dir = state.adminBookingsSortDesc ? 'descending' : 'ascending';
                th.classList.add(state.adminBookingsSortDesc ? 'sort-desc' : 'sort-asc');
                th.setAttribute('aria-sort', dir);
            } else {
                th.setAttribute('aria-sort', 'none');
            }
        });
    }

    function fetchUserBookings() {
        const tbody = document.getElementById('user-bookings-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;"><div class="loader" style="margin: 1rem auto;"></div></td></tr>';

        if (!state.currentUser) {
            tbody.innerHTML = '<tr><td colspan="4">Logga in för att se dina bokningar.</td></tr>';
            return;
        }

        if (state.cars.length === 0) {
            fetchAdminCars();
        }

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

    function renderUserBookings() {
        const tbody = document.getElementById('user-bookings-tbody');
        if (!tbody) return;
        if (!state.currentUser) {
            tbody.innerHTML = '<tr><td colspan="4">Logga in för att se dina bokningar.</td></tr>';
            return;
        }

        const bookings = state.userBookings;

        if (!bookings || bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">Du har inga bokningar.</td></tr>';
            return;
        }

        tbody.innerHTML = bookings.map(booking => {
            const carObj = state.cars.find(c => c.id === booking.carId);
            const carInfo = carObj ? `${carObj.name} ${carObj.model || ''}`.trim() : `Bil #${booking.carId}`;
            return `
            <tr>
                <td>${booking.id}</td>
                <td>${carInfo}</td>
                <td>${booking.fromDate || '-'}</td>
                <td>${booking.toDate || '-'}</td>
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