        const ME_CACHE_KEY = 'flash_me_cache';
        const ME_CACHE_TTL_MS = 30 * 1000;

        function readMeCache() {
            try {
                const raw = sessionStorage.getItem(ME_CACHE_KEY);
                if (!raw) return null;
                const d = JSON.parse(raw);
                if (d && d.user && d.expires && Date.now() < d.expires) return d.user;
            } catch (e) { }
            return null;
        }

        function writeMeCache(user) {
            try {
                sessionStorage.setItem(ME_CACHE_KEY, JSON.stringify({ user: user, expires: Date.now() + ME_CACHE_TTL_MS }));
            } catch (e) { }
        }

        function clearMeCache() {
            try { sessionStorage.removeItem(ME_CACHE_KEY); } catch (e) { }
        }

        async function restoreSession() {
            if (!_sessionToken) {
                currentUser = null;
                clearMeCache();
                return;
            }
            const cachedUser = readMeCache();
            if (cachedUser) {
                saveSession(_sessionToken, cachedUser);
                console.log("Session restored from cache for user (ID):", cachedUser.id);
                return;
            }
            try {
                const result = await api('me', {});
                saveSession(_sessionToken, result.user);
                writeMeCache(result.user);
                console.log("Session restored for user (ID):", result.user?.id);
            } catch (e) {
                console.warn("Session restore failed:", e.message);
                if (String(e.message).includes('الجلسة غير صالحة')) {
                    saveSession('', null);
                    clearMeCache();
                } else {
                    if (_sessionUser) saveSession(_sessionToken, _sessionUser);
                }
            }
        }

        async function initialNavigation() {
            if (isNavigating) {
                console.log("Initial navigation skipped: another navigation is already in progress.");
                return;
            }
            const page = currentPageName();
            const isAuthed = !!currentUser;
            console.log("Initial Navigation Decision: page =", page, ", authed =", isAuthed);

            const protectedPages = ['profile.html', 'admin.html'];
            if (protectedPages.indexOf(page) !== -1 && !isAuthed) {
                console.log("Initial navigation: protected page, redirecting to login.");
                window.location.replace('index.html#login');
                return;
            }

            syncNavActiveState();

            try {
                if (page === 'index.html') {
                    const hash = window.location.hash.substring(1);
                    const validSections = ['home', 'contact', 'login', 'signup', 'forgot-password-section'];
                    const target = (validSections.indexOf(hash) !== -1 && document.getElementById(hash)) ? hash : 'home';
                    showSection(target);
                    restorePageScroll();
                    return;
                }

                if (page === 'events.html') {
                    const payload = sessionStorage.getItem('flash_event_payload');
                    if (payload) {
                        try {
                            const ev = JSON.parse(payload);
                            if (ev && ev.id) {
                                currentEventId = ev.id;
                                showSection('event-details');
                                await loadEventDetails(ev);
                                restorePageScroll();
                                return;
                            }
                        } catch (e) { }
                    }
                    try { sessionStorage.removeItem('flash_event_payload'); } catch (e) { }
                    showSection('events');
                    await loadEvents();
                    restorePageScroll();
                    return;
                }

                if (page === 'team.html') {
                    showSection('profiles');
                    await loadProfiles();
                    return;
                }

                if (page === 'profile.html') {
                    if (!currentUser) { window.location.replace('index.html#login'); return; }
                    showSection('my-profile-section');
                    await loadCurrentUserProfileData();
                    return;
                }

                if (page === 'admin.html') {
                    if (!currentUser || currentUser.role !== 'admin') { window.location.replace('index.html'); return; }
                    showSection('admin');
                    await loadAdminPanel();
                    return;
                }

                showSection('home');
            } catch (navError) {
                console.error('Initial navigation failed:', navError.message, navError);
                try { showSection('home'); } catch (e) { }
            }
        }

        function restorePageScroll() {
            try {
                const y = parseInt(sessionStorage.getItem('flash_scroll_y') || '0', 10);
                sessionStorage.removeItem('flash_scroll_y');
                if (y > 0) {
                    window.scrollTo(0, y);
                    setTimeout(() => window.scrollTo(0, y), 300);
                }
            } catch (e) { }
        }

        const teamMembersListContainer = document.getElementById('team-members-list');
        const updateProfileForm = document.getElementById('update-profile-form');
        const updateAvatarPreview = document.getElementById('update-avatar-preview');
        const updateAvatarFile = document.getElementById('update-avatar-file');

        if (updateAvatarFile) {
            updateAvatarFile.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                    showModalMessage('يرجى اختيار ملف صورة فقط.', true);
                    event.target.value = '';
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    showModalMessage('حجم الصورة يجب ألا يتجاوز 5 ميجابايت.', true);
                    event.target.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    updateAvatarPreview.src = e.target.result;
                }
                reader.readAsDataURL(file);
            });
        }
