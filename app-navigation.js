        // --- Navigation (MPA: separate HTML pages) ---
        const PAGE_ROUTES = {
            'home': 'index.html',
            'contact': 'index.html',
            'login': 'index.html',
            'signup': 'index.html',
            'forgot-password-section': 'index.html',
            'events': 'events.html',
            'event-details': 'events.html',
            'profiles': 'team.html',
            'my-profile-section': 'profile.html',
            'admin': 'admin.html'
        };

        function currentPageName() {
            const path = window.location.pathname.split('/').pop() || 'index.html';
            return path.toLowerCase();
        }

        function saveNavState(targetId, eventData) {
            if (!targetId || targetId === 'login' || targetId === 'signup' || targetId === 'forgot-password-section') return;
            try {
                const state = { view: targetId };
                if (targetId === 'event-details' && eventData && eventData.id) {
                    state.eventId = String(eventData.id);
                }
                sessionStorage.setItem('flash_nav_state', JSON.stringify(state));
            } catch (e) { }
        }

        window.addEventListener('pagehide', () => {
            try { sessionStorage.setItem('flash_scroll_y', String(window.scrollY || 0)); } catch (e) { }
        });

        function showSection(targetId) {
            const section = document.getElementById(targetId);
            if (!section) return false;
            contentSections.forEach(s => s.classList.add('hidden-section'));
            section.classList.remove('hidden-section');
            navLinks.forEach(link => {
                link.classList.remove('nav-active');
                if (link.dataset.target === targetId) link.classList.add('nav-active');
            });
            window.scrollTo(0, 0);
            return true;
        }

        function syncNavActiveState() {
            const pageToTarget = {
                'index.html': 'home',
                'events.html': 'events',
                'team.html': 'profiles',
                'profile.html': 'my-profile-section',
                'admin.html': 'admin'
            };
            const target = pageToTarget[currentPageName()] || 'home';
            navLinks.forEach(link => {
                link.classList.remove('nav-active');
                if (link.dataset.target === target) link.classList.add('nav-active');
            });
        }

        async function navigateTo(targetId, eventData = null) {
            if (isNavigating) {
                console.warn(`Navigation to ${targetId} skipped: another navigation is already in progress.`);
                return Promise.resolve();
            }
            isNavigating = true;
            const navAttemptId = Date.now();
            console.log(`[Nav ${navAttemptId}] Navigating to: ${targetId}`, eventData);

            try {
                if (targetId === 'admin' && (!currentUser || currentUser.role !== 'admin')) {
                    console.log(`[Nav ${navAttemptId}] Access to admin denied, user is not admin.`);
                    showModalMessage('صلاحية المشرف مطلوبة للوصول إلى لوحة التحكم.', true);
                    window.location.assign('index.html#home');
                    return Promise.resolve();
                }
                if (targetId === 'my-profile-section' && !currentUser) {
                    console.log(`[Nav ${navAttemptId}] Access to my-profile-section denied, user not logged in.`);
                    showModalMessage('يجب تسجيل الدخول للوصول إلى ملفك الشخصي.', true);
                    window.location.assign('index.html#login');
                    return Promise.resolve();
                }

                saveNavState(targetId, eventData);

                if (targetId === 'event-details' && eventData && eventData.id) {
                    try { sessionStorage.setItem('flash_event_payload', JSON.stringify(eventData)); } catch (e) { }
                }

                const targetPage = PAGE_ROUTES[targetId] || 'index.html';
                const onTargetPage = currentPageName() === targetPage;

                if (onTargetPage && document.getElementById(targetId)) {
                    showSection(targetId);
                    if (targetId === 'event-details') {
                        try {
                            const payload = sessionStorage.getItem('flash_event_payload');
                            if (payload) {
                                const ev = JSON.parse(payload);
                                currentEventId = ev.id;
                                await loadEventDetails(ev);
                            }
                        } catch (e) { }
                    }
                    if (targetId === 'events') {
                        try { sessionStorage.removeItem('flash_event_payload'); } catch (e) { }
                    }
                    return Promise.resolve();
                }

                try { sessionStorage.removeItem('flash_scroll_y'); } catch (e) { }
                const url = targetPage + (targetId === 'event-details' ? '' : '#' + targetId);
                console.log(`[Nav ${navAttemptId}] Redirecting to: ${url}`);
                window.location.assign(url);
                return Promise.resolve();
            } finally {
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
        const signupRoleSelect = document.getElementById('signup-role');
        const signupCodeField = document.getElementById('signup-code-field');
        const signupCodeInput = document.getElementById('signup-code');
        const signupRoleHint = document.getElementById('signup-role-hint');
        const SIGNUP_ACCESS_CODE = 'O2M';

        if (signupRoleSelect && signupCodeField) {
            const roleMeta = {
                guest: { needsCode: false, hint: 'حساب زائر يشاهد المحتوى فقط ولا يظهر في صفحة الفريق.' },
                team: { needsCode: true, hint: 'عضو فريق: يمكنه إنشاء فعاليات ويظهر في صفحة الفريق. أدخل رمز الانضمام.' },
                admin: { needsCode: true, hint: 'مشرف: صلاحية كاملة على لوحة التحكم. أدخل رمز الانضمام.' }
            };
            const updateSignupRoleUI = () => {
                const role = signupRoleSelect.value || 'guest';
                const meta = roleMeta[role] || roleMeta.guest;
                signupCodeField.classList.toggle('hidden-section', !meta.needsCode);
                if (signupRoleHint) signupRoleHint.textContent = meta.hint;
                if (!meta.needsCode) signupCodeInput.value = '';
            };
            signupRoleSelect.addEventListener('change', updateSignupRoleUI);
            updateSignupRoleUI();
        }

        // --- Authentication Logic ---
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;

                try {
                    const result = await api('login', { email, password });
                    saveSession(result.token, result.user);
                    writeMeCache(result.user);
                    if (result.is_first_login) {
                        showModalMessage('مرحباً بك في فريق Flash! هذه أول مرة تسجل فيها الدخول — استمتع باستكشاف الفعاليات والفريق.', true);
                    } else {
                        showModalMessage('تم تسجيل الدخول بنجاح!');
                    }
                    await updateAuthState(currentUser);
                    navigateTo('home').catch(err => console.warn("Navigation to home after login failed:", err.message));
                } catch (error) {
                    showModalMessage(`خطأ في تسجيل الدخول: ${error.message}`, true);
                    console.error("Login error:", error);
                }
            });
        }

        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('signup-email').value;
                const password = document.getElementById('signup-password').value;
                const passwordConfirm = document.getElementById('signup-password-confirm').value;
                const fullName = document.getElementById('signup-fullname').value;
                const academicId = document.getElementById('signup-academic-id').value;
                const role = signupRoleSelect ? signupRoleSelect.value : 'guest';
                const accessCode = signupCodeInput ? signupCodeInput.value : '';

                if (password !== passwordConfirm) {
                    showModalMessage('كلمتا المرور غير متطابقتين.', true);
                    return;
                }
                const strengthIssue = passwordStrengthIssue(password);
                if (strengthIssue) {
                    showModalMessage(strengthIssue, true);
                    return;
                }
                if (role !== 'guest' && accessCode.trim() !== SIGNUP_ACCESS_CODE) {
                    showModalMessage('رمز الانضمام غير صحيح. تحقق من الرمز وأعد المحاولة.', true);
                    if (signupCodeInput) signupCodeInput.focus();
                    return;
                }

                try {
                    const result = await api('signup', {
                        email, password,
                        full_name: fullName,
                        academic_id: academicId || null,
                        role,
                        access_code: accessCode.trim()
                    });
                    saveSession(result.token, result.user);
                    writeMeCache(result.user);
                    showModalMessage('تم إنشاء حسابك بنجاح!');
                    await updateAuthState(currentUser);
                    navigateTo('home').catch(err => console.warn("Navigation to home after signup failed:", err.message));
                } catch (error) {
                    showModalMessage(`خطأ في إنشاء الحساب: ${error.message}`, true);
                    console.error("Signup error:", error);
                }
            });
        }

        function passwordStrengthIssue(password) {
            if (!password) return 'كلمة المرور مطلوبة.';
            if (password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.';
            if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'كلمة المرور يجب أن تحتوي على حروف وأرقام معاً.';
            return null;
        }

        if (navLogoutBtn) {
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
                    clearMeCache();
                    showModalMessage('تم تسجيل الخروج بنجاح.');
                    await updateAuthState(currentUser);
                    navigateTo('home').catch(err => console.warn("Navigation to home after logout failed:", err.message));
                } catch (error) {
                    showModalMessage(`خطأ في تسجيل الخروج: ${error.message}`, true);
                    console.error("Logout error:", error);
                }
            });
        }

        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('forgot-password-email').value;

                try {
                    const result = await api('forgotPassword', { email });
                    if (result.mail_sent === false) {
                        showModalMessage('تعذر إرسال رابط إعادة التعيين الآن. تحقق من البريد وحاول مجدداً، أو تواصل مع المشرف.', true);
                    } else {
                        showModalMessage('إذا كان البريد الإلكتروني موجودًا، فسيتم إرسال رابط إعادة تعيين كلمة المرور إليه.');
                    }
                    navigateTo('login').catch(err => console.warn("Navigation to login after forgot password error was handled:", err.message));
                } catch (error) {
                    showModalMessage(`خطأ في إرسال رابط إعادة التعيين: ${error.message}`, true);
                    console.error('Forgot password error:', error.message);
                }
            });
        }
