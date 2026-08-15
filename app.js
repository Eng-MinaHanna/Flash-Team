
        // --- Google Sheets Backend (Apps Script) ---
        // ضع رابط Web App من Apps Script هنا بعد النشر (راجع GoogleSheets-Backend/SETUP.md)
        const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwsQSiMgik0_5BTOK5PNXSRCZoMAD0W0jsGE2fUpV7IzIHhSvAHqL3C0hCcBSRrcCY/exec';
        const SESSION_TOKEN_KEY = 'flash_team_token';
        const SESSION_USER_KEY = 'flash_team_user';

        let _sessionToken = '';
        let _sessionUser = null;
        try {
            _sessionToken = localStorage.getItem(SESSION_TOKEN_KEY) || '';
            _sessionUser = JSON.parse(localStorage.getItem(SESSION_USER_KEY) || 'null');
        } catch (e) {
            _sessionToken = '';
            _sessionUser = null;
        }

        // --- Modal Elements ---
        const messageModal = document.getElementById('messageModal');
        const modalMessageText = document.getElementById('modalMessageText');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const confirmModal = document.getElementById('confirmModal');
        const confirmModalMessage = document.getElementById('confirmModalMessage');
        const confirmModalConfirmBtn = document.getElementById('confirmModalConfirmBtn');
        const confirmModalCancelBtn = document.getElementById('confirmModalCancelBtn');
        let confirmCallback = null;

        function showModalMessage(message, isError = false) {
            if (modalMessageText && messageModal) {
                modalMessageText.textContent = message;
                modalMessageText.className = isError ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold';
                messageModal.classList.remove('hidden-section');
            } else {
                console.error("Modal elements not found. Message:", message);
            }
        }
        function showConfirmModal(message, callback) {
            confirmModalMessage.textContent = message;
            confirmCallback = callback;
            confirmModal.classList.remove('hidden-section');
        }

        function escapeHtml(str) {
            if (str === null || typeof str === 'undefined') return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function parseLocalDate(dateStr) {
            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const parts = dateStr.split('-').map(Number);
                return new Date(parts[0], parts[1] - 1, parts[2]);
            }
            return new Date(dateStr);
        }

        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                if (messageModal) messageModal.classList.add('hidden-section');
            });
        }
        if (confirmModalConfirmBtn) {
            confirmModalConfirmBtn.addEventListener('click', () => {
                if (confirmCallback) {
                    confirmCallback();
                }
                confirmModal.classList.add('hidden-section');
                confirmCallback = null;
            });
        }
        if (confirmModalCancelBtn) {
            confirmModalCancelBtn.addEventListener('click', () => {
                confirmModal.classList.add('hidden-section');
                confirmCallback = null;
            });
        }

        // --- API helper (POST-only to avoid CORS preflight) ---
        async function api(action, payload = {}, quietOverride = false) {
            if (!APP_SCRIPT_URL || APP_SCRIPT_URL === 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') {
                throw new Error('لم يتم ربط الموقع بالخادم بعد. اتبع خطوات GoogleSheets-Backend/SETUP.md ثم ضع رابط النشر في APP_SCRIPT_URL.');
            }
            const quiet = quietOverride || _QUIET_API_ACTIONS.indexOf(action) !== -1;
            if (!quiet) beginLoading();
            const body = Object.assign({ action: action }, payload);
            if (_sessionToken) body.token = _sessionToken;
            let response;
            try {
                response = await fetch(APP_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify(body)
                });
            } catch (e) {
                if (!quiet) endLoading();
                throw new Error('تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت ومن صحة رابط الـ API.');
            }
            if (!response.ok) {
                if (!quiet) endLoading();
                throw new Error('استجابة الخادم غير صالحة (' + response.status + ').');
            }
            let result;
            try {
                result = await response.json();
            } catch (e) {
                if (!quiet) endLoading();
                throw new Error('استجابة الخادم غير صالحة.');
            }
            if (!result || result.success === false) {
                if (!quiet) endLoading();
                throw new Error((result && result.error) ? result.error : 'خطأ غير معروف من الخادم.');
            }
            if (!quiet) endLoading();
            return result;
        }

        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        function saveSession(token, user) {
            _sessionToken = token || '';
            if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
            else localStorage.removeItem(SESSION_TOKEN_KEY);
            if (user) localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
            else localStorage.removeItem(SESSION_USER_KEY);
            currentUser = user || null;
        }

        // --- Global loading overlay & double-click protection ---
        let _loadingCount = 0;
        let _loadingOverlayTimer = null;
        const _QUIET_API_ACTIONS = ['reactionCounts', 'userReaction', 'me'];

        function _getLoadingOverlay() {
            return document.getElementById('loading-overlay');
        }

        function _isLoadingActive() {
            return _loadingCount > 0;
        }

        function beginLoading(message) {
            _loadingCount++;
            clearTimeout(_loadingOverlayTimer);
            _loadingOverlayTimer = setTimeout(() => {
                const overlay = _getLoadingOverlay();
                if (overlay) {
                    const msgEl = document.getElementById('loading-overlay-message');
                    if (msgEl && message) msgEl.textContent = message;
                    overlay.classList.remove('hidden-section');
                }
            }, 150);
        }

        function endLoading() {
            _loadingCount = Math.max(0, _loadingCount - 1);
            if (_loadingCount === 0) {
                clearTimeout(_loadingOverlayTimer);
                _loadingOverlayTimer = setTimeout(() => {
                    const overlay = _getLoadingOverlay();
                    if (overlay && _loadingCount === 0) overlay.classList.add('hidden-section');
                }, 200);
            }
        }

        document.addEventListener('click', (e) => {
            if (_isLoadingActive()) {
                const target = e.target.closest('button, input[type="submit"], a.nav-link, a[data-target], .event-details-link, .reaction-btn, .toggle-comment-btn, .post-quick-comment-btn, .edit-event-btn, .delete-event-btn');
                if (target) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            }
        }, true);

        // --- Skeleton loading placeholders ---
        function skeletonCard() {
            return '<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-[#d4dbe2] dark:border-gray-700">' +
                '<div class="md:flex">' +
                '<div class="md:shrink-0 md:w-1/3"><div class="skeleton-block h-48 md:h-full w-full"></div></div>' +
                '<div class="p-6 md:w-2/3">' +
                '<div class="skeleton-block h-4 w-24 mb-3"></div>' +
                '<div class="skeleton-block h-5 w-3/4 mb-2"></div>' +
                '<div class="skeleton-block h-4 w-full mb-2"></div>' +
                '<div class="skeleton-block h-4 w-2/3 mb-4"></div>' +
                '<div class="skeleton-block h-8 w-28"></div>' +
                '</div>' +
                '</div>' +
                '</div>';
        }

        function skeletonMemberCard() {
            return '<div class="skeleton-block p-3 rounded-lg text-center aspect-[4/5]"></div>';
        }

        function skeletonStatsCard() {
            return '<div class="bg-white dark:bg-gray-800 rounded-xl border border-[#d4dbe2] dark:border-gray-700 p-4 text-center"><div class="skeleton-block h-8 w-16 mx-auto mb-2"></div><div class="skeleton-block h-4 w-20 mx-auto"></div></div>';
        }

        function skeletonAdminRow() {
            return '<div class="flex items-center gap-3 p-4"><div class="skeleton-block w-10 h-10 rounded-full shrink-0"></div><div class="flex-1"><div class="skeleton-block h-4 w-1/3 mb-2"></div><div class="skeleton-block h-3 w-1/2"></div></div></div>';
        }

        function skeletonComment() {
            return '<div class="flex items-start gap-3 p-3 border-b border-gray-200 dark:border-gray-700"><div class="skeleton-block w-10 h-10 rounded-full shrink-0"></div><div class="flex-1"><div class="skeleton-block h-4 w-1/4 mb-2"></div><div class="skeleton-block h-4 w-3/4"></div></div></div>';
        }

        function skeletonDetails() {
            return '<div class="skeleton-block h-[300px] w-full mb-4"></div>' +
                '<div class="skeleton-block h-8 w-2/3 mb-3"></div>' +
                '<div class="skeleton-block h-4 w-1/3 mb-4"></div>' +
                '<div class="skeleton-block h-4 w-full mb-2"></div>' +
                '<div class="skeleton-block h-4 w-full mb-2"></div>' +
                '<div class="skeleton-block h-4 w-2/3"></div>';
        }

        // --- Global Variables for Auth and Navigation ---
        const navLinks = document.querySelectorAll('.nav-link');
        const contentSections = document.querySelectorAll('.content-section');
        let currentEventId = null;
        let currentUser = _sessionUser;
        let initialAuthProcessed = false;
        let initialNavigationPromise = null;
        let editingEventId = null;
        let isNavigating = false;

        // --- Variables for multiple image handling ---
        let eventImageFilesToUpload = [];
        let eventImageFileObjectUrls = [];
        let existingEventImageUrls = [];
        let imageUrlsPendingDeletion = [];
        let selectedMainImagePreviewUrl = null;
        const MAX_EVENT_IMAGES = 10;

        // --- Common styles ---
        const inputFieldStyles = "form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#101418] focus:outline-0 focus:ring-2 focus:ring-[#1978e5] border border-[#d4dbe2] bg-gray-50 focus:border-[#1978e5] h-14 placeholder:text-[#5c718a] p-[15px] text-base font-normal leading-normal";
        const formButtonStyles = "flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-4 text-base font-bold leading-normal tracking-[0.015em] transition-colors";
        document.querySelectorAll('.input-field').forEach(el => el.className = inputFieldStyles);
        document.querySelectorAll('.form-button').forEach(el => el.className = `${formButtonStyles} ${el.className}`);

        // --- Navigation ---
        async function navigateTo(targetId, eventData = null) {
            if (isNavigating && targetId !== 'login') {
                console.warn(`Navigation to ${targetId} blocked, already navigating (isNavigating=${isNavigating}).`);
                return Promise.reject(new Error("Navigation blocked, another is in progress."));
            }
            isNavigating = true;
            const navAttemptId = Date.now();
            console.log(`[Nav ${navAttemptId}] Starting navigation to: ${targetId}`, eventData);

            contentSections.forEach(section => {
                section.classList.add('hidden-section');
            });
            navLinks.forEach(link => {
                link.classList.remove('nav-active');
                if (link.dataset.target === targetId) {
                    link.classList.add('nav-active');
                }
            });

            const targetSection = document.getElementById(targetId);

            if (targetId === 'admin' && (!currentUser || currentUser.role !== 'admin')) {
                console.log(`[Nav ${navAttemptId}] Access to admin denied, user is not admin. Showing home.`);
                const homeSection = document.getElementById('home');
                if (homeSection) homeSection.classList.remove('hidden-section');
                isNavigating = false;
                return Promise.resolve();
            }

            if (targetId === 'my-profile-section' && !currentUser) {
                console.log(`[Nav ${navAttemptId}] Access to my-profile-section denied, user not logged in. Showing login.`);
                const loginSection = document.getElementById('login');
                if (loginSection) {
                    loginSection.classList.remove('hidden-section');
                    navLinks.forEach(link => {
                        link.classList.remove('nav-active');
                        if (link.dataset.target === 'login') { link.classList.add('nav-active'); }
                    });
                } else {
                    const homeSection = document.getElementById('home');
                    if (homeSection) homeSection.classList.remove('hidden-section');
                }
                console.log(`[Nav ${navAttemptId}] Resetting isNavigating (profile denied).`);
                isNavigating = false;
                return Promise.resolve();
            }

            try {
                if (targetSection) {
                    console.log(`[Nav ${navAttemptId}] Showing section: ${targetId}`);
                    targetSection.classList.remove('hidden-section');
                    window.scrollTo(0, 0);

                    if (targetId === 'profiles') {
                        await loadProfiles();
                    }
                    if (targetId === 'my-profile-section' && currentUser) {
                        await loadCurrentUserProfileData();
                    }
                    if (targetId === 'admin' && currentUser && currentUser.role === 'admin') {
                        await loadAdminPanel();
                    }
                    if (targetId === 'events') {
                        await loadEvents();
                    }
                    if (targetId === 'event-details' && eventData) {
                        currentEventId = eventData.id;
                        await loadEventDetails(eventData);
                    }
                } else {
                    console.error(`[Nav ${navAttemptId}] Section with id "${targetId}" not found. Defaulting to home.`);
                    const homeSection = document.getElementById('home');
                    if (homeSection) homeSection.classList.remove('hidden-section');
                }
                return Promise.resolve();
            } catch (loadError) {
                console.error(`[Nav ${navAttemptId}] Error during content loading for ${targetId}:`, loadError.message, loadError);
                showModalMessage(`فشل تحميل محتوى قسم ${targetId}. الخطأ: ${loadError.message}`, true);
                const homeSection = document.getElementById('home');
                if (homeSection) {
                    contentSections.forEach(s => s.classList.add('hidden-section'));
                    homeSection.classList.remove('hidden-section');
                }
                throw loadError;
            } finally {
                console.log(`[Nav ${navAttemptId}] Navigation to ${targetId} finished. Resetting isNavigating.`);
                isNavigating = false;
            }
        }

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.currentTarget.dataset.target;
                navigateTo(targetId).catch(err => console.warn("Navigation click error was handled:", err.message));
                const mobileMenu = document.getElementById('mobile-menu');
                if (mobileMenu && !mobileMenu.classList.contains('hidden-section')) {
                    mobileMenu.classList.add('hidden-section');
                }
            });
        });

        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');

        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden-section');
            });
        }

        // --- Authentication Elements ---
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const authLinks = document.getElementById('auth-links');
        const userInfoDisplay = document.getElementById('user-info');
        const userNameNav = document.getElementById('user-name-nav');
        const userAvatarNav = document.getElementById('user-avatar-nav');
        const navLogoutBtn = document.getElementById('nav-logout-btn');
        const commenterAvatar = document.getElementById('commenter-avatar');
        const forgotPasswordForm = document.getElementById('forgot-password-form');
        const myProfileNavLink = document.getElementById('my-profile-nav-link');
        const myProfileNavLinkMobile = document.getElementById('my-profile-nav-link-mobile');
        const adminNavLink = document.getElementById('admin-nav-link');
        const adminNavLinkMobile = document.getElementById('admin-nav-link-mobile');
        const createEventBtnGeneral = document.getElementById('create-event-btn');

        // --- Authentication Logic ---
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const result = await api('login', { email, password });
                saveSession(result.token, result.user);
                showModalMessage('تم تسجيل الدخول بنجاح!');
                await updateAuthState(currentUser);
                preloadAllData();
                navigateTo('home').catch(err => console.warn("Navigation to home after login failed:", err.message));
            } catch (error) {
                showModalMessage(`خطأ في تسجيل الدخول: ${error.message}`, true);
                console.error("Login error:", error);
            }
        });

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const passwordConfirm = document.getElementById('signup-password-confirm').value;
            const fullName = document.getElementById('signup-fullname').value;
            const academicId = document.getElementById('signup-academic-id').value;

            if (password !== passwordConfirm) {
                showModalMessage('كلمتا المرور غير متطابقتين.', true);
                return;
            }
            const strengthIssue = passwordStrengthIssue(password);
            if (strengthIssue) {
                showModalMessage(strengthIssue, true);
                return;
            }

            try {
                const result = await api('signup', {
                    email, password,
                    full_name: fullName,
                    academic_id: academicId || null
                });
                saveSession(result.token, result.user);
                showModalMessage('تم إنشاء حسابك بنجاح!');
                await updateAuthState(currentUser);
                preloadAllData();
                navigateTo('home').catch(err => console.warn("Navigation to home after signup failed:", err.message));
            } catch (error) {
                showModalMessage(`خطأ في إنشاء الحساب: ${error.message}`, true);
                console.error("Signup error:", error);
            }
        });

        function passwordStrengthIssue(password) {
            if (!password) return 'كلمة المرور مطلوبة.';
            if (password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.';
            if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'كلمة المرور يجب أن تحتوي على حروف وأرقام معاً.';
            return null;
        }

        navLogoutBtn.addEventListener('click', async () => {
            console.log("Logout button clicked. Current user before signout:", currentUser);
            if (!currentUser) {
                showModalMessage('أنت غير مسجل الدخول حاليًا.', true);
                return;
            }
            try {
                await api('logout', {});
                saveSession('', null);
                clearDataCache();
                showModalMessage('تم تسجيل الخروج بنجاح.');
                await updateAuthState(currentUser);
                navigateTo('home').catch(err => console.warn("Navigation to home after logout failed:", err.message));
            } catch (error) {
                showModalMessage(`خطأ في تسجيل الخروج: ${error.message}`, true);
                console.error("Logout error:", error);
            }
        });

        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-password-email').value;

            try {
                await api('forgotPassword', { email });
                showModalMessage('إذا كان البريد الإلكتروني موجودًا، فسيتم إرسال رابط إعادة تعيين كلمة المرور إليه.');
                navigateTo('login').catch(err => console.warn("Navigation to login after forgot password error was handled:", err.message));
            } catch (error) {
                showModalMessage(`خطأ في إرسال رابط إعادة التعيين: ${error.message}`, true);
                console.error('Forgot password error:', error.message);
            }
        });

        async function updateAuthState(user) {
            console.log("Updating auth state for user (ID):", user?.id);
            const updateProfileFormContainer = document.getElementById('current-user-profile-form-container');

            if (user) {
                authLinks.className = 'hidden-section items-center gap-2 sm:gap-4';
                myProfileNavLink.classList.remove('hidden-section');
                if (myProfileNavLinkMobile) myProfileNavLinkMobile.classList.remove('hidden-section');
                userInfoDisplay.className = 'flex items-center gap-2 sm:gap-3';

                userNameNav.textContent = user.full_name || user.user_name || user.email || '';
                userAvatarNav.src = user.avatar_url || 'https://placehold.co/32x32/E0E0E0/B0B0B0?text=U';
                commenterAvatar.src = user.avatar_url || 'https://placehold.co/40x40/E0E0E0/B0B0B0?text=User';

                const isAdminUser = (user.role === 'admin');
                if (isAdminUser) {
                    console.log("updateAuthState: User is admin, showing admin panel links.");
                    if (adminNavLink) adminNavLink.classList.remove('hidden-section');
                    if (adminNavLinkMobile) adminNavLinkMobile.classList.remove('hidden-section');
                } else {
                    console.log("updateAuthState: User is not admin (role: " + user.role + "), hiding admin panel links.");
                    if (adminNavLink) adminNavLink.classList.add('hidden-section');
                    if (adminNavLinkMobile) adminNavLinkMobile.classList.add('hidden-section');
                }

                if (createEventBtnGeneral) {
                    if (user.role === 'admin' || user.role === 'full_access_user') {
                        console.log("updateAuthState: User has admin/full access, showing create event button.");
                        createEventBtnGeneral.classList.remove('hidden-section');
                    } else {
                        console.log("updateAuthState: User is not admin (role: " + user.role + "), hiding create event button.");
                        createEventBtnGeneral.classList.add('hidden-section');
                    }
                }

                const myProfileSection = document.getElementById('my-profile-section');
                if (myProfileSection && !myProfileSection.classList.contains('hidden-section')) {
                    if (updateProfileFormContainer) updateProfileFormContainer.classList.remove('hidden-section');
                }
            } else {
                authLinks.className = 'flex items-center gap-2 sm:gap-4';
                myProfileNavLink.classList.add('hidden-section');
                if (myProfileNavLinkMobile) myProfileNavLinkMobile.classList.add('hidden-section');
                if (adminNavLink) adminNavLink.classList.add('hidden-section');
                if (adminNavLinkMobile) adminNavLinkMobile.classList.add('hidden-section');
                userInfoDisplay.className = 'hidden-section items-center gap-2 sm:gap-3';
                userNameNav.textContent = '';
                userAvatarNav.src = 'https://placehold.co/32x32/E0E0E0/B0B0B0?text=U';
                commenterAvatar.src = 'https://placehold.co/40x40/E0E0E0/B0B0B0?text=User';
                if (updateProfileFormContainer) updateProfileFormContainer.classList.add('hidden-section');
                if (createEventBtnGeneral) {
                    console.log("updateAuthState: User is null, hiding create event button.");
                    createEventBtnGeneral.classList.add('hidden-section');
                }
            }
        }

        function isCurrentUserAdmin() {
            return !!(currentUser && currentUser.role === 'admin');
        }

        async function loadAdminPanel() {
            if (!isCurrentUserAdmin()) {
                console.error('Admin panel access denied for user:', currentUser?.role);
                throw new Error('صلاحية المشرف مطلوبة.');
            }
            const statsContainer = document.getElementById('admin-stats');
            const usersContainer = document.getElementById('admin-users-list');
            const emptyState = document.getElementById('admin-empty-state');
            if (statsContainer) statsContainer.innerHTML = skeletonStatsCard().repeat(4);
            if (usersContainer) usersContainer.innerHTML = skeletonAdminRow().repeat(5);

            let stats = getCachedData('stats');
            let users = getCachedData('users');
            if (stats && users) {
                renderAdminStats(stats);
                renderAdminUsersList(users);
                if (emptyState) emptyState.classList.toggle('hidden-section', users.length > 0);
                preloadAllData();
                return;
            }
            stats = { users: 0, events: 0, comments: 0, reactions: 0 };
            users = [];
            try {
                const statsResult = await api('stats', {});
                stats = statsResult.stats || statsResult || stats;
                _dataCache.stats = stats;
            } catch (e) {
                console.warn('Failed to load admin stats:', e.message);
            }
            try {
                const usersResult = await api('listUsers', {});
                users = usersResult.users || [];
                _dataCache.users = users;
            } catch (e) {
                console.warn('Failed to load admin users list:', e.message);
            }

            renderAdminStats(stats);
            renderAdminUsersList(users);

            if (emptyState) {
                emptyState.classList.toggle('hidden-section', users.length > 0);
            }
        }

        function renderAdminStats(stats) {
            const statsContainer = document.getElementById('admin-stats');
            if (!statsContainer) return;
            const statCards = [
                { label: 'المستخدمون', value: stats.users },
                { label: 'الفعاليات', value: stats.events },
                { label: 'التعليقات', value: stats.comments },
                { label: 'التفاعلات', value: stats.reactions }
            ];
            statsContainer.innerHTML = statCards.map(s =>
                '<div class="bg-white dark:bg-gray-800 rounded-xl border border-[#d4dbe2] dark:border-gray-700 p-4 text-center">' +
                '<div class="text-2xl sm:text-3xl font-bold text-[#101418] dark:text-gray-100">' + s.value + '</div>' +
                '<div class="text-xs sm:text-sm text-[#5c718a] mt-1">' + s.label + '</div>' +
                '</div>'
            ).join('');
        }

        let _adminUsersCache = [];
        let _adminTeamCache = [];

        async function uploadMemberPhoto(file) {
            try {
                const base64 = await fileToBase64(file);
                const result = await api('uploadImage', { file: base64, is_avatar: '1' });
                return result.url;
            } catch (err) {
                showModalMessage('فشل رفع الصورة: ' + err.message, true);
                return null;
            }
        }

        function renderAdminUsersList(users) {
            const usersContainer = document.getElementById('admin-users-list');
            const emptyState = document.getElementById('admin-empty-state');
            if (!usersContainer) return;
            _adminUsersCache = users;
            if (!users.length) {
                usersContainer.innerHTML = '';
                if (emptyState) emptyState.classList.remove('hidden-section');
                return;
            }
            if (emptyState) emptyState.classList.add('hidden-section');
            const roleLabels = { user: 'عضو', full_access_user: 'عضو كامل', admin: 'مشرف' };
            usersContainer.innerHTML = users.map(u => {
                const roleLabel = roleLabels[u.role] || u.role || 'عضو';
                const canEditRole = u.role !== 'admin' && u.id !== currentUser?.id;
                const isTeamMember = String(u.show_in_team) !== '0';
                return '<div class="flex flex-wrap items-center gap-3 p-4" data-user-id="' + escapeHtml(u.id) + '">' +
                    '<img src="' + escapeHtml(u.avatar_url || 'https://placehold.co/40x40/E0E0E0/B0B0B0?text=U') + '" loading="lazy" alt="' + escapeHtml(u.full_name || u.email || 'مستخدم') + '" class="w-10 h-10 rounded-full object-cover">' +
                    '<div class="flex-1 min-w-[160px]">' +
                    '<div class="text-sm font-medium text-[#101418] dark:text-gray-100">' + escapeHtml(u.full_name || '—') + '</div>' +
                    '<div class="text-xs text-[#5c718a] truncate">' + escapeHtml(u.user_name || '') + (u.user_name && u.email ? ' · ' : '') + escapeHtml(u.email || '') + '</div>' +
                    '</div>' +
                    '<div class="flex items-center gap-2">' +
                    '<label class="flex items-center gap-1 text-xs text-[#5c718a] cursor-pointer" title="عرض في صفحة الفريق">' +
                    '<input type="checkbox" data-action="admin-toggle-team" data-target-user="' + escapeHtml(u.id) + '"' + (isTeamMember ? ' checked' : '') + ' class="w-4 h-4 accent-[#1978e5]">' +
                    'فريق</label>' +
                    '<button data-action="admin-edit-user" data-target-user="' + escapeHtml(u.id) + '" class="flex items-center justify-center rounded-lg h-9 px-3 bg-gray-200 dark:bg-gray-700 text-[#101418] dark:text-gray-100 text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600"' + (canEditRole ? '' : ' style="display:none"') + '>تعديل</button>' +
                    '<select data-action="admin-role" data-target-user="' + escapeHtml(u.id) + '" class="form-input h-9 rounded-lg text-xs px-2 border border-[#d4dbe2] dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-[#101418] dark:text-gray-100"' + (canEditRole ? '' : ' disabled') + '>' +
                    '<option value="user"' + (u.role === 'user' ? ' selected' : '') + '>عضو</option>' +
                    '<option value="full_access_user"' + (u.role === 'full_access_user' ? ' selected' : '') + '>عضو كامل</option>' +
                    '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>مشرف</option>' +
                    '</select>' +
                    '<button data-action="admin-delete-user" data-target-user="' + escapeHtml(u.id) + '" class="flex items-center justify-center rounded-lg h-9 px-3 bg-red-500 text-slate-50 text-xs font-bold hover:bg-red-600" ' + (canEditRole ? '' : ' style="display:none"') + '>حذف</button>' +
                    '</div>' +
                    '</div>';
            }).join('');
        }

        function switchAdminTab(tab) {
            const usersPanel = document.getElementById('admin-users-panel');
            const teamPanel = document.getElementById('admin-team-panel');
            const usersTab = document.getElementById('admin-tab-users');
            const teamTab = document.getElementById('admin-tab-team');
            const usersTabClasses = 'admin-tab form-button text-sm';
            if (tab === 'team') {
                if (usersPanel) usersPanel.classList.add('hidden-section');
                if (teamPanel) teamPanel.classList.remove('hidden-section');
                if (usersTab) usersTab.className = usersTabClasses + ' bg-[#eaedf1] text-[#101418] hover:bg-gray-300';
                if (teamTab) teamTab.className = usersTabClasses + ' bg-[#1978e5] text-slate-50';
                loadAdminTeam();
            } else {
                if (teamPanel) teamPanel.classList.add('hidden-section');
                if (usersPanel) usersPanel.classList.remove('hidden-section');
                if (teamTab) teamTab.className = usersTabClasses + ' bg-[#eaedf1] text-[#101418] hover:bg-gray-300';
                if (usersTab) usersTab.className = usersTabClasses + ' bg-[#1978e5] text-slate-50';
            }
        }

        function resetAdminUserEditForm() {
            const container = document.getElementById('admin-user-edit-form-container');
            const idInput = document.getElementById('admin-user-edit-id');
            ['admin-user-edit-name', 'admin-user-edit-username', 'admin-user-edit-academic', 'admin-user-edit-avatar',
                'admin-user-edit-member-title', 'admin-user-edit-member-order', 'admin-user-edit-linkedin',
                'admin-user-edit-facebook', 'admin-user-edit-phone'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            if (idInput) idInput.value = '';
            const photoInput = document.getElementById('admin-user-edit-photo');
            const photoPreview = document.getElementById('admin-user-edit-photo-preview');
            if (photoInput) photoInput.value = '';
            if (photoPreview) photoPreview.src = 'https://placehold.co/64x64/E0E0E0/B0B0B0?text=U';
            if (container) container.classList.add('hidden-section');
        }

        function openAdminUserEditForm(userId, user) {
            const container = document.getElementById('admin-user-edit-form-container');
            const idInput = document.getElementById('admin-user-edit-id');
            const set = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = (val === null || typeof val === 'undefined') ? '' : val;
            };
            if (!container) return;
            if (idInput) idInput.value = userId;
            set('admin-user-edit-name', user.full_name);
            set('admin-user-edit-username', user.user_name);
            set('admin-user-edit-academic', user.academic_id);
            set('admin-user-edit-avatar', user.avatar_url);
            set('admin-user-edit-member-title', user.member_title);
            set('admin-user-edit-member-order', user.member_order);
            set('admin-user-edit-linkedin', user.linkedin);
            set('admin-user-edit-facebook', user.facebook);
            set('admin-user-edit-phone', user.phone);
            const photoPreview = document.getElementById('admin-user-edit-photo-preview');
            const photoInput = document.getElementById('admin-user-edit-photo');
            if (photoPreview) photoPreview.src = user.avatar_url || 'https://placehold.co/64x64/E0E0E0/B0B0B0?text=U';
            if (photoInput) photoInput.value = '';
            container.classList.remove('hidden-section');
            const nameEl = document.getElementById('admin-user-edit-name');
            if (nameEl) nameEl.focus();
        }

        async function saveAdminUserEdit() {
            const userId = document.getElementById('admin-user-edit-id').value;
            if (!userId) return;
            const payload = {
                user_id: userId,
                full_name: document.getElementById('admin-user-edit-name').value,
                user_name: document.getElementById('admin-user-edit-username').value,
                academic_id: document.getElementById('admin-user-edit-academic').value,
                avatar_url: document.getElementById('admin-user-edit-avatar').value,
                member_title: document.getElementById('admin-user-edit-member-title').value,
                member_order: document.getElementById('admin-user-edit-member-order').value,
                linkedin: document.getElementById('admin-user-edit-linkedin').value,
                facebook: document.getElementById('admin-user-edit-facebook').value,
                phone: document.getElementById('admin-user-edit-phone').value
            };
            const photoInput = document.getElementById('admin-user-edit-photo');
            const file = photoInput && photoInput.files && photoInput.files[0];
            try {
                if (file) {
                    const uploaded = await uploadMemberPhoto(file);
                    if (uploaded) payload.avatar_url = uploaded;
                }
                await api('adminUpdateUser', payload);
                showModalMessage('تم تحديث ملف العضو بنجاح.');
                resetAdminUserEditForm();
                await loadAdminPanel();
            } catch (err) {
                showModalMessage('فشل تحديث الملف: ' + err.message, true);
            }
        }

        function resetAdminTeamForm() {
            const container = document.getElementById('admin-team-form-container');
            const idInput = document.getElementById('admin-team-edit-id');
            ['admin-team-name', 'admin-team-role', 'admin-team-special', 'admin-team-special-title', 'admin-team-special-quote',
                'admin-team-linkedin', 'admin-team-facebook', 'admin-team-phone', 'admin-team-main-link',
                'admin-team-image', 'admin-team-initials', 'admin-team-sort'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            if (idInput) idInput.value = '';
            const photoInput = document.getElementById('admin-team-photo');
            const photoPreview = document.getElementById('admin-team-photo-preview');
            if (photoInput) photoInput.value = '';
            if (photoPreview) photoPreview.src = 'https://placehold.co/64x64/E0E0E0/B0B0B0?text=U';
            if (container) container.classList.add('hidden-section');
        }

        function openAdminTeamForm(member) {
            const container = document.getElementById('admin-team-form-container');
            const title = document.getElementById('admin-team-form-title');
            const idInput = document.getElementById('admin-team-edit-id');
            if (!container) return;
            if (idInput) idInput.value = member ? member.id : '';
            const set = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = (val === null || typeof val === 'undefined') ? '' : val;
            };
            if (member) {
                set('admin-team-name', member.name);
                set('admin-team-role', member.role);
                set('admin-team-special', member.special_role);
                set('admin-team-special-title', member.special_title);
                set('admin-team-special-quote', member.special_quote);
                set('admin-team-linkedin', member.linkedin);
                set('admin-team-facebook', member.facebook);
                set('admin-team-phone', member.phone);
                set('admin-team-main-link', member.main_link);
                set('admin-team-image', member.image_url);
                set('admin-team-initials', member.initials);
                set('admin-team-sort', member.sort_order);
                if (title) title.textContent = 'تعديل البطاقة اليدوية';
            } else {
                ['admin-team-name', 'admin-team-role', 'admin-team-special', 'admin-team-special-title', 'admin-team-special-quote',
                    'admin-team-linkedin', 'admin-team-facebook', 'admin-team-phone', 'admin-team-main-link',
                    'admin-team-image', 'admin-team-initials', 'admin-team-sort'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
                if (title) title.textContent = 'إضافة بطاقة يدوية (بدون حساب)';
            }
            const photoPreview = document.getElementById('admin-team-photo-preview');
            const photoInput = document.getElementById('admin-team-photo');
            if (photoPreview) photoPreview.src = (member && member.image_url) ? member.image_url : 'https://placehold.co/64x64/E0E0E0/B0B0B0?text=U';
            if (photoInput) photoInput.value = '';
            container.classList.remove('hidden-section');
            const nameEl = document.getElementById('admin-team-name');
            if (nameEl) nameEl.focus();
        }

        async function saveAdminTeamForm() {
            const idInput = document.getElementById('admin-team-edit-id');
            const payload = {
                id: idInput ? idInput.value : '',
                name: document.getElementById('admin-team-name').value,
                role: document.getElementById('admin-team-role').value,
                special_role: document.getElementById('admin-team-special').value,
                special_title: document.getElementById('admin-team-special-title').value,
                special_quote: document.getElementById('admin-team-special-quote').value,
                linkedin: document.getElementById('admin-team-linkedin').value,
                facebook: document.getElementById('admin-team-facebook').value,
                phone: document.getElementById('admin-team-phone').value,
                main_link: document.getElementById('admin-team-main-link').value,
                image_url: document.getElementById('admin-team-image').value,
                initials: document.getElementById('admin-team-initials').value,
                sort_order: document.getElementById('admin-team-sort').value
            };
            if (!payload.name || !payload.name.trim()) {
                showModalMessage('اسم العضو مطلوب.', true);
                return;
            }
            const isEdit = !!payload.id;
            const photoInput = document.getElementById('admin-team-photo');
            const file = photoInput && photoInput.files && photoInput.files[0];
            try {
                if (file) {
                    const uploaded = await uploadMemberPhoto(file);
                    if (uploaded) payload.image_url = uploaded;
                }
                if (isEdit) {
                    await api('updateTeamMember', payload);
                } else {
                    delete payload.id;
                    await api('createTeamMember', payload);
                }
                showModalMessage(isEdit ? 'تم تحديث العضو بنجاح.' : 'تمت إضافة العضو بنجاح.');
                resetAdminTeamForm();
                await loadAdminTeam();
            } catch (err) {
                showModalMessage('فشل الحفظ: ' + err.message, true);
            }
        }

        function resetAdminUserMemberForm() {
            const container = document.getElementById('admin-user-member-form-container');
            const idInput = document.getElementById('admin-user-member-edit-id');
            ['admin-user-member-email', 'admin-user-member-password', 'admin-user-member-name',
                'admin-user-member-title', 'admin-user-member-order', 'admin-user-member-avatar',
                'admin-user-member-linkedin', 'admin-user-member-facebook', 'admin-user-member-phone'
            ].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            if (idInput) idInput.value = '';
            const photoInput = document.getElementById('admin-user-member-photo');
            const photoPreview = document.getElementById('admin-user-member-photo-preview');
            if (photoInput) photoInput.value = '';
            if (photoPreview) photoPreview.src = 'https://placehold.co/64x64/E0E0E0/B0B0B0?text=U';
            if (container) container.classList.add('hidden-section');
        }

        function openAdminUserMemberForm(member) {
            const container = document.getElementById('admin-user-member-form-container');
            const title = document.getElementById('admin-user-member-form-title');
            const idInput = document.getElementById('admin-user-member-edit-id');
            const set = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = (val === null || typeof val === 'undefined') ? '' : val;
            };
            if (!container) return;
            if (member) {
                if (idInput) idInput.value = String(member.id).replace(/^user_/, '');
                set('admin-user-member-email', '');
                set('admin-user-member-password', '');
                set('admin-user-member-name', member.name);
                set('admin-user-member-title', member.role && member.role !== 'عضو' ? member.role : '');
                set('admin-user-member-order', member.sort_order === 9999 ? '' : member.sort_order);
                set('admin-user-member-avatar', member.image_url);
                set('admin-user-member-linkedin', member.linkedin);
                set('admin-user-member-facebook', member.facebook);
                set('admin-user-member-phone', member.phone);
                if (title) title.textContent = 'تعديل عضو (حساب مسجل)';
            } else {
                if (idInput) idInput.value = '';
                ['admin-user-member-email', 'admin-user-member-password', 'admin-user-member-name',
                    'admin-user-member-title', 'admin-user-member-order', 'admin-user-member-avatar',
                    'admin-user-member-linkedin', 'admin-user-member-facebook', 'admin-user-member-phone'
                ].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
                if (title) title.textContent = 'إضافة عضو بحساب مسجل';
            }
            const photoPreview = document.getElementById('admin-user-member-photo-preview');
            const photoInput = document.getElementById('admin-user-member-photo');
            if (photoPreview) photoPreview.src = (member && member.image_url) ? member.image_url : 'https://placehold.co/64x64/E0E0E0/B0B0B0?text=U';
            if (photoInput) photoInput.value = '';
            container.classList.remove('hidden-section');
            const nameEl = document.getElementById('admin-user-member-name');
            if (nameEl) nameEl.focus();
        }

        async function saveAdminUserMemberForm() {
            const idInput = document.getElementById('admin-user-member-edit-id');
            const payload = {
                user_id: idInput ? idInput.value : '',
                full_name: document.getElementById('admin-user-member-name').value,
                member_title: document.getElementById('admin-user-member-title').value,
                member_order: document.getElementById('admin-user-member-order').value,
                linkedin: document.getElementById('admin-user-member-linkedin').value,
                facebook: document.getElementById('admin-user-member-facebook').value,
                phone: document.getElementById('admin-user-member-phone').value,
                avatar_url: document.getElementById('admin-user-member-avatar').value,
                email: document.getElementById('admin-user-member-email').value,
                password: document.getElementById('admin-user-member-password').value
            };
            if (!payload.full_name || !payload.full_name.trim()) {
                showModalMessage('اسم العضو مطلوب.', true);
                return;
            }
            const isEdit = !!payload.user_id;
            if (!isEdit) {
                if (!payload.email || !payload.email.trim() || !payload.password) {
                    showModalMessage('البريد الإلكتروني وكلمة المرور مطلوبان لعضو جديد.', true);
                    return;
                }
            }
            const photoInput = document.getElementById('admin-user-member-photo');
            const file = photoInput && photoInput.files && photoInput.files[0];
            try {
                if (file) {
                    const uploaded = await uploadMemberPhoto(file);
                    if (uploaded) payload.avatar_url = uploaded;
                }
                if (isEdit) {
                    delete payload.email;
                    delete payload.password;
                    await api('adminUpdateUser', payload);
                } else {
                    delete payload.user_id;
                    await api('adminCreateUser', payload);
                }
                showModalMessage(isEdit ? 'تم تحديث العضو بنجاح.' : 'تمت إضافة العضو بحساب جديد.');
                resetAdminUserMemberForm();
                await loadAdminTeam();
            } catch (err) {
                showModalMessage('فشل الحفظ: ' + err.message, true);
            }
        }

        async function loadAdminTeam() {
            const listContainer = document.getElementById('admin-team-list');
            const emptyState = document.getElementById('admin-team-empty-state');
            if (listContainer) listContainer.innerHTML = skeletonAdminRow().repeat(5);
            let team = [];
            const cached = getCachedData('team');
            if (cached && cached.length > 0) {
                _adminTeamCache = cached;
                renderAdminTeamList(cached);
                if (emptyState) emptyState.classList.toggle('hidden-section', cached.length > 0);
                preloadSingle('team', 'team', {}, r => r.team);
                return;
            }
            try {
                const res = await api('team', {});
                team = res.team || [];
                _dataCache.team = team;
            } catch (e) {
                console.warn('Failed to load team list:', e.message);
            }
            _adminTeamCache = team;
            renderAdminTeamList(team);
            if (emptyState) emptyState.classList.toggle('hidden-section', team.length > 0);
        }

        function renderAdminTeamList(team) {
            const listContainer = document.getElementById('admin-team-list');
            if (!listContainer) return;
            if (!team.length) {
                listContainer.innerHTML = '';
                return;
            }
            const specialLabels = { supervisor: 'المشرف على المشروع', teaching_assistant: 'المعيدة المساعدة' };
            listContainer.innerHTML = team.map(m => {
                const specialLabel = specialLabels[m.special_role] || '';
                const isUserMember = !!m.is_user;
                const subParts = [];
                if (m.role) subParts.push(m.role);
                if (specialLabel) subParts.push(specialLabel);
                const labelText = subParts.join(' · ');
                const accountBadge = isUserMember ? '<span class="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full px-2 py-0.5 mr-1">حساب</span>' : '';
                return '<div class="flex flex-wrap items-center gap-3 p-4" data-team-id="' + escapeHtml(m.id) + '">' +
                    '<img src="' + escapeHtml(m.image_url || 'https://placehold.co/40x40/E0E0E0/B0B0B0?text=' + encodeURIComponent(m.initials || '؟')) + '" loading="lazy" alt="' + escapeHtml(m.name || 'عضو') + '" class="w-10 h-10 rounded-full object-cover">' +
                    '<div class="flex-1 min-w-[160px]">' +
                    '<div class="text-sm font-medium text-[#101418] dark:text-gray-100">' + escapeHtml(m.name || '—') + accountBadge + '</div>' +
                    '<div class="text-xs text-[#5c718a] truncate">' + escapeHtml(labelText) + '</div>' +
                    '</div>' +
                    '<div class="flex items-center gap-2">' +
                    '<button data-action="admin-edit-team" data-team-id="' + escapeHtml(m.id) + '" class="flex items-center justify-center rounded-lg h-9 px-3 bg-gray-200 dark:bg-gray-700 text-[#101418] dark:text-gray-100 text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600">تعديل</button>' +
                    '<button data-action="admin-delete-team" data-team-id="' + escapeHtml(m.id) + '" class="flex items-center justify-center rounded-lg h-9 px-3 bg-red-500 text-slate-50 text-xs font-bold hover:bg-red-600">' + (isUserMember ? 'إزالة' : 'حذف') + '</button>' +
                    '</div>' +
                    '</div>';
            }).join('');
        }

        function setupAdminEventListeners() {
            const usersTab = document.getElementById('admin-tab-users');
            const teamTab = document.getElementById('admin-tab-team');
            if (usersTab) usersTab.addEventListener('click', () => switchAdminTab('users'));
            if (teamTab) teamTab.addEventListener('click', () => switchAdminTab('team'));

            const addMemberBtn = document.getElementById('admin-add-team-btn');
            if (addMemberBtn) addMemberBtn.addEventListener('click', () => openAdminTeamForm(null));

            const addUserMemberBtn = document.getElementById('admin-add-user-member-btn');
            if (addUserMemberBtn) addUserMemberBtn.addEventListener('click', () => openAdminUserMemberForm(null));

            const teamSaveBtn = document.getElementById('admin-team-save');
            if (teamSaveBtn) teamSaveBtn.addEventListener('click', saveAdminTeamForm);

            const teamCancelBtn = document.getElementById('admin-team-cancel');
            if (teamCancelBtn) teamCancelBtn.addEventListener('click', resetAdminTeamForm);

            const userMemberSaveBtn = document.getElementById('admin-user-member-save');
            if (userMemberSaveBtn) userMemberSaveBtn.addEventListener('click', saveAdminUserMemberForm);

            const userMemberCancelBtn = document.getElementById('admin-user-member-cancel');
            if (userMemberCancelBtn) userMemberCancelBtn.addEventListener('click', resetAdminUserMemberForm);

            const userSaveBtn = document.getElementById('admin-user-edit-save');
            if (userSaveBtn) userSaveBtn.addEventListener('click', saveAdminUserEdit);

            const userCancelBtn = document.getElementById('admin-user-edit-cancel');
            if (userCancelBtn) userCancelBtn.addEventListener('click', resetAdminUserEditForm);

            document.addEventListener('click', async (e) => {
                const editUserBtn = e.target.closest('[data-action="admin-edit-user"]');
                if (editUserBtn) {
                    const userId = editUserBtn.getAttribute('data-target-user');
                    if (!userId) return;
                    const cached = _adminUsersCache.find(u => String(u.id) === String(userId));
                    if (cached) {
                        openAdminUserEditForm(userId, cached);
                    } else {
                        openAdminUserEditForm(userId, { full_name: '', user_name: '', academic_id: '', avatar_url: '' });
                    }
                    return;
                }

                const deleteUserBtn = e.target.closest('[data-action="admin-delete-user"]');
                if (deleteUserBtn) {
                    const userId = deleteUserBtn.getAttribute('data-target-user');
                    if (!userId) return;
                    showConfirmModal('حذف المستخدم نهائيًا مع كل فعالياته وتفاعلاته. هل أنت متأكد؟', async () => {
                        try {
                            await api('deleteUser', { user_id: userId });
                            showModalMessage('تم حذف المستخدم بنجاح.');
                            await loadAdminPanel();
                        } catch (err) {
                            showModalMessage('فشل الحذف: ' + err.message, true);
                        }
                    });
                    return;
                }

                const editTeamBtn = e.target.closest('[data-action="admin-edit-team"]');
                if (editTeamBtn) {
                    const teamId = editTeamBtn.getAttribute('data-team-id');
                    if (!teamId) return;
                    const cached = _adminTeamCache.find(m => String(m.id) === String(teamId));
                    if (cached) {
                        if (cached.is_user) openAdminUserMemberForm(cached);
                        else openAdminTeamForm(cached);
                        return;
                    }
                    try {
                        const res = await api('team', {});
                        const member = (res.team || []).find(m => String(m.id) === String(teamId));
                        if (!member) {
                            showModalMessage('العضو غير موجود.', true);
                            return;
                        }
                        if (member.is_user) openAdminUserMemberForm(member);
                        else openAdminTeamForm(member);
                    } catch (err) {
                        showModalMessage('فشل تحميل بيانات العضو: ' + err.message, true);
                    }
                    return;
                }

                const deleteTeamBtn = e.target.closest('[data-action="admin-delete-team"]');
                if (deleteTeamBtn) {
                    const teamId = deleteTeamBtn.getAttribute('data-team-id');
                    if (!teamId) return;
                    const cached = _adminTeamCache.find(m => String(m.id) === String(teamId));
                    if (cached && cached.is_user) {
                        const userId = String(cached.id).replace(/^user_/, '');
                        showConfirmModal('إزالة هذا العضو من صفحة الفريق؟ سيُخفى من الفريق ويبقى حسابه.', async () => {
                            try {
                                await api('adminUpdateUser', { user_id: userId, show_in_team: '0' });
                                showModalMessage('تمت إزالة العضو من الفريق.');
                                await loadAdminTeam();
                            } catch (err) {
                                showModalMessage('فشل الإزالة: ' + err.message, true);
                            }
                        });
                        return;
                    }
                    showConfirmModal('حذف هذه البطاقة نهائيًا؟', async () => {
                        try {
                            await api('deleteTeamMember', { id: teamId });
                            showModalMessage('تم حذف البطاقة.');
                            await loadAdminTeam();
                        } catch (err) {
                            showModalMessage('فشل الحذف: ' + err.message, true);
                        }
                    });
                    return;
                }
            });

            document.addEventListener('change', async (e) => {
                const photoInput = e.target.closest('input[type="file"][data-photo-preview]');
                if (photoInput) {
                    const previewId = photoInput.getAttribute('data-photo-preview');
                    const file = photoInput.files[0];
                    if (file && previewId) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            const img = document.getElementById(previewId);
                            if (img) img.src = ev.target.result;
                        };
                        reader.readAsDataURL(file);
                    }
                    return;
                }

                const teamToggle = e.target.closest('[data-action="admin-toggle-team"]');
                if (teamToggle) {
                    const userId = teamToggle.getAttribute('data-target-user');
                    const checked = teamToggle.checked;
                    if (!userId) return;
                    try {
                        await api('adminUpdateUser', { user_id: userId, show_in_team: checked ? '1' : '0' });
                        showModalMessage(checked ? 'تمت إضافة العضو إلى صفحة الفريق.' : 'تمت إزالة العضو من صفحة الفريق.');
                    } catch (err) {
                        showModalMessage('فشل التحديث: ' + err.message, true);
                        teamToggle.checked = !checked;
                    }
                    return;
                }

                const roleSelect = e.target.closest('[data-action="admin-role"]');
                if (!roleSelect) return;
                const userId = roleSelect.getAttribute('data-target-user');
                const role = roleSelect.value;
                if (!userId || !role) return;
                try {
                    await api('updateRole', { user_id: userId, role: role });
                    showModalMessage('تم تحديث دور المستخدم بنجاح.');
                } catch (err) {
                    showModalMessage('فشل تحديث الدور: ' + err.message, true);
                    roleSelect.value = roleSelect.getAttribute('data-previous-value') || 'user';
                }
            });

            const searchInput = document.getElementById('admin-user-search');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    const query = searchInput.value.trim().toLowerCase();
                    const rows = document.querySelectorAll('#admin-users-list [data-user-id]');
                    rows.forEach(row => {
                        const text = (row.textContent || '').toLowerCase();
                        row.style.display = (!query || text.includes(query)) ? '' : 'none';
                    });
                });
            }
        }

        async function restoreSession() {
            if (!_sessionToken) {
                currentUser = null;
                return;
            }
            try {
                const result = await api('me', {});
                saveSession(_sessionToken, result.user);
                console.log("Session restored for user (ID):", result.user?.id);
            } catch (e) {
                console.warn("Session restore failed:", e.message);
                saveSession('', null);
            }
        }

        async function initialNavigation() {
            try {
                const hash = window.location.hash.substring(1);
                let targetPage = 'home';
                const activeSection = Array.from(contentSections).find(s => !s.classList.contains('hidden-section'));

                if (hash && document.getElementById(hash)) {
                    targetPage = hash;
                } else if (activeSection && activeSection.id !== 'login' && activeSection.id !== 'signup') {
                    if (!currentUser && (activeSection.id === 'my-profile-section' || activeSection.id === 'event-details' || activeSection.id === 'events')) {
                        targetPage = 'home';
                    } else if (currentUser && activeSection.id) {
                        targetPage = activeSection.id;
                    }
                } else if (hash) {
                    targetPage = 'home';
                }

                console.log("Initial Navigation Decision: Navigating to:", targetPage);
                await navigateTo(targetPage);
            } catch (navError) {
                console.error('Initial navigation failed:', navError.message, navError);
                await navigateTo('home').catch(fallbackErr => console.error("Fallback navigation to home also failed:", fallbackErr.message));
            }
        }

        const teamMembersListContainer = document.getElementById('team-members-list');
        const updateProfileForm = document.getElementById('update-profile-form');
        const updateAvatarPreview = document.getElementById('update-avatar-preview');
        const updateAvatarFile = document.getElementById('update-avatar-file');

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

        async function loadCurrentUserProfileData() {
            if (!currentUser) {
                console.error('No user logged in, cannot load profile data for editing.');
                const profileFormContainer = document.getElementById('current-user-profile-form-container');
                if (profileFormContainer) profileFormContainer.classList.add('hidden-section');
                throw new Error("User not logged in, cannot load profile data.");
            }
            const profileFormContainer = document.getElementById('current-user-profile-form-container');
            if (profileFormContainer) profileFormContainer.classList.remove('hidden-section');

            if (document.getElementById('update-full-name')) document.getElementById('update-full-name').value = currentUser.full_name || '';
            if (document.getElementById('update-user-name')) document.getElementById('update-user-name').value = currentUser.user_name || '';
            if (document.getElementById('update-academic-id')) document.getElementById('update-academic-id').value = currentUser.academic_id || '';
            if (document.getElementById('update-profile-role-display')) document.getElementById('update-profile-role-display').textContent = currentUser.role || 'غير محدد';
            if (updateAvatarPreview) updateAvatarPreview.src = currentUser.avatar_url || 'https://placehold.co/100x100/E0E0E0/B0B0B0?text=Avatar';
        }

        updateProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser) {
                showModalMessage('يجب تسجيل الدخول لتحديث الملف الشخصي.', true);
                return;
            }

            const fullName = document.getElementById('update-full-name').value;
            const userName = document.getElementById('update-user-name').value;
            const academicId = document.getElementById('update-academic-id').value;
            const avatarFile = document.getElementById('update-avatar-file').files[0];
            let avatarUrl = updateAvatarPreview.src;

            try {
                if (avatarFile) {
                    const dataUrl = await fileToBase64(avatarFile);
                    const base64 = dataUrl.split(',')[1] || '';
                    const result = await api('uploadImage', {
                        base64, file_name: avatarFile.name, mime_type: avatarFile.type || 'image/png', is_avatar: '1'
                    });
                    avatarUrl = result.url;
                }

                const result = await api('updateProfile', {
                    full_name: fullName, user_name: userName, academic_id: academicId, avatar_url: avatarUrl
                });
                saveSession(_sessionToken, result.user);

                showModalMessage('تم تحديث الملف الشخصي بنجاح!');
                await updateAuthState(currentUser);
            } catch (error) {
                showModalMessage(`فشل تحديث الملف الشخصي: ${error.message}`, true);
                console.error("Profile update error:", error);
            }
        });

        async function loadProfiles() {
            if (!teamMembersListContainer) {
                console.error("Profile container 'team-members-list' not found.");
                throw new Error("Profile container 'team-members-list' not found.");
            }
            teamMembersListContainer.innerHTML = skeletonMemberCard().repeat(9);

            const cached = getCachedData('team');
            if (cached && cached.length > 0) {
                renderDynamicTeam(cached);
                preloadSingle('team', 'team', {}, r => r.team);
                return;
            }

            let teamData = null;
            let backendConnected = false;
            try {
                const res = await api('team', {});
                teamData = res.team || [];
                backendConnected = true;
                _dataCache.team = teamData;
            } catch (e) {
                console.warn("Backend team unavailable, falling back to static data:", e.message);
            }

            if (backendConnected && teamData.length > 0) {
                renderDynamicTeam(teamData);
            } else {
                renderStaticTeam();
            }
        }

        function specialTeamCard(member, borderColor, defaultTitle) {
            const borderClass = borderColor === 'blue' ? 'border-blue-500' : 'border-yellow-500';
            const borderImgClass = borderColor === 'blue' ? 'border-blue-300' : 'border-yellow-300';
            const img = member.image_url || `https://placehold.co/200x200/1E3A8A/60A5FA?text=${encodeURIComponent(member.initials || '؟')}&font=cairo`;
            return `
                <div class="col-span-full mb-6">
                    <div class="team-member-card bg-slate-100 dark:bg-gray-900/50 p-4 rounded-lg text-center shadow-lg border-l-4 ${borderClass}" style="--animation-delay: 0s;">
                        <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">${escapeHtml(member.special_title || defaultTitle)}</h3>
                        <img src="${img}" loading="lazy" alt="${escapeHtml(member.name || 'عضو')}" class="w-24 h-24 rounded-full mx-auto mb-3 border-4 ${borderImgClass} shadow-md object-cover">
                        <h4 class="text-lg font-bold text-gray-800 dark:text-gray-100">${escapeHtml(member.name || '')}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">${escapeHtml(member.role || '')}</p>
                        ${member.special_quote ? '<p class="text-sm text-gray-700 dark:text-gray-200 max-w-2xl mx-auto italic">"' + escapeHtml(member.special_quote) + '"</p>' : ''}
                    </div>
                </div>`;
        }

        function renderDynamicTeam(team) {
            const supervisors = team.filter(m => m.special_role === 'supervisor');
            const assistants = team.filter(m => m.special_role === 'teaching_assistant');
            const members = team.filter(m => m.special_role !== 'supervisor' && m.special_role !== 'teaching_assistant');

            let html = '';
            supervisors.forEach(m => { html += specialTeamCard(m, 'yellow', 'المشرف على المشروع'); });
            assistants.forEach(m => { html += specialTeamCard(m, 'blue', 'المعيدة المساعدة'); });

            members.forEach((m, index) => {
                const profileData = {
                    name: m.name,
                    role: m.role,
                    imgUrl: m.image_url || undefined,
                    imgInitial: m.initials || '؟',
                    linkedinUrl: m.linkedin,
                    facebookUrl: m.facebook,
                    phone: m.phone,
                    animationDelay: `${(index + 1) * 0.05}s`
                };
                let cardClasses = "team-member-card p-2 sm:p-3 rounded-lg text-center";
                let cardAttributes = `style="--animation-delay: ${profileData.animationDelay};"`;
                if (m.main_link) {
                    cardClasses += " cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300";
                    cardAttributes += ` data-main-link="${escapeHtml(m.main_link)}"`;
                }
                html += `
                    <div class="${cardClasses}" ${cardAttributes}>
                        ${createProfileCard(profileData)}
                    </div>`;
            });

            teamMembersListContainer.innerHTML = html;
            attachTeamCardClickHandlers();
        }

        function attachTeamCardClickHandlers() {
            if (!teamMembersListContainer) return;
            teamMembersListContainer.onclick = null;
            teamMembersListContainer.addEventListener('click', (e) => {
                const card = e.target.closest('[data-main-link]');
                if (card && card.dataset.mainLink) {
                    window.open(card.dataset.mainLink, '_blank');
                }
            });
        }

        function renderStaticTeam() {
            if (!teamMembersListContainer) {
                console.error("Profile container 'team-members-list' not found.");
                throw new Error("Profile container 'team-members-list' not found.");
            }
            teamMembersListContainer.innerHTML = '<div class="text-center p-4 text-gray-500 col-span-full">جاري تحميل ملفات الفريق...</div>';

            try {
                const teamMembersData = [
                    { name: "مينا حنا فهيم", role: "مهندس كهرباء", imgInitial: "م.ح", linkedinUrl: "https://www.linkedin.com/in/engminahanna", facebookUrl: "https://www.facebook.com/Eng.Mina.H.F", phone: "+201203006152", mainLink: "https://linktr.ee/Eng.MinaHanna" },
                    { name: "مينا فليب لبيب", role: "مهندس كهرباء", imgInitial: "م.ف", linkedinUrl: "https://www.linkedin.com/in/mena-philip-766454340", facebookUrl: "https://www.facebook.com/profile.php?id=100004623032980", phone: "+201228226064", mainLink: "https://linktr.ee/Menaphilip" },
                    { name: "عمر عبد الهادي رمادي", role: "مهندس كهرباء", imgInitial: "ع.ع", linkedinUrl: "https://www.linkedin.com/in/omar-al-ramady-3a2022206", facebookUrl: "https://www.facebook.com/omar.al.ramady.2025", phone: "+201118525778", mainLink: "https://linktr.ee/Omar_AlRamady" },
                    { name: "محمد سيد محمد حسان", role: "مهندس كهرباء", imgInitial: "م.س", linkedinUrl: "https://www.linkedin.com/in/mohammed-sayed-mohammed-1892382b8", facebookUrl: "https://www.facebook.com/share/15aNJqX3NS/", phone: "+201152216149" },
                    { name: "محمد محمود بربري", role: "مهندس كهرباء", imgInitial: "م.م" },
                    { name: "احمد طارق احمد محمد", role: "مهندس كهرباء", imgInitial: "أ.ط", linkedinUrl: "https://www.linkedin.com/in/ahmed-tarek-a6b9061b6", facebookUrl: "https://www.facebook.com/share/1EGXAoeUcn/", phone: "+201023237803" },
                    { name: "شروق محمد فتحي", role: "مهندس كهرباء", imgInitial: "ش.م" },
                    { name: "فرحه محمد صلاح", role: "مهندس كهرباء", imgInitial: "ف.م" },
                    { name: "حسن السيد فواز", role: "مهندس كهرباء", imgInitial: "ح.ا" },
                    { name: "احمد اشرف سليمان", role: "مهندس كهرباء", imgInitial: "أ.أ", linkedinUrl: "https://www.linkedin.com/in/ahmed-ashraf-soliman-772038267", facebookUrl: "https://www.facebook.com/share/19boqUX4LV/", phone: "+201204800317" },
                    { name: "كريم احمد نور الدين", role: "مهندس كهرباء", imgInitial: "ك.أ", linkedinUrl: "https://www.linkedin.com/in/karim-ahmed-b68877251", facebookUrl: "https://www.facebook.com/share/1Mu5LQo5sK/?mibextid=wwXIfr", phone: "+201006036359" },
                    { name: "محمد يوسف عماره", role: "مهندس كهرباء", imgInitial: "م.ي", linkedinUrl: "https://www.linkedin.com/in/mohamed-yousef-bab471352", facebookUrl: "https://www.facebook.com/share/19JDJBVuch/", phone: "+201063815096" }
                ];

                const supervisorCardHTML = `
                <div class="col-span-full mb-6">
                    <div class="team-member-card bg-slate-100 dark:bg-gray-900/50 p-4 rounded-lg text-center shadow-lg border-l-4 border-yellow-500" style="--animation-delay: 0s;">
                        <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">المشرف على المشروع</h3>
                        <img src="https://placehold.co/200x200/78350F/FCD34D?text=Z" alt="صورة المشرف" class="w-24 h-24 rounded-full mx-auto mb-3 border-4 border-yellow-300 shadow-md object-cover">
                        <h4 class="text-lg font-bold text-gray-800 dark:text-gray-100">أ.د/ زينب جمال </h4>
                        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">أستاذ بقسم هندسة القوى والآلات الكهربية</p>
                        <p class="text-sm text-gray-700 dark:text-gray-200 max-w-2xl mx-auto italic">
                            "نتوجه بخالص الشكر والتقدير لمشرفنا الفاضل على دعمه المستمر وتوجيهاته القيمة التي كانت أساس نجاحنا في هذا المشروع."
                        </p>
                    </div>
                </div>`;

                const teachingAssistantCardHTML = `
                <div class="col-span-full mb-6">
                    <div class="team-member-card bg-slate-100 dark:bg-gray-900/50 p-4 rounded-lg text-center shadow-lg border-l-4 border-blue-500" style="--animation-delay: 0.05s;">
                        <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">المعيدة المساعدة</h3>
                        <img src="https://placehold.co/200x200/1E3A8A/60A5FA?text=H" alt="صورة المعيدة المساعدة" class="w-24 h-24 rounded-full mx-auto mb-3 border-4 border-blue-300 shadow-md object-cover">
                        <h4 class="text-lg font-bold text-gray-800 dark:text-gray-100">م/ هايدي احمد </h4>
                        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">معيدة مساعدة بقسم هندسة القوى والآلات الكهربية</p>
                        <p class="text-sm text-gray-700 dark:text-gray-200 max-w-2xl mx-auto italic">
                            "كما نتقدم بجزيل الشكر للمهندسة المعيدة على مجهوداتها ومتابعتها الدؤوبة التي ساهمت في إتمام هذا العمل على أفضل وجه."
                        </p>
                    </div>
                </div>`;

                let memberHtml = supervisorCardHTML + teachingAssistantCardHTML;

                teamMembersData.forEach((member, index) => {
                    const profileData = {
                        name: member.name,
                        role: member.role,
                        imgUrl: member.imgUrl,
                        imgInitial: member.imgInitial,
                        linkedinUrl: member.linkedinUrl,
                        facebookUrl: member.facebookUrl,
                        phone: member.phone,
                        animationDelay: `${(index + 2) * 0.05}s`
                    };

                    let cardClasses = "team-member-card p-2 sm:p-3 rounded-lg text-center";
                    let cardAttributes = `style="--animation-delay: ${profileData.animationDelay};"`;

                    if (member.mainLink) {
                        cardClasses += " cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300";
                        cardAttributes += ` onclick="window.open('${escapeHtml(member.mainLink)}', '_blank')"`;
                    }

                    memberHtml += `
                        <div class="${cardClasses}" ${cardAttributes}>
                            ${createProfileCard(profileData)}
                        </div>`;
                });

                const vacantSpots = 3;
                for (let i = 0; i < vacantSpots; i++) {
                    memberHtml += `
                    <div class="team-member-card p-2 sm:p-3 rounded-lg text-center bg-gray-700 bg-opacity-20 border-gray-600" style="--animation-delay: ${(teamMembersData.length + i + 2) * 0.05}s;">
                        <div>
                            <img src="https://placehold.co/70x70/333333/888888?text=؟${i+1}&font=cairo" alt="مكان شاغر ${i+1}" class="w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto mb-1 border-2 border-gray-500 shadow-md">
                            <h3 class="text-xs font-bold text-gray-300 mb-0.5 leading-tight">مكان شاغر ${i+1}</h3>
                            <p class="text-gray-400 mb-1 text-xxs" style="font-size: 0.6rem;">انضم إلينا!</p>
                        </div>
                        <button onclick="showModalMessage('ميزة اقتراح المهام غير متاحة حاليًا.', true)" class="text-xxs py-1 px-2 w-full mt-auto bg-gray-500 hover:bg-gray-600 text-white rounded" style="font-size: 0.55rem; padding: 0.2rem 0.4rem;">
                            تفاصيل
                        </button>
                    </div>`;
                }
                teamMembersListContainer.innerHTML = memberHtml;

            } catch (e) {
                console.error("Error in loadProfiles (static data processing):", e);
                teamMembersListContainer.innerHTML = '<div class="text-center p-4 text-red-500 col-span-full">فشل تحميل ملفات الفريق. <button onclick="loadProfiles()" class="underline font-bold cursor-pointer">إعادة المحاولة</button></div>';
                throw e;
            }
        }

        function createProfileCard(member) {
            const imgSrc = member.imgUrl ? member.imgUrl : `https://placehold.co/70x70/1a1a1a/00f0ff?text=${encodeURIComponent(member.imgInitial || '؟')}&font=cairo`;
            const safeImgSrc = escapeHtml(imgSrc);
            const placeholderSrc = `https://placehold.co/70x70/1a1a1a/cccccc?text=${encodeURIComponent(member.imgInitial || '؟')}&font=cairo`;

            let socialLinksHTML = '<div class="flex justify-center space-x-2 mt-2">';
            if (member.linkedinUrl) {
                socialLinksHTML += `<a href="${escapeHtml(member.linkedinUrl)}" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
                                        <svg class="social-icon" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                    </a>`;
            }
            if (member.facebookUrl) {
                socialLinksHTML += `<a href="${escapeHtml(member.facebookUrl)}" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
                                        <svg class="social-icon" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                                    </a>`;
            }
            if (member.phone) {
                socialLinksHTML += `<a href="https://wa.me/${encodeURIComponent(String(member.phone).replace(/\s+/g, ''))}" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-green-500 dark:text-gray-400 dark:hover:text-green-400">
                                        <svg class="social-icon" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.712-.975z"/></svg>
                                    </a>`;
            }
            socialLinksHTML += '</div>';

            return `
                    <img src="${safeImgSrc}" loading="lazy" alt="صورة ${escapeHtml(member.name || 'عضو')}" class="w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto mb-1 border-2 shadow-md object-cover" onerror="this.onerror=null; this.src='${placeholderSrc}';">
                    <h3 class="text-xs font-bold mb-0.5 leading-tight">${escapeHtml(member.name || 'عضو غير معروف')}</h3>
                    <p class="font-semibold text-xxs text-blue-500" style="font-size: 0.6rem;">${escapeHtml(member.role || 'عضو')}</p>
                    ${socialLinksHTML}
                `;
        }

        const upcomingEventsList = document.getElementById('upcoming-events-list');
        const pastEventsList = document.getElementById('past-events-list');
        const eventDetailsContent = document.getElementById('event-details-content');
        const eventDetailsMainImage = document.getElementById('event-details-main-image');
        const eventDetailsGallery = document.getElementById('event-details-gallery');
        const eventCommentsList = document.getElementById('event-comments-list');
        const addCommentForm = document.getElementById('add-comment-form');
        const createEventFormContainer = document.getElementById('create-event-form-container');
        const createEventForm = document.getElementById('create-event-form');
        const cancelCreateEventBtn = document.getElementById('cancel-create-event-btn');
        const eventFormTitle = document.getElementById('event-form-title');
        const submitEventFormBtn = document.getElementById('submit-event-form-btn');
        const eventImageFilesInput = document.getElementById('event-image-files');
        const eventImagesPreviewContainer = document.getElementById('event-images-preview-container');

        // --- Multiple Image Handling for Event Form ---
        function renderImagePreviews() {
            eventImagesPreviewContainer.innerHTML = '';

            if (Array.isArray(existingEventImageUrls)) {
                existingEventImageUrls.forEach((url, index) => {
                    const previewItem = createImagePreviewElement(url, url, false, index);
                    eventImagesPreviewContainer.appendChild(previewItem);
                });
            } else if (existingEventImageUrls) {
                const previewItem = createImagePreviewElement(existingEventImageUrls, existingEventImageUrls, false, 0);
                eventImagesPreviewContainer.appendChild(previewItem);
            }

            eventImageFilesToUpload.forEach((file, index) => {
                const localUrl = eventImageFileObjectUrls[index] || URL.createObjectURL(file);
                const previewItem = createImagePreviewElement(localUrl, localUrl, true, index);
                eventImagesPreviewContainer.appendChild(previewItem);
            });
            updateSelectedMainImageStyle();
        }

        function createImagePreviewElement(displaySrc, originalIdentifier, isNewFile, fileIndex = -1) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'relative group';

            const img = document.createElement('img');
            img.src = displaySrc;
            img.alt = 'معاينة الملف';
            img.className = 'event-image-preview-item w-full h-full object-cover rounded-md';
            img.dataset.identifier = originalIdentifier;

            if (!displaySrc.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
                img.src = 'https://placehold.co/100x100/64748B/FFFFFF?text=File';
                const fileTypeLabel = document.createElement('p');
                fileTypeLabel.className = 'absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center p-1 truncate';
                const fileName = isNewFile ? eventImageFilesToUpload[fileIndex].name : originalIdentifier.split('/').pop();
                fileTypeLabel.textContent = fileName;
                imgContainer.appendChild(fileTypeLabel);
            }

            img.onclick = () => {
                selectedMainImagePreviewUrl = originalIdentifier;
                updateSelectedMainImageStyle();
            };
            imgContainer.appendChild(img);

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-75 group-hover:opacity-100 cursor-pointer';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (isNewFile) {
                    if (eventImageFileObjectUrls[fileIndex]) URL.revokeObjectURL(eventImageFileObjectUrls[fileIndex]);
                    eventImageFilesToUpload.splice(fileIndex, 1);
                    eventImageFileObjectUrls.splice(fileIndex, 1);
                } else {
                    const urlToRemove = originalIdentifier;
                    const indexToRemove = existingEventImageUrls.indexOf(urlToRemove);
                    if (indexToRemove > -1) {
                        existingEventImageUrls.splice(indexToRemove, 1);
                        imageUrlsPendingDeletion.push(urlToRemove);
                    }
                }
                if (selectedMainImagePreviewUrl === originalIdentifier) {
                    selectedMainImagePreviewUrl = (existingEventImageUrls.length > 0) ? existingEventImageUrls[0] : (eventImageFileObjectUrls.length > 0 ? eventImageFileObjectUrls[0] : null);
                }
                renderImagePreviews();
            };
            imgContainer.appendChild(deleteBtn);

            return imgContainer;
        }

        function updateSelectedMainImageStyle() {
            document.querySelectorAll('.event-image-preview-item').forEach(item => {
                item.classList.remove('selected-main');
                if (item.dataset.identifier === selectedMainImagePreviewUrl) {
                    item.classList.add('selected-main');
                }
            });
        }

        if (eventImageFilesInput) {
            eventImageFilesInput.addEventListener('change', (event) => {
                const files = Array.from(event.target.files);
                const currentPreviewsCount = Array.isArray(existingEventImageUrls) ? existingEventImageUrls.length : (existingEventImageUrls ? 1 : 0);
                const totalImages = currentPreviewsCount + eventImageFilesToUpload.length + files.length;

                if (totalImages > MAX_EVENT_IMAGES) {
                    showModalMessage(`لا يمكن رفع أكثر من ${MAX_EVENT_IMAGES} صور.`, true);
                    event.target.value = "";
                    return;
                }
                const invalidFile = files.find(f => !f.type.startsWith('image/'));
                if (invalidFile) {
                    showModalMessage('يرجى اختيار ملفات صور فقط.', true);
                    event.target.value = "";
                    return;
                }
                const oversizedFile = files.find(f => f.size > 10 * 1024 * 1024);
                if (oversizedFile) {
                    showModalMessage('حجم كل صورة يجب ألا يتجاوز 10 ميجابايت.', true);
                    event.target.value = "";
                    return;
                }
                files.forEach(file => {
                    eventImageFilesToUpload.push(file);
                    eventImageFileObjectUrls.push(URL.createObjectURL(file));
                });
                if (!selectedMainImagePreviewUrl && eventImageFileObjectUrls.length > 0) {
                    selectedMainImagePreviewUrl = eventImageFileObjectUrls[0];
                }
                renderImagePreviews();
            });
        }

        createEventBtnGeneral.addEventListener('click', () => {
            editingEventId = null;
            eventImageFilesToUpload = [];
            eventImageFileObjectUrls = [];
            existingEventImageUrls = [];
            imageUrlsPendingDeletion = [];
            selectedMainImagePreviewUrl = null;
            eventFormTitle.textContent = 'إنشاء فعالية جديدة';
            submitEventFormBtn.textContent = 'إنشاء';
            createEventForm.reset();
            renderImagePreviews();
            createEventFormContainer.classList.remove('hidden-section');
            createEventBtnGeneral.classList.add('hidden-section');
        });

        cancelCreateEventBtn.addEventListener('click', () => {
            createEventFormContainer.classList.add('hidden-section');
            if (currentUser) {
                updateAuthState(currentUser);
            } else {
                createEventBtnGeneral.classList.add('hidden-section');
            }
            createEventForm.reset();
            editingEventId = null;
            eventImageFilesToUpload = [];
            eventImageFileObjectUrls = [];
            existingEventImageUrls = [];
            imageUrlsPendingDeletion = [];
            selectedMainImagePreviewUrl = null;
            renderImagePreviews();
        });

        createEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser) {
                showModalMessage('يجب تسجيل الدخول لإنشاء أو تعديل فعالية.', true);
                navigateTo('login').catch(err => console.warn("Navigation to login after create event attempt failed:", err.message));
                return;
            }

            const title = document.getElementById('event-title').value;
            const description = document.getElementById('event-description').value;
            const event_date = document.getElementById('event-date').value;

            let uploadedImageUrls = [];
            let finalImageUrls = Array.isArray(existingEventImageUrls) ? [...existingEventImageUrls] : (existingEventImageUrls ? [existingEventImageUrls] : []);

            try {
                for (const file of eventImageFilesToUpload) {
                    const dataUrl = await fileToBase64(file);
                    const base64 = dataUrl.split(',')[1] || '';
                    const result = await api('uploadImage', {
                        base64, file_name: file.name, mime_type: file.type || 'image/jpeg', is_avatar: '0'
                    });
                    uploadedImageUrls.push(result.url);
                }

                finalImageUrls.push(...uploadedImageUrls);
                finalImageUrls = finalImageUrls.slice(0, MAX_EVENT_IMAGES);

                let mainImageUrlToSave = selectedMainImagePreviewUrl;
                const newMainFileIndex = eventImageFilesToUpload.findIndex((f, i) => selectedMainImagePreviewUrl && eventImageFileObjectUrls[i] === selectedMainImagePreviewUrl);
                if (newMainFileIndex !== -1 && uploadedImageUrls[newMainFileIndex]) {
                    mainImageUrlToSave = uploadedImageUrls[newMainFileIndex];
                } else if (!finalImageUrls.includes(mainImageUrlToSave) && finalImageUrls.length > 0) {
                    mainImageUrlToSave = finalImageUrls[0];
                } else if (finalImageUrls.length === 0) {
                    mainImageUrlToSave = null;
                }

                if (editingEventId) {
                    await api('updateEvent', {
                        id: editingEventId, title, description, event_date,
                        image_urls: finalImageUrls, main_image_url: mainImageUrlToSave
                    });
                } else {
                    await api('createEvent', {
                        title, description, event_date,
                        image_urls: finalImageUrls, main_image_url: mainImageUrlToSave
                    });
                }

                if (imageUrlsPendingDeletion.length > 0) {
                    try {
                        await api('deleteImages', { image_urls: imageUrlsPendingDeletion });
                    } catch (de) {
                        console.warn('Error deleting old images from Drive:', de.message);
                    }
                }

                showModalMessage(`تم ${editingEventId ? 'تحديث' : 'إنشاء'} الفعالية بنجاح!`);
                createEventForm.reset();
                eventImageFilesInput.value = '';
                eventImageFilesToUpload = [];
                eventImageFileObjectUrls = [];
                existingEventImageUrls = [];
                selectedMainImagePreviewUrl = null;
                imageUrlsPendingDeletion = [];
                renderImagePreviews();
                createEventFormContainer.classList.add('hidden-section');
                if (currentUser) updateAuthState(currentUser);
                editingEventId = null;
                await loadEvents();
            } catch (error) {
                showModalMessage(`فشل ${editingEventId ? 'تحديث' : 'إنشاء'} الفعالية: ${error.message}`, true);
                console.error("Event form submission error:", error);
            }
        });

        function createEventCard(eventItem, isUpcoming = true) {
            const eventDate = parseLocalDate(eventItem.event_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
            const reactionTypes = [
                { type: 'like', emoji: '👍', label: 'أعجبني' }, { type: 'love', emoji: '❤️', label: 'أحببته' },
                { type: 'sad', emoji: '😢', label: 'أحزنني' }
            ];
            let reactionButtonsHTML = reactionTypes.map(rt => `
                <button class="reaction-btn p-1 rounded-full hover:bg-gray-200 focus:outline-none" data-eventid="${eventItem.id}" data-reactiontype="${rt.type}" aria-label="${rt.label}">
                    <span id="${rt.type}-icon-${eventItem.id}" class="text-xl">${rt.emoji}</span>
                </button>
                <span id="${rt.type}-count-${eventItem.id}" class="text-xs text-slate-500 mr-1">0</span>
            `).join('');

            let ownerControlsHTML = '';
            if (currentUser && currentUser.id === eventItem.user_id) {
                ownerControlsHTML = `
                    <button class="edit-event-btn text-xs bg-yellow-400 hover:bg-yellow-500 text-black py-1 px-2 rounded mr-2" data-eventid="${eventItem.id}">تعديل</button>
                    <button class="delete-event-btn text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded" data-eventid="${eventItem.id}" data-imageurls="${escapeHtml(JSON.stringify(eventItem.image_urls || []))}">حذف</button>
                `;
            }
            const displayImageUrl = eventItem.main_image_url || (eventItem.image_urls && Array.isArray(eventItem.image_urls) && eventItem.image_urls.length > 0 ? eventItem.image_urls[0] : 'https://placehold.co/400x300/64748B/E0E7FF?text=Event+Image');

            const cardHTML = `
                <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div class="md:flex">
                        <div class="md:shrink-0 md:w-1/3">
                            <img class="h-48 w-full object-cover md:h-full event-image" loading="lazy" src="${displayImageUrl}" alt="${escapeHtml(eventItem.title)}">
                        </div>
                        <div class="p-6 md:w-2/3 flex flex-col justify-between">
                            <div>
                                <div class="uppercase tracking-wide text-sm text-[#1978e5] font-semibold">${eventDate}</div>
                                <a href="#" class="block mt-1 text-lg leading-tight font-medium text-black hover:underline event-details-link" data-eventid="${eventItem.id}">${escapeHtml(eventItem.title)}</a>
                                <p class="mt-2 text-slate-600 text-sm">${escapeHtml(eventItem.description ? eventItem.description.substring(0, 150) + (eventItem.description.length > 150 ? '...' : '') : 'لا يوجد وصف متاح.')}</p>
                            </div>
                             <div class="mt-2"> ${ownerControlsHTML} </div>
                            <div class="mt-4 flex justify-between items-center">
                                <button class="event-details-link text-sm font-medium text-[#1978e5] hover:text-blue-700 py-2 px-3 rounded-md bg-blue-50 hover:bg-blue-100 transition" data-eventid="${eventItem.id}">
                                    ${isUpcoming ? 'معرفة المزيد' : 'عرض التفاصيل'}
                                </button>
                                <div class="flex items-center gap-2 text-slate-500 text-xs">
                                    ${reactionButtonsHTML}
                                    <button class="toggle-comment-btn p-1 rounded-full hover:bg-gray-200 focus:outline-none" data-eventid="${eventItem.id}" aria-label="تعليق">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chat-dots text-gray-400" viewBox="0 0 16 16"><path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/> <path d="m2.165 15.803.02-.004c1.83-.363 2.948-.842 3.468-1.105A9.06 9.06 0 0 0 8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.437 10.437 0 0 1-.524 2.318l-.003.011a10.722 10.722 0 0 1-.244.637c-.079.186.074.394.273.362a21.673 21.673 0 0 0 .693-.125zm.8-3.108a1 1 0 0 0-.287-.801C1.618 10.83 1 9.468 1 8c0-3.192 3.004-6 7-6s7 2.808 7 6c0 3.193-3.004 6-7 6a8.06 8.06 0 0 1-2.088-.272 1 1 0 0 0-.711.074c-.387.196-1.24.57-2.634.893a10.97 10.97 0 0 0 .398-2z"/></svg>
                                    </button>
                                    <span id="comments-count-${eventItem.id}">0</span>
                                </div>
                            </div>
                            <div id="quick-comment-container-${eventItem.id}" class="hidden-section p-2 border-t mt-2">
                                <textarea id="quick-comment-text-${eventItem.id}" class="w-full p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" rows="2" placeholder="اكتب تعليقاً سريعاً..."></textarea>
                                <button class="post-quick-comment-btn mt-1 text-xs bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600" data-eventid="${eventItem.id}">نشر التعليق</button>
                            </div>
                        </div>
                    </div>
                </div>`;

            fetchEventCounts(eventItem.id);
            checkUserReaction(eventItem.id);
            return cardHTML;
        }

        async function fetchEventCounts(eventId, forDetails = false) {
            const suffix = forDetails ? '-details' : '';
            try {
                const counts = await api('reactionCounts', { event_id: eventId });
                ['like', 'love', 'sad'].forEach(type => {
                    const countElement = document.getElementById(`${type}-count${suffix}-${eventId}`);
                    if (countElement) countElement.textContent = (counts && counts[type]) || 0;
                });
                const commentCountElement = document.getElementById(`comments-count${suffix}-${eventId}`);
                if (commentCountElement) commentCountElement.textContent = (counts && counts.comments) || 0;
            } catch (e) {
                console.error("Error in fetchEventCounts:", e);
            }
        }

        async function checkUserReaction(eventId, forDetails = false) {
            if (!currentUser) return;
            const suffix = forDetails ? '-details' : '';
            try {
                const result = await api('userReaction', { event_id: eventId });
                const userReactionType = (result && result.reaction_type) || null;

                const reactionTypes = ['like', 'love', 'sad'];
                reactionTypes.forEach(type => {
                    const iconElement = document.getElementById(`${type}-icon${suffix}-${eventId}`);
                    if (iconElement) {
                        iconElement.classList.remove('selected', 'text-blue-600', 'text-red-600', 'text-yellow-500');
                    }
                });

                if (userReactionType) {
                    const activeIconElement = document.getElementById(`${userReactionType}-icon${suffix}-${eventId}`);
                    if (activeIconElement) {
                        activeIconElement.classList.add('selected');
                        if (userReactionType === 'like') activeIconElement.classList.add('text-blue-600');
                        if (userReactionType === 'love') activeIconElement.classList.add('text-red-600');
                        if (userReactionType === 'sad') activeIconElement.classList.add('text-yellow-500');
                    }
                }
            } catch (error) {
                console.error(`Error checking user reaction for event ${eventId}:`, error.message);
            }
        }

        async function handleReaction(eventId, reactionType, fromDetails = false) {
            if (!currentUser) {
                showModalMessage('يجب تسجيل الدخول للتفاعل.', true); navigateTo('login').catch(err => console.warn("Navigation to login after reaction attempt failed:", err.message)); return;
            }
            try {
                await api('react', { event_id: eventId, reaction_type: reactionType });
                await fetchEventCounts(eventId, fromDetails);
                await checkUserReaction(eventId, fromDetails);
                await fetchEventCounts(eventId, !fromDetails);
                await checkUserReaction(eventId, !fromDetails);
            } catch (error) {
                showModalMessage(`خطأ في معالجة التفاعل: ${error.message}`, true);
                console.error("Reaction handling error:", error);
            }
        }

        function toggleQuickComment(eventId) {
            const container = document.getElementById(`quick-comment-container-${eventId}`);
            if (container) container.classList.toggle('hidden-section');
        }

        async function postQuickComment(eventId) {
            if (!currentUser) {
                showModalMessage('يجب تسجيل الدخول للتعليق.', true); navigateTo('login').catch(err => console.warn("Navigation to login after quick comment attempt failed:", err.message)); return;
            }
            const commentTextElement = document.getElementById(`quick-comment-text-${eventId}`);
            const commentText = commentTextElement.value;
            if (!commentText.trim()) { showModalMessage('لا يمكن إرسال تعليق فارغ.', true); return; }

            try {
                await api('addComment', { event_id: eventId, comment_text: commentText });
                showModalMessage('تم إضافة التعليق بنجاح!');
                commentTextElement.value = '';
                toggleQuickComment(eventId);
                await fetchEventCounts(eventId);
                await fetchEventCounts(eventId, true);
            } catch (error) {
                showModalMessage(`فشل إضافة التعليق: ${error.message}`, true);
                console.error("Quick comment error:", error);
            }
        }

        async function loadEvents() {
            if (!upcomingEventsList || !pastEventsList) {
                console.error("Event list containers not found in loadEvents.");
                throw new Error("Event list containers not found.");
            }
            upcomingEventsList.innerHTML = skeletonCard() + skeletonCard();
            pastEventsList.innerHTML = skeletonCard() + skeletonCard();

            const cached = getCachedData('events');
            if (Array.isArray(cached)) {
                renderEvents(cached);
                preloadSingle('events', 'events', {}, r => r.events);
                return;
            }

            try {
                const result = await api('events');
                const eventsData = result.events;

                if (!Array.isArray(eventsData)) {
                    console.error('LoadEvents: eventsData is not an array after fetch:', eventsData);
                    throw new Error('Invalid data format for events.');
                }

                _dataCache.events = eventsData;
                renderEvents(eventsData);
            } catch (e) {
                console.error('Overall error caught in loadEvents. Error:', e);
                if (upcomingEventsList && !upcomingEventsList.innerHTML.includes('text-red-500')) {
                    upcomingEventsList.innerHTML = '<p class="text-red-500 p-4 text-center col-span-full">فشل تحميل الفعاليات القادمة. <button onclick="loadEvents()" class="underline font-bold cursor-pointer">إعادة المحاولة</button></p>';
                }
                if (pastEventsList && !pastEventsList.innerHTML.includes('text-red-500')) {
                    pastEventsList.innerHTML = '<p class="text-red-500 p-4 text-center col-span-full">فشل تحميل الفعاليات السابقة. <button onclick="loadEvents()" class="underline font-bold cursor-pointer">إعادة المحاولة</button></p>';
                }
                showModalMessage(`فشل تحميل الفعاليات: ${e.message}`, true);
                throw e;
            }
        }

        function renderEvents(eventsData) {
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const upcoming = eventsData.filter(e => e.event_date >= today);
            const past = eventsData.filter(e => e.event_date < today);
            upcomingEventsList.innerHTML = upcoming.length ? upcoming.map(e => createEventCard(e, true)).join('') : '<p class="text-gray-600 p-4 text-center col-span-full">لا توجد فعاليات قادمة حالياً.</p>';
            pastEventsList.innerHTML = past.length ? past.map(e => createEventCard(e, false)).join('') : '<p class="text-gray-600 p-4 text-center col-span-full">لا توجد فعاليات سابقة.</p>';
            attachDynamicEventListeners();
        }

        async function loadEventDetails(eventData) {
            if (!eventDetailsContent || !eventDetailsMainImage || !eventDetailsGallery) {
                console.error("Event details display elements not found");
                if (eventDetailsContent) eventDetailsContent.innerHTML = '<p class="text-red-500 p-4 text-center">خطأ في عرض تفاصيل الفعالية (عناصر مفقودة).</p>';
                throw new Error("Event details display elements not found.");
            }

            eventDetailsContent.innerHTML = '';
            eventDetailsMainImage.src = 'https://placehold.co/800x400/cccccc/969696?text=Loading...';
            eventDetailsMainImage.loading = 'lazy';
            eventDetailsMainImage.alt = 'جاري تحميل الصورة الرئيسية...';
            eventDetailsGallery.innerHTML = '';

            eventDetailsContent.appendChild(eventDetailsMainImage);
            eventDetailsContent.appendChild(eventDetailsGallery);

            const detailsTextContainer = document.createElement('div');
            detailsTextContainer.id = "event-details-text-content";
            detailsTextContainer.innerHTML = skeletonDetails();
            eventDetailsContent.appendChild(detailsTextContainer);

            try {
                const breadcrumbTitle = document.getElementById('event-details-breadcrumb');
                if (breadcrumbTitle) breadcrumbTitle.textContent = eventData.title || 'تفاصيل الفعالية';

                const eventDateFormatted = parseLocalDate(eventData.event_date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                const currentImageUrls = Array.isArray(eventData.image_urls) ? eventData.image_urls : (eventData.image_urls ? [eventData.image_urls] : []);
                eventDetailsMainImage.src = eventData.main_image_url || (currentImageUrls.length > 0 ? currentImageUrls[0] : 'https://placehold.co/800x400/64748B/E0E7FF?text=Event+Image');
                eventDetailsMainImage.alt = eventData.title || 'صورة الفعالية';

                eventDetailsGallery.innerHTML = '';
                if (currentImageUrls.length > 0) {
                    currentImageUrls.forEach(url => {
                        const thumb = document.createElement('img');
                        thumb.src = url;
                        thumb.loading = 'lazy';
                        thumb.alt = 'صورة مصغرة للفعالية';
                        thumb.className = 'event-gallery-image';
                        if (url === eventDetailsMainImage.src) {
                            thumb.classList.add('active-gallery-thumb');
                        }
                        thumb.onclick = () => {
                            eventDetailsMainImage.src = url;
                            document.querySelectorAll('.event-gallery-image').forEach(t => t.classList.remove('active-gallery-thumb'));
                            thumb.classList.add('active-gallery-thumb');
                        };
                        eventDetailsGallery.appendChild(thumb);
                    });
                }

                const reactionTypes = [
                    { type: 'like', emoji: '👍', label: 'أعجبني' }, { type: 'love', emoji: '❤️', label: 'أحببته' },
                    { type: 'sad', emoji: '😢', label: 'أحزنني' }
                ];
                let reactionButtonsHTML = reactionTypes.map(rt => `
                    <button class="reaction-btn p-1 rounded-full hover:bg-gray-200 focus:outline-none" data-eventid="${eventData.id}" data-reactiontype="${rt.type}" aria-label="${rt.label}">
                        <span id="${rt.type}-icon-details-${eventData.id}" class="text-xl">${rt.emoji}</span>
                    </button>
                    <span id="${rt.type}-count-details-${eventData.id}" class="text-xs text-slate-500 mr-1">0</span>
                `).join('');

                let ownerControlsHTML = '';
                if (currentUser && currentUser.id === eventData.user_id) {
                    ownerControlsHTML = `
                        <div class="mt-4 flex gap-2">
                            <button class="edit-event-btn text-sm bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-4 rounded" data-eventid="${eventData.id}">تعديل الفعالية</button>
                            <button class="delete-event-btn text-sm bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded" data-eventid="${eventData.id}" data-imageurls="${escapeHtml(JSON.stringify(eventData.image_urls || []))}">حذف الفعالية</button>
                        </div>`;
                }

                detailsTextContainer.innerHTML = `
                    <h1 class="text-[#0e141b] tracking-light text-[32px] font-bold leading-tight mb-2">${escapeHtml(eventData.title)}</h1>
                    <p class="text-slate-500 text-sm mb-4">تاريخ النشر: ${(eventData.created_at ? new Date(eventData.created_at) : new Date()).toLocaleDateString('ar-EG')} | تاريخ الفعالية: ${eventDateFormatted}</p>
                    <p class="text-[#0e141b] text-base leading-relaxed whitespace-pre-wrap">${escapeHtml(eventData.description || 'لا يوجد وصف تفصيلي لهذه الفعالية.')}</p>
                     <div class="mt-6 pt-4 border-t border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-700 mb-2">التفاعلات:</h3>
                        <div class="flex items-center gap-2 text-slate-500 text-xs"> ${reactionButtonsHTML} </div>
                    </div>
                    ${ownerControlsHTML}`;

                await fetchEventCounts(eventData.id, true);
                await checkUserReaction(eventData.id, true);
                attachDynamicEventListenersForDetails(detailsTextContainer);
                await loadEventComments(eventData.id);
            } catch (error) {
                console.error('Overall error in loadEventDetails, re-throwing:', error);
                detailsTextContainer.innerHTML = '<p class="text-red-500 p-4 text-center">فشل تحميل تفاصيل الفعالية.</p>';
                if (!error.message.includes("فشل تحميل تفاصيل الفعالية")) {
                    showModalMessage(`فشل تحميل تفاصيل الفعالية: ${error.message}`, true);
                }
                throw error;
            }
        }

        async function loadEventComments(eventId) {
            if (!eventCommentsList) {
                console.error("Event comments list container not found");
                throw new Error("Event comments list container not found.");
            }
            eventCommentsList.innerHTML = skeletonComment().repeat(3);
            try {
                const result = await api('comments', { event_id: eventId });
                const commentsData = result.comments || [];

                if (commentsData.length > 0) {
                    eventCommentsList.innerHTML = commentsData.map(comment => {
                        const commenterName = (comment.commenter_profile && comment.commenter_profile.full_name) || comment.commenter_name || 'مستخدم غير معروف';
                        const commenterAvatarUrl = (comment.commenter_profile && comment.commenter_profile.avatar_url) || 'https://placehold.co/40x40/E0E0E0/B0B0B0?text=?';
                        const commentDate = new Date(comment.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

                        let commentOwnerControls = '';
                        if (currentUser && currentUser.id === comment.user_id) {
                            commentOwnerControls = `
                                <div class="comment-actions text-xs mt-1">
                                    <button class="edit-comment-btn text-blue-500 hover:text-blue-700" data-commentid="${comment.id}" data-eventid="${eventId}">تعديل</button>
                                    <button class="delete-comment-btn text-red-500 hover:text-red-700" data-commentid="${comment.id}" data-eventid="${eventId}">حذف</button>
                                </div>`;
                        }

                        return `
                            <div class="flex items-start gap-3 p-3 border-b border-gray-200 last:border-b-0" id="comment-item-${comment.id}">
                                <img src="${commenterAvatarUrl}" loading="lazy" alt="${escapeHtml(commenterName)}" class="size-10 rounded-full shrink-0 object-cover">
                                <div class="flex-1">
                                    <div class="flex items-baseline gap-2">
                                        <p class="text-[#0e141b] text-sm font-bold">${escapeHtml(commenterName)}</p>
                                        <p class="text-[#4e7097] text-xs">${commentDate}</p>
                                    </div>
                                    <p class="comment-text-display text-[#0e141b] text-sm mt-1 whitespace-pre-wrap">${escapeHtml(comment.comment_text)}</p>
                                    <div class="edit-comment-area hidden-section mt-1">
                                        <textarea class="form-input w-full p-2 border rounded-md text-sm" rows="2">${escapeHtml(comment.comment_text)}</textarea>
                                        <div class="mt-1 flex gap-2">
                                            <button class="save-edit-comment-btn text-xs bg-green-500 text-white py-1 px-2 rounded hover:bg-green-600" data-commentid="${comment.id}" data-eventid="${eventId}">حفظ</button>
                                            <button class="cancel-edit-comment-btn text-xs bg-gray-300 text-gray-700 py-1 px-2 rounded hover:bg-gray-400" data-commentid="${comment.id}">إلغاء</button>
                                        </div>
                                    </div>
                                    ${commentOwnerControls}
                                </div>
                            </div>`;
                    }).join('');
                    attachCommentActionListeners(eventCommentsList);
                } else {
                    eventCommentsList.innerHTML = '<p class="text-gray-500 p-4 text-center">لا توجد تعليقات حتى الآن. كن أول من يعلق!</p>';
                }
            } catch (e) {
                console.error('Overall error caught in loadEventComments, re-throwing:', e);
                if (!e.message.includes("فشل تحميل التعليقات")) {
                    showModalMessage(`خطأ في تحميل التعليقات: ${e.message}`, true);
                }
                if (!eventCommentsList.innerHTML.includes('text-red-500')) {
                    eventCommentsList.innerHTML = '<p class="text-red-500 p-4 text-center">فشل تحميل التعليقات.</p>';
                }
                throw e;
            }
        }

        function handleEditCommentClick(e) {
            const commentId = e.currentTarget.dataset.commentid;
            const commentItem = document.getElementById(`comment-item-${commentId}`);
            if (commentItem) {
                commentItem.querySelector('.comment-text-display').classList.add('hidden-section');
                commentItem.querySelector('.comment-actions').classList.add('hidden-section');
                commentItem.querySelector('.edit-comment-area').classList.remove('hidden-section');
            }
        }
        function handleCancelEditCommentClick(e) {
            const commentId = e.currentTarget.dataset.commentid;
            const commentItem = document.getElementById(`comment-item-${commentId}`);
            if (commentItem) {
                commentItem.querySelector('.comment-text-display').classList.remove('hidden-section');
                commentItem.querySelector('.comment-actions').classList.remove('hidden-section');
                commentItem.querySelector('.edit-comment-area').classList.add('hidden-section');
            }
        }
        async function handleSaveEditCommentClick(e) {
            const commentId = e.currentTarget.dataset.commentid;
            const eventId = e.currentTarget.dataset.eventid;
            const commentItem = document.getElementById(`comment-item-${commentId}`);
            if (!commentItem || !currentUser) return;
            const newText = commentItem.querySelector('.edit-comment-area textarea').value;
            if (!newText.trim()) { showModalMessage('لا يمكن حفظ تعليق فارغ.', true); return; }

            try {
                await api('updateComment', { id: commentId, comment_text: newText });
                showModalMessage('تم تعديل التعليق بنجاح.');
                await loadEventComments(eventId);
            } catch (error) {
                showModalMessage(`فشل تعديل التعليق: ${error.message}`, true);
                console.error("Save edit comment error:", error);
            }
        }
        async function handleDeleteCommentClick(e) {
            const commentId = e.currentTarget.dataset.commentid;
            const eventId = e.currentTarget.dataset.eventid;
            if (!currentUser) return;
            showConfirmModal('هل أنت متأكد أنك تريد حذف هذا التعليق؟', async () => {
                try {
                    await api('deleteComment', { id: commentId });
                    showModalMessage('تم حذف التعليق بنجاح.');
                    await loadEventComments(eventId);
                    await fetchEventCounts(eventId, true);
                    await fetchEventCounts(eventId, false);
                } catch (error) {
                    showModalMessage(`فشل حذف التعليق: ${error.message}`, true);
                    console.error("Delete comment error:", error);
                }
            });
        }

        addCommentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser) { showModalMessage('يجب تسجيل الدخول للتعليق.', true); navigateTo('login').catch(err => console.warn("Navigation to login after add comment attempt failed:", err.message)); return; }
            if (!currentEventId) { showModalMessage('لم يتم تحديد فعالية للتعليق عليها.', true); return; }
            const commentText = document.getElementById('comment-text').value;
            if (!commentText.trim()) { showModalMessage('لا يمكن إرسال تعليق فارغ.', true); return; }

            try {
                await api('addComment', { event_id: currentEventId, comment_text: commentText });
                showModalMessage('تم إضافة التعليق بنجاح!');
                document.getElementById('comment-text').value = '';
                await loadEventComments(currentEventId);
                await fetchEventCounts(currentEventId, true);
                await fetchEventCounts(currentEventId, false);
            } catch (error) {
                showModalMessage(`فشل إضافة التعليق: ${error.message}`, true);
                console.error("Add comment error:", error);
            }
        });

        function handleEditEventClick(e) {
            handleEditEvent(e.currentTarget.dataset.eventid);
        }
        function handleDeleteEventClick(e) {
            handleDeleteEvent(e.currentTarget.dataset.eventid);
        }
        function handleReactionEvent(e) { handleReaction(e.currentTarget.dataset.eventid, e.currentTarget.dataset.reactiontype, false); }
        function handleReactionEventFromDetails(e) { handleReaction(e.currentTarget.dataset.eventid, e.currentTarget.dataset.reactiontype, true); }
        function handleToggleCommentEvent(e) { toggleQuickComment(e.currentTarget.dataset.eventid); }
        function handlePostQuickCommentEvent(e) { postQuickComment(e.currentTarget.dataset.eventid); }

        function attachDynamicEventListeners() {
            document.querySelectorAll('.reaction-btn').forEach(button => {
                button.removeEventListener('click', handleReactionEvent);
                button.addEventListener('click', handleReactionEvent);
            });
            document.querySelectorAll('.toggle-comment-btn').forEach(button => {
                button.removeEventListener('click', handleToggleCommentEvent);
                button.addEventListener('click', handleToggleCommentEvent);
            });
            document.querySelectorAll('.post-quick-comment-btn').forEach(button => {
                button.removeEventListener('click', handlePostQuickCommentEvent);
                button.addEventListener('click', handlePostQuickCommentEvent);
            });
            document.querySelectorAll('.edit-event-btn').forEach(button => {
                button.removeEventListener('click', handleEditEventClick);
                button.addEventListener('click', handleEditEventClick);
            });
            document.querySelectorAll('.delete-event-btn').forEach(button => {
                button.removeEventListener('click', handleDeleteEventClick);
                button.addEventListener('click', handleDeleteEventClick);
            });
            document.querySelectorAll('.event-details-link').forEach(link => {
                link.removeEventListener('click', handleEventDetailsLinkClick);
                link.addEventListener('click', handleEventDetailsLinkClick);
            });
        }

        async function handleEventDetailsLinkClick(e) {
            e.preventDefault();
            const eventId = e.currentTarget.dataset.eventid;
            try {
                const result = await api('event', { id: eventId });
                if (result && result.id) {
                    navigateTo('event-details', result).catch(err => console.warn("Navigation to event-details failed:", err.message));
                } else {
                    showModalMessage('لم يتم العثور على الفعالية.', true);
                }
            } catch (error) {
                showModalMessage(`فشل تحميل تفاصيل الفعالية: ${error.message}`, true);
                console.error("Event details link click error:", error);
            }
        }

        function attachDynamicEventListenersForDetails(containerElement) {
            if (!containerElement || typeof containerElement.querySelectorAll !== 'function') {
                console.warn("Invalid containerElement for attachDynamicEventListenersForDetails:", containerElement);
                return;
            }
            containerElement.querySelectorAll('.reaction-btn').forEach(button => {
                button.removeEventListener('click', handleReactionEventFromDetails);
                button.addEventListener('click', handleReactionEventFromDetails);
            });
            containerElement.querySelectorAll('.edit-event-btn').forEach(button => {
                button.removeEventListener('click', handleEditEventClick);
                button.addEventListener('click', handleEditEventClick);
            });
            containerElement.querySelectorAll('.delete-event-btn').forEach(button => {
                button.removeEventListener('click', handleDeleteEventClick);
                button.addEventListener('click', handleDeleteEventClick);
            });
        }
        function attachCommentActionListeners(containerElement) {
            containerElement.querySelectorAll('.edit-comment-btn').forEach(btn => {
                btn.removeEventListener('click', handleEditCommentClick); btn.addEventListener('click', handleEditCommentClick);
            });
            containerElement.querySelectorAll('.delete-comment-btn').forEach(btn => {
                btn.removeEventListener('click', handleDeleteCommentClick); btn.addEventListener('click', handleDeleteCommentClick);
            });
            containerElement.querySelectorAll('.save-edit-comment-btn').forEach(btn => {
                btn.removeEventListener('click', handleSaveEditCommentClick); btn.addEventListener('click', handleSaveEditCommentClick);
            });
            containerElement.querySelectorAll('.cancel-edit-comment-btn').forEach(btn => {
                btn.removeEventListener('click', handleCancelEditCommentClick); btn.addEventListener('click', handleCancelEditCommentClick);
            });
        }

        async function handleEditEvent(eventId) {
            if (!currentUser) { showModalMessage('يجب تسجيل الدخول لتعديل الفعالية.', true); navigateTo('login').catch(err => console.warn("Navigation to login for edit event failed:", err.message)); return; }
            editingEventId = eventId;
            eventImageFilesToUpload = [];
            imageUrlsPendingDeletion = [];

            try {
                const eventToEdit = await api('event', { id: eventId });
                if (!eventToEdit || !eventToEdit.id) throw new Error("Event not found.");
                if (eventToEdit.user_id !== currentUser.id) throw new Error("Event not found or not authorized to edit.");

                document.getElementById('event-form-title').textContent = 'تعديل الفعالية';
                document.getElementById('submit-event-form-btn').textContent = 'تحديث الفعالية';
                document.getElementById('event-title').value = eventToEdit.title;
                document.getElementById('event-description').value = eventToEdit.description;
                document.getElementById('event-date').value = eventToEdit.event_date;

                if (Array.isArray(eventToEdit.image_urls)) {
                    existingEventImageUrls = eventToEdit.image_urls;
                } else if (eventToEdit.image_urls === null || typeof eventToEdit.image_urls === 'undefined') {
                    existingEventImageUrls = [];
                } else {
                    existingEventImageUrls = [];
                }

                selectedMainImagePreviewUrl = eventToEdit.main_image_url || (existingEventImageUrls.length > 0 ? existingEventImageUrls[0] : null);

                eventImageFilesInput.value = '';
                renderImagePreviews();

                createEventFormContainer.classList.remove('hidden-section');
                createEventBtnGeneral.classList.add('hidden-section');
                if (!document.getElementById('events').classList.contains('hidden-section')) {
                    createEventFormContainer.scrollIntoView({ behavior: 'smooth' });
                } else {
                    navigateTo('events').catch(err => console.warn("Navigation to events for edit event failed:", err.message));
                    setTimeout(() => createEventFormContainer.scrollIntoView({ behavior: 'smooth' }), 100);
                }
            } catch (error) {
                showModalMessage(`فشل تحميل بيانات الفعالية للتعديل: ${error.message}`, true);
                editingEventId = null;
                console.error("Edit event load error:", error);
            }
        }

        async function handleDeleteEvent(eventId) {
            if (!currentUser) { showModalMessage('يجب تسجيل الدخول لحذف الفعالية.', true); navigateTo('login').catch(err => console.warn("Navigation to login for delete event failed:", err.message)); return; }

            showConfirmModal('هل أنت متأكد أنك تريد حذف هذه الفعالية وجميع صورها؟ هذا الإجراء لا يمكن التراجع عنه.', async () => {
                try {
                    await api('deleteEvent', { id: eventId });
                    showModalMessage('تم حذف الفعالية بنجاح.');
                    await loadEvents();
                    const eventDetailsSection = document.getElementById('event-details');
                    if (eventDetailsSection && !eventDetailsSection.classList.contains('hidden-section') && currentEventId === eventId) {
                        navigateTo('events').catch(err => console.warn("Navigation to events after delete failed:", err.message));
                    }
                } catch (error) {
                    showModalMessage(`فشل حذف الفعالية: ${error.message}`, true);
                    console.error("Detailed error during event deletion:", error);
                }
            });
        }

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
            await restoreSession();
            await updateAuthState(currentUser);
            await initialNavigation();
            initialAuthProcessed = true;
            preloadAllData();
            console.log("App initialized.");
        }

        // --- Background data cache & preloading (faster navigation) ---
        const _dataCache = { events: null, team: null, stats: null, users: null };
        const _dataCacheLoading = { events: false, team: false, stats: false, users: false };

        function getCachedData(key) {
            return _dataCache[key] || null;
        }

        function clearDataCache() {
            Object.keys(_dataCache).forEach(k => { _dataCache[k] = null; });
        }

        async function preloadSingle(key, action, payload, extract) {
            if (_dataCacheLoading[key]) return;
            _dataCacheLoading[key] = true;
            try {
                const result = await api(action, payload, true);
                const data = extract ? extract(result) : result;
                _dataCache[key] = data;
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
            return { data: _dataCache[key], fromCache: false };
        }

        function initializeApp() {
            applyTheme();
            setupAdminEventListeners();
            initializeAppAsync();
        }

        initializeApp();

        
