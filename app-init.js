        const themeToggleButton = document.getElementById('theme-toggle-button');
        const darkIcon = document.getElementById('theme-toggle-dark-icon');
        const lightIcon = document.getElementById('theme-toggle-light-icon');

        function applyTheme() {
            const currentTheme = localStorage.getItem('theme');
            if (currentTheme === 'dark') {
                document.documentElement.classList.add('dark');
                darkIcon.classList.remove('hidden-section');
                lightIcon.classList.add('hidden-section');
            } else {
                document.documentElement.classList.remove('dark');
                lightIcon.classList.remove('hidden-section');
                darkIcon.classList.add('hidden-section');
            }
        }

        if (themeToggleButton && darkIcon && lightIcon) {
            themeToggleButton.addEventListener('click', () => {
                localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'light' : 'dark');
                applyTheme();
            });
        }

        async function initializeAppAsync() {
            try {
                seedCacheFromStorage();
                updateAuthState(currentUser);
                await restoreSession();
                await updateAuthState(currentUser);
                await initialNavigation();
                initialAuthProcessed = true;
                loadHeroSettings().then(applyHeroSettings).catch(() => { });
                console.log("App initialized.");
            } catch (e) {
                console.error("App initialization error:", e);
            } finally {
                hideStartupLoader();
            }
        }

        // --- Background data cache & preloading (faster navigation) ---
        const _dataCache = { events: null, team: null, stats: null, users: null };
        const _dataCacheLoading = { events: false, team: false, stats: false, users: false };
        const _dataCacheTime = { events: 0, team: 0, stats: 0, users: 0 };
        const CACHE_FRESH_MS = 60 * 1000;

        function isCacheFresh(key) {
            const t = _dataCacheTime[key] || 0;
            return _dataCache[key] != null && (Date.now() - t) < CACHE_FRESH_MS;
        }

        function markCacheFresh(key) {
            _dataCacheTime[key] = Date.now();
        }

        function seedCacheFromStorage() {
            try {
                const raw = sessionStorage.getItem('flash_data_cache');
                if (!raw) return;
                const data = JSON.parse(raw);
                if (data && typeof data === 'object') {
                    if (Array.isArray(data.events)) {
                        _dataCache.events = data.events;
                        _dataCacheTime.events = Number(data.eventsTime) || 0;
                    }
                    if (Array.isArray(data.team)) {
                        _dataCache.team = data.team;
                        _dataCacheTime.team = Number(data.teamTime) || 0;
                    }
                }
            } catch (e) { }
        }

        function persistCacheToStorage() {
            try {
                const out = {};
                if (_dataCache.events) {
                    out.events = _dataCache.events;
                    out.eventsTime = _dataCacheTime.events || 0;
                }
                if (_dataCache.team) {
                    out.team = _dataCache.team;
                    out.teamTime = _dataCacheTime.team || 0;
                }
                sessionStorage.setItem('flash_data_cache', JSON.stringify(out));
            } catch (e) { }
        }

        function getCachedData(key) {
            return _dataCache[key] || null;
        }

        function clearDataCache() {
            Object.keys(_dataCache).forEach(k => {
                _dataCache[k] = null;
                _dataCacheTime[k] = 0;
            });
            try { sessionStorage.removeItem('flash_data_cache'); } catch (e) { }
        }

        async function preloadSingle(key, action, payload, extract) {
            if (_dataCacheLoading[key]) return;
            if (isCacheFresh(key)) return;
            _dataCacheLoading[key] = true;
            try {
                const result = await api(action, payload, true);
                const data = extract ? extract(result) : result;
                _dataCache[key] = data;
                markCacheFresh(key);
                persistCacheToStorage();
            } catch (e) {
                console.warn(`Preload failed for ${key}:`, e.message);
            } finally {
                _dataCacheLoading[key] = false;
            }
        }

        function preloadAllData() {
            if (!currentUser) return;
            preloadSingle('events', 'events', {}, r => r.events);
            preloadSingle('team', 'team', {}, r => r.team);
            if (isCurrentUserAdmin()) {
                preloadSingle('stats', 'stats', {}, r => r.stats || r);
                preloadSingle('users', 'listUsers', {}, r => r.users);
            }
        }

        async function loadWithCache(key, extract, fetcher) {
            const cached = _dataCache[key];
            if (cached !== null && cached !== undefined) {
                return { data: cached, fromCache: true };
            }
            const result = await fetcher();
            _dataCache[key] = extract ? extract(result) : result;
            markCacheFresh(key);
            persistCacheToStorage();
            return { data: _dataCache[key], fromCache: false };
        }

        function initializeApp() {
            applyTheme();
            setupAdminEventListeners();
            initializeAppAsync();
        }

        initializeApp();

        
