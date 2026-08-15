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
                if (commenterAvatar) commenterAvatar.src = user.avatar_url || 'https://placehold.co/40x40/E0E0E0/B0B0B0?text=User';

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
                if (commenterAvatar) commenterAvatar.src = 'https://placehold.co/40x40/E0E0E0/B0B0B0?text=User';
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

        // -------------------------------------------------------------------
        // Admin modal (generic)
        // -------------------------------------------------------------------

        const _adminModal = document.getElementById('adminModal');
        const _adminModalTitle = document.getElementById('adminModalTitle');
        const _adminModalBody = document.getElementById('adminModalBody');
        const _adminModalCloseBtn = document.getElementById('adminModalCloseBtn');

        function openAdminModal(title, bodyHTML) {
            if (_adminModalTitle) _adminModalTitle.textContent = title;
            if (_adminModalBody) _adminModalBody.innerHTML = bodyHTML;
            if (_adminModal) _adminModal.classList.remove('hidden-section');
        }

        function closeAdminModal() {
            if (_adminModal) _adminModal.classList.add('hidden-section');
            if (_adminModalBody) _adminModalBody.innerHTML = '';
            (_adminEventNewFiles || []).forEach(f => {
                if (f._previewUrl && String(f._previewUrl).indexOf('blob:') === 0) URL.revokeObjectURL(f._previewUrl);
            });
            _adminEventNewFiles = [];
            _adminEventAttachments = [];
            _adminEventNewAttachmentFiles = [];
            _adminEventRemovedAttachmentIds = [];
        }

        if (_adminModalCloseBtn) {
            _adminModalCloseBtn.addEventListener('click', closeAdminModal);
        }
        if (_adminModal) {
            _adminModal.addEventListener('click', (e) => {
                if (e.target === _adminModal) closeAdminModal();
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (_adminModal && !_adminModal.classList.contains('hidden-section')) closeAdminModal();
        });

        // -------------------------------------------------------------------
        // Loading the admin panel
        // -------------------------------------------------------------------

        async function loadAdminPanel() {
            if (!isCurrentUserAdmin()) {
                console.error('Admin panel access denied for user:', currentUser?.role);
                throw new Error('صلاحية المشرف مطلوبة.');
            }
            const statsContainer = document.getElementById('admin-stats');
            const usersContainer = document.getElementById('admin-users-list');
            const emptyState = document.getElementById('admin-empty-state');
            if (statsContainer) statsContainer.innerHTML = skeletonStatsCard().repeat(5);
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
            stats = { users: 0, team: 0, events: 0, comments: 0, reactions: 0 };
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
            const cards = [
                { label: 'المستخدمون', value: stats.users, icon: '👥', bg: 'bg-blue-50 dark:bg-blue-900/30' },
                { label: 'أعضاء الفريق', value: stats.team, icon: '🛠️', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
                { label: 'الفعاليات', value: stats.events, icon: '📅', bg: 'bg-violet-50 dark:bg-violet-900/30' },
                { label: 'التعليقات', value: stats.comments, icon: '💬', bg: 'bg-amber-50 dark:bg-amber-900/30' },
                { label: 'التفاعلات', value: stats.reactions, icon: '❤️', bg: 'bg-rose-50 dark:bg-rose-900/30' }
            ];
            statsContainer.innerHTML = cards.map(c =>
                '<div class="bg-white dark:bg-gray-800 rounded-xl border border-[#d4dbe2] dark:border-gray-700 p-4 flex items-center gap-3">' +
                '<div class="admin-stat-icon ' + c.bg + '">' + c.icon + '</div>' +
                '<div class="min-w-0">' +
                '<div class="text-xl sm:text-2xl font-bold text-[#101418] dark:text-gray-100 leading-tight">' + c.value + '</div>' +
                '<div class="text-xs text-[#5c718a] truncate">' + c.label + '</div>' +
                '</div>' +
                '</div>'
            ).join('');
        }

        let _adminUsersCache = [];
        let _adminTeamCache = [];
        let _adminEventsCache = [];

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

        // -------------------------------------------------------------------
        // Users tab
        // -------------------------------------------------------------------

        function renderAdminUsersList(users) {
            const usersContainer = document.getElementById('admin-users-list');
            const emptyState = document.getElementById('admin-empty-state');
            const countEl = document.getElementById('admin-users-count');
            if (!usersContainer) return;
            _adminUsersCache = users;
            if (countEl) countEl.textContent = users.length + ' مستخدم';
            if (!users.length) {
                usersContainer.innerHTML = '';
                if (emptyState) emptyState.classList.remove('hidden-section');
                return;
            }
            if (emptyState) emptyState.classList.add('hidden-section');
            const roleLabels = { user: 'عضو', full_access_user: 'عضو كامل', admin: 'مشرف' };
            const roleBadgeColors = { user: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200', full_access_user: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', admin: 'bg-[#1978e5] text-white' };
            usersContainer.innerHTML = users.map(u => {
                const roleLabel = roleLabels[u.role] || u.role || 'عضو';
                const roleColor = roleBadgeColors[u.role] || roleBadgeColors.user;
                const canEditRole = u.role !== 'admin' && u.id !== currentUser?.id;
                const isTeamMember = String(u.show_in_team) !== '0';
                return '<div class="flex flex-wrap items-center gap-3 p-4" data-user-id="' + escapeHtml(u.id) + '">' +
                    '<img src="' + escapeHtml(u.avatar_url || 'https://placehold.co/40x40/E0E0E0/B0B0B0?text=U') + '" loading="lazy" data-placeholder="https://placehold.co/40x40/E0E0E0/B0B0B0?text=U" alt="' + escapeHtml(u.full_name || u.email || 'مستخدم') + '" class="w-10 h-10 rounded-full object-cover">' +
                    '<div class="flex-1 min-w-[160px]">' +
                    '<div class="text-sm font-medium text-[#101418] dark:text-gray-100">' + escapeHtml(u.full_name || '—') +
                    ' <span class="text-[10px] rounded-full px-2 py-0.5 ' + roleColor + '">' + escapeHtml(roleLabel) + '</span>' +
                    '</div>' +
                    '<div class="text-xs text-[#5c718a] truncate">' + escapeHtml(u.user_name || '') + (u.user_name && u.email ? ' · ' : '') + escapeHtml(u.email || '') + '</div>' +
                    '</div>' +
                    '<div class="flex flex-wrap items-center gap-2">' +
                    '<label class="flex items-center gap-1 text-xs text-[#5c718a] cursor-pointer" title="عرض في صفحة الفريق">' +
                    '<input type="checkbox" data-action="admin-toggle-team" data-target-user="' + escapeHtml(u.id) + '"' + (isTeamMember ? ' checked' : '') + ' class="w-4 h-4 accent-[#1978e5]">' +
                    'فريق</label>' +
                    '<button data-action="admin-edit-user" data-target-user="' + escapeHtml(u.id) + '" class="flex items-center justify-center rounded-lg h-9 px-3 bg-gray-200 dark:bg-gray-700 text-[#101418] dark:text-gray-100 text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600" title="تعديل الملف">تعديل</button>' +
                    '<select data-action="admin-role" data-target-user="' + escapeHtml(u.id) + '" class="form-input h-9 rounded-lg text-xs px-2 border border-[#d4dbe2] dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-[#101418] dark:text-gray-100"' + (canEditRole ? '' : ' disabled') + '>' +
                    '<option value="user"' + (u.role === 'user' ? ' selected' : '') + '>عضو</option>' +
                    '<option value="full_access_user"' + (u.role === 'full_access_user' ? ' selected' : '') + '>عضو كامل</option>' +
                    '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>مشرف</option>' +
                    '</select>' +
                    '<button data-action="admin-delete-user" data-target-user="' + escapeHtml(u.id) + '" class="flex items-center justify-center rounded-lg h-9 px-3 bg-red-500 text-slate-50 text-xs font-bold hover:bg-red-600" title="حذف نهائي" ' + (canEditRole ? '' : ' style="display:none"') + '>حذف</button>' +
                    '</div>' +
                    '</div>';
            }).join('');
        }

        // -------------------------------------------------------------------
        // Users: edit profile modal
        // -------------------------------------------------------------------

        function openAdminUserEditModal(userId, user) {
            user = user || { full_name: '', user_name: '', academic_id: '', avatar_url: '', member_title: '', member_order: '', linkedin: '', facebook: '', phone: '' };
            const body =
                '<input type="hidden" id="admin-user-edit-id" value="' + escapeHtml(userId) + '">' +
                '<div class="flex items-center gap-3 mb-3">' +
                '<img id="admin-user-edit-photo-preview" src="' + escapeHtml(user.avatar_url || 'https://placehold.co/64x64/E0E0E0/B0B0B0?text=U') + '" alt="صورة العضو" class="w-16 h-16 rounded-full object-cover border border-[#d4dbe2]" data-placeholder="https://placehold.co/64x64/E0E0E0/B0B0B0?text=U">' +
                '<div class="flex-1">' +
                '<input type="file" id="admin-user-edit-photo" accept="image/*" data-photo-preview="admin-user-edit-photo-preview" class="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#1978e5] hover:file:bg-blue-100">' +
                '<p class="text-xs text-[#5c718a] mt-1">ارفع صورة جديدة من جهازك أو اكتب رابطاً في الحقل.</p>' +
                '</div>' +
                '</div>' +
                '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">' +
                modalInput('admin-user-edit-name', 'الاسم الكامل', user.full_name) +
                modalInput('admin-user-edit-username', 'اسم المستخدم', user.user_name) +
                modalInput('admin-user-edit-academic', 'الرقم الأكاديمي', user.academic_id) +
                modalInput('admin-user-edit-avatar', 'رابط الصورة الرمزية', user.avatar_url) +
                modalInput('admin-user-edit-member-title', 'المسمى في الفريق', user.member_title) +
                modalInput('admin-user-edit-member-order', 'ترتيب العرض (1 الأول)', user.member_order, 'number') +
                modalInput('admin-user-edit-linkedin', 'رابط LinkedIn', user.linkedin) +
                modalInput('admin-user-edit-facebook', 'رابط Facebook', user.facebook) +
                '<div class="sm:col-span-2">' + modalInput('admin-user-edit-phone', 'رقم الهاتف (واتساب)', user.phone) + '</div>' +
                '</div>' +
                modalActions('admin-user-edit-save', 'admin-user-edit-cancel', 'حفظ', 'إلغاء');
            openAdminModal('تعديل ملف العضو', body);
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
                closeAdminModal();
                await loadAdminPanel();
            } catch (err) {
                showModalMessage('فشل تحديث الملف: ' + err.message, true);
            }
        }

        // -------------------------------------------------------------------
        // Team tab
        // -------------------------------------------------------------------

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
                    '<img src="' + escapeHtml(m.image_url || 'https://placehold.co/40x40/E0E0E0/B0B0B0?text=' + encodeURIComponent(m.initials || '؟')) + '" loading="lazy" data-placeholder="https://placehold.co/40x40/E0E0E0/B0B0B0?text=؟" alt="' + escapeHtml(m.name || 'عضو') + '" class="w-10 h-10 rounded-full object-cover">' +
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

        // -------------------------------------------------------------------
        // Team: add member with account (modal)
        // -------------------------------------------------------------------

        function openAdminUserMemberModal(member) {
            member = member || {};
            const isEdit = !!member.id;
            const accountFields = isEdit ? '' :
                '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">' +
                modalInput('admin-user-member-email', 'البريد الإلكتروني (تسجيل الدخول) *', '', 'email') +
                modalInput('admin-user-member-password', 'كلمة مرور مؤقتة (8 أحرف على الأقل) *', '', 'password') +
                '</div>';
            const body =
                '<input type="hidden" id="admin-user-member-edit-id" value="' + escapeHtml(isEdit ? String(member.id).replace(/^user_/, '') : '') + '">' +
                '<div class="flex items-center gap-3 mb-3">' +
                '<img id="admin-user-member-photo-preview" src="' + escapeHtml(member.image_url || 'https://placehold.co/64x64/E0E0E0/B0B0B0?text=U') + '" alt="صورة العضو" class="w-16 h-16 rounded-full object-cover border border-[#d4dbe2]" data-placeholder="https://placehold.co/64x64/E0E0E0/B0B0B0?text=U">' +
                '<div class="flex-1">' +
                '<input type="file" id="admin-user-member-photo" accept="image/*" data-photo-preview="admin-user-member-photo-preview" class="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#1978e5] hover:file:bg-blue-100">' +
                '</div>' +
                '</div>' +
                accountFields +
                '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">' +
                modalInput('admin-user-member-name', 'الاسم الكامل *', member.name) +
                modalInput('admin-user-member-title', 'المسمى في الفريق', member.role && member.role !== 'عضو' ? member.role : '') +
                modalInput('admin-user-member-order', 'ترتيب العرض (1 الأول)', member.sort_order === 9999 ? '' : member.sort_order, 'number') +
                modalInput('admin-user-member-avatar', 'رابط صورة (اختياري)', member.image_url) +
                modalInput('admin-user-member-linkedin', 'رابط LinkedIn', member.linkedin) +
                modalInput('admin-user-member-facebook', 'رابط Facebook', member.facebook) +
                '<div class="sm:col-span-2">' + modalInput('admin-user-member-phone', 'رقم الهاتف (واتساب)', member.phone) + '</div>' +
                '</div>' +
                modalActions('admin-user-member-save', 'admin-user-member-cancel', 'حفظ', 'إلغاء');
            openAdminModal(isEdit ? 'تعديل عضو (حساب مسجل)' : 'إضافة عضو بحساب مسجل', body);
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
                email: document.getElementById('admin-user-member-email') ? document.getElementById('admin-user-member-email').value : '',
                password: document.getElementById('admin-user-member-password') ? document.getElementById('admin-user-member-password').value : ''
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
                closeAdminModal();
                await loadAdminTeam();
            } catch (err) {
                showModalMessage('فشل الحفظ: ' + err.message, true);
            }
        }

        // -------------------------------------------------------------------
        // Team: manual card (modal)
        // -------------------------------------------------------------------

        function openAdminTeamModal(member) {
            member = member || {};
            const isEdit = !!member.id;
            const body =
                '<input type="hidden" id="admin-team-edit-id" value="' + escapeHtml(member.id || '') + '">' +
                '<div class="flex items-center gap-3 mb-3">' +
                '<img id="admin-team-photo-preview" src="' + escapeHtml(member.image_url || 'https://placehold.co/64x64/E0E0E0/B0B0B0?text=U') + '" alt="صورة العضو" class="w-16 h-16 rounded-full object-cover border border-[#d4dbe2]" data-placeholder="https://placehold.co/64x64/E0E0E0/B0B0B0?text=U">' +
                '<div class="flex-1">' +
                '<input type="file" id="admin-team-photo" accept="image/*" data-photo-preview="admin-team-photo-preview" class="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#1978e5] hover:file:bg-blue-100">' +
                '</div>' +
                '</div>' +
                '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">' +
                modalInput('admin-team-name', 'الاسم الكامل *', member.name) +
                modalInput('admin-team-role', 'الدور / المسمى', member.role) +
                '<select id="admin-team-special">' +
                '<option value=""' + (!member.special_role ? ' selected' : '') + '>عضو عادي</option>' +
                '<option value="supervisor"' + (member.special_role === 'supervisor' ? ' selected' : '') + '>المشرف على المشروع</option>' +
                '<option value="teaching_assistant"' + (member.special_role === 'teaching_assistant' ? ' selected' : '') + '>المعيدة المساعدة</option>' +
                '</select>' +
                modalInput('admin-team-special-title', 'عنوان البطاقة الخاصة', member.special_title) +
                '<div class="sm:col-span-2">' + modalInput('admin-team-special-quote', 'الاقتباس (للبطاقات الخاصة)', member.special_quote) + '</div>' +
                modalInput('admin-team-linkedin', 'رابط LinkedIn', member.linkedin) +
                modalInput('admin-team-facebook', 'رابط Facebook', member.facebook) +
                modalInput('admin-team-phone', 'رقم الهاتف (واتساب)', member.phone) +
                modalInput('admin-team-main-link', 'الرابط الرئيسي', member.main_link) +
                modalInput('admin-team-image', 'رابط الصورة', member.image_url) +
                modalInput('admin-team-initials', 'الأحرف الأولى للصورة البديلة', member.initials) +
                modalInput('admin-team-sort', 'ترتيب العرض (1 الأول)', member.sort_order === 9999 ? '' : member.sort_order, 'number') +
                '</div>' +
                modalActions('admin-team-save', 'admin-team-cancel', 'حفظ', 'إلغاء');
            openAdminModal(isEdit ? 'تعديل البطاقة اليدوية' : 'إضافة بطاقة يدوية (بدون حساب)', body);
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
                closeAdminModal();
                await loadAdminTeam();
            } catch (err) {
                showModalMessage('فشل الحفظ: ' + err.message, true);
            }
        }

        // -------------------------------------------------------------------
        // Events tab
        // -------------------------------------------------------------------

        async function loadAdminEvents() {
            const listContainer = document.getElementById('admin-events-list');
            const emptyState = document.getElementById('admin-events-empty-state');
            if (listContainer) listContainer.innerHTML = skeletonAdminRow().repeat(5);
            let events = [];
            const cached = getCachedData('events');
            if (cached && cached.length > 0) {
                _adminEventsCache = cached;
                renderAdminEventsList(cached);
                if (emptyState) emptyState.classList.toggle('hidden-section', cached.length > 0);
                preloadSingle('events', 'events', {}, r => r.events);
                return;
            }
            try {
                const res = await api('events', {});
                events = res.events || [];
                _dataCache.events = events;
            } catch (e) {
                console.warn('Failed to load admin events list:', e.message);
            }
            _adminEventsCache = events;
            renderAdminEventsList(events);
            if (emptyState) emptyState.classList.toggle('hidden-section', events.length > 0);
        }

        function renderAdminEventsList(events) {
            const listContainer = document.getElementById('admin-events-list');
            if (!listContainer) return;
            if (!events.length) {
                listContainer.innerHTML = '';
                return;
            }
            listContainer.innerHTML = events.map(ev => {
                const imgUrl = ev.main_image_url || (Array.isArray(ev.image_urls) && ev.image_urls.length ? ev.image_urls[0] : 'https://placehold.co/40x40/E0E0E0/B0B0B0?text=E');
                const dateLabel = ev.event_date ? parseLocalDate(ev.event_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
                return '<div class="flex flex-wrap items-center gap-3 p-4" data-event-id="' + escapeHtml(ev.id) + '">' +
                    '<img src="' + escapeHtml(imgUrl) + '" loading="lazy" data-placeholder="https://placehold.co/40x40/E0E0E0/B0B0B0?text=E" alt="' + escapeHtml(ev.title || 'فعالية') + '" class="w-10 h-10 rounded-lg object-cover">' +
                    '<div class="flex-1 min-w-[160px]">' +
                    '<div class="text-sm font-medium text-[#101418] dark:text-gray-100">' + escapeHtml(ev.title || '—') + '</div>' +
                    '<div class="text-xs text-[#5c718a] truncate">' + escapeHtml(dateLabel) + (ev.owner_name ? ' · ' + escapeHtml(ev.owner_name) : '') + '</div>' +
                    '</div>' +
                    '<div class="flex items-center gap-2">' +
                    '<button data-action="admin-edit-event" data-event-id="' + escapeHtml(ev.id) + '" class="flex items-center justify-center rounded-lg h-9 px-3 bg-gray-200 dark:bg-gray-700 text-[#101418] dark:text-gray-100 text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600">تعديل</button>' +
                    '<button data-action="admin-delete-event" data-event-id="' + escapeHtml(ev.id) + '" class="flex items-center justify-center rounded-lg h-9 px-3 bg-red-500 text-slate-50 text-xs font-bold hover:bg-red-600">حذف</button>' +
                    '</div>' +
                    '</div>';
            }).join('');
        }

        // -------------------------------------------------------------------
        // Events: create / edit modal
        // -------------------------------------------------------------------

        let _adminEventImages = [];
        let _adminEventNewFiles = [];
        let _adminEventMain = null;
        let _adminEventAttachments = [];
        let _adminEventNewAttachmentFiles = [];
        let _adminEventRemovedAttachmentIds = [];

        function openAdminEventModal(eventItem) {
            eventItem = eventItem || {};
            _adminEventImages = (Array.isArray(eventItem.image_urls) ? eventItem.image_urls.slice() : (eventItem.image_urls ? [eventItem.image_urls] : []));
            _adminEventNewFiles = [];
            _adminEventMain = eventItem.main_image_url || (_adminEventImages.length ? _adminEventImages[0] : null);
            _adminEventAttachments = normalizeAttachmentsData(eventItem.attachments).map(serializeAttachment);
            _adminEventNewAttachmentFiles = [];
            _adminEventRemovedAttachmentIds = [];
            const isEdit = !!eventItem.id;
            const body =
                '<input type="hidden" id="admin-event-id" value="' + escapeHtml(eventItem.id || '') + '">' +
                '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">' +
                modalInput('admin-event-title', 'عنوان الفعالية *', eventItem.title) +
                modalInput('admin-event-date', 'تاريخ الفعالية *', eventItem.event_date, 'date') +
                '</div>' +
                '<div class="mb-3">' +
                '<textarea id="admin-event-description" rows="4" placeholder="وصف الفعالية">' + escapeHtml(eventItem.description || '') + '</textarea>' +
                '</div>' +
                '<div class="mb-3">' +
                '<label class="block text-xs font-bold text-[#101418] dark:text-gray-100 mb-2">صور الفعالية (الصورة الرئيسية = الأولى)</label>' +
                '<input type="file" id="admin-event-images" accept="image/*" multiple class="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#1978e5] hover:file:bg-blue-100">' +
                '<div id="admin-event-image-previews" class="flex flex-wrap gap-2 mt-2"></div>' +
                '</div>' +
                '<div class="mb-3">' +
                '<label class="block text-xs font-bold text-[#101418] dark:text-gray-100 mb-2">مرفقات الفعالية (فيديو / PDF / DWG)</label>' +
                '<input type="file" id="admin-event-attachments" accept="video/*,.pdf,.dwg" multiple class="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#1978e5] hover:file:bg-blue-100">' +
                '<div id="admin-event-attachment-previews" class="flex flex-col gap-1.5 mt-2"></div>' +
                '<div id="admin-event-upload-progress" class="hidden-section mt-2 p-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium"></div>' +
                '</div>' +
                modalActions('admin-event-save', 'admin-event-cancel', isEdit ? 'تحديث' : 'إضافة', 'إلغاء');
            openAdminModal(isEdit ? 'تعديل فعالية' : 'إضافة فعالية جديدة', body);
            renderAdminEventPreviews();
            renderAdminAttachmentPreviews();
        }

        function renderAdminEventPreviews() {
            const container = document.getElementById('admin-event-image-previews');
            if (!container) return;
            const existingHTML = _adminEventImages.map((url, i) => {
                const isMain = url === _adminEventMain;
                return '<div class="relative group" data-url="' + escapeHtml(url) + '">' +
                    '<img src="' + escapeHtml(url) + '" loading="lazy" data-placeholder="https://placehold.co/80x80/E0E0E0/B0B0B0?text=E" class="w-20 h-20 object-cover rounded-lg border ' + (isMain ? 'border-[#1978e5] ring-2 ring-[#1978e5]' : 'border-[#d4dbe2]') + '" alt="صورة ' + (i + 1) + '">' +
                    (isMain ? '<span class="absolute bottom-1 left-1 text-[9px] bg-[#1978e5] text-white rounded px-1">رئيسية</span>' : '') +
                    '<button data-action="admin-event-remove-image" data-url="' + escapeHtml(url) + '" class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs cursor-pointer">×</button>' +
                    '<button data-action="admin-event-set-main" data-url="' + escapeHtml(url) + '" class="absolute bottom-1 right-1 bg-white dark:bg-gray-700 text-[#1978e5] rounded text-[9px] px-1 py-0.5 border border-[#d4dbe2] cursor-pointer">رئيسية</button>' +
                    '</div>';
            }).join('');
            const newFilesHTML = _adminEventNewFiles.map((file, i) => {
                const previewUrl = file._previewUrl;
                const isMain = previewUrl === _adminEventMain;
                return '<div class="relative group" data-new-index="' + i + '">' +
                    '<img src="' + previewUrl + '" class="w-20 h-20 object-cover rounded-lg border ' + (isMain ? 'border-[#1978e5] ring-2 ring-[#1978e5]' : 'border-[#d4dbe2]') + '" alt="صورة جديدة ' + (i + 1) + '">' +
                    (isMain ? '<span class="absolute bottom-1 left-1 text-[9px] bg-[#1978e5] text-white rounded px-1">رئيسية</span>' : '') +
                    '<button data-action="admin-event-remove-new" data-new-index="' + i + '" class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs cursor-pointer">×</button>' +
                    '<button data-action="admin-event-set-main-new" data-new-index="' + i + '" class="absolute bottom-1 right-1 bg-white dark:bg-gray-700 text-[#1978e5] rounded text-[9px] px-1 py-0.5 border border-[#d4dbe2] cursor-pointer">رئيسية</button>' +
                    '</div>';
            }).join('');
            container.innerHTML = existingHTML + newFilesHTML;
        }

        function renderAdminAttachmentPreviews() {
            const container = document.getElementById('admin-event-attachment-previews');
            if (!container) return;
            const existingHTML = _adminEventAttachments.map((att, i) => {
                const type = getAttachmentType(att);
                return '<div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-[#d4dbe2] dark:border-gray-700">' +
                    '<div class="flex items-center gap-2 min-w-0"><span>' + attachmentTypeIcon(type) + '</span>' +
                    '<span class="text-xs font-medium text-[#101418] dark:text-gray-100 truncate">' + escapeHtml(att.name || 'ملف') + '</span>' +
                    '<span class="text-[11px] text-gray-500 shrink-0">' + formatFileSize(att.size) + '</span></div>' +
                    '<button data-action="admin-event-remove-attachment" data-index="' + i + '" class="text-red-500 hover:text-red-700 text-sm shrink-0 cursor-pointer">×</button>' +
                    '</div>';
            }).join('');
            const newHTML = _adminEventNewAttachmentFiles.map((file, i) => {
                const type = getAttachmentType({ mime: file.type, name: file.name });
                return '<div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-[#d4dbe2] dark:border-gray-700">' +
                    '<div class="flex items-center gap-2 min-w-0"><span>' + attachmentTypeIcon(type) + '</span>' +
                    '<span class="text-xs font-medium text-[#101418] dark:text-gray-100 truncate">' + escapeHtml(file.name) + '</span>' +
                    '<span class="text-[11px] text-gray-500 shrink-0">' + formatFileSize(file.size) + '</span></div>' +
                    '<button data-action="admin-event-remove-new-attachment" data-index="' + i + '" class="text-red-500 hover:text-red-700 text-sm shrink-0 cursor-pointer">×</button>' +
                    '</div>';
            }).join('');
            container.innerHTML = existingHTML + newHTML;
        }

        async function saveAdminEventForm() {
            const idInput = document.getElementById('admin-event-id');
            const title = document.getElementById('admin-event-title').value;
            const eventDate = document.getElementById('admin-event-date').value;
            const description = document.getElementById('admin-event-description').value;
            if (!title || !title.trim() || !eventDate) {
                showModalMessage('العنوان والتاريخ مطلوبان.', true);
                return;
            }
            const isEdit = idInput && !!idInput.value;
            try {
                const uploaded = [];
                for (const file of _adminEventNewFiles) {
                    const dataUrl = await fileToBase64(file);
                    const base64 = dataUrl.split(',')[1] || '';
                    const result = await api('uploadImage', { base64, file_name: file.name, mime_type: file.type || 'image/jpeg', is_avatar: '0' });
                    uploaded.push(result.url);
                }
                const finalImages = _adminEventImages.concat(uploaded).slice(0, MAX_EVENT_IMAGES);
                let main = _adminEventMain;
                const newMainIndex = _adminEventNewFiles.findIndex((f, i) => f._previewUrl === main);
                if (newMainIndex !== -1 && uploaded[newMainIndex]) main = uploaded[newMainIndex];
                if (finalImages.length && finalImages.indexOf(main) === -1) main = finalImages[0];
                if (!finalImages.length) main = null;
                const progressEl = document.getElementById('admin-event-upload-progress');
                const uploadedAttachments = [];
                for (const file of _adminEventNewAttachmentFiles) {
                    if (progressEl) { progressEl.classList.remove('hidden-section'); progressEl.textContent = 'جاري رفع ' + file.name + '...'; }
                    const uploadResult = await uploadFile(file, (pct) => {
                        if (progressEl) progressEl.textContent = 'جاري رفع ' + file.name + '... ' + pct + '%';
                    });
                    uploadedAttachments.push({
                        id: file.name + '_' + Date.now(),
                        name: file.name,
                        mime: file.type || 'application/octet-stream',
                        size: file.size,
                        file_id: uploadResult.file_id
                    });
                }
                if (progressEl) progressEl.classList.add('hidden-section');
                const finalAttachments = _adminEventAttachments.concat(uploadedAttachments).slice(0, MAX_EVENT_ATTACHMENTS);
                if (isEdit) {
                    await api('updateEvent', { id: idInput.value, title, description, event_date: eventDate, image_urls: finalImages, main_image_url: main, attachments: finalAttachments });
                } else {
                    await api('createEvent', { title, description, event_date: eventDate, image_urls: finalImages, main_image_url: main, attachments: finalAttachments });
                }
                if (_adminEventRemovedAttachmentIds.length) {
                    try {
                        await api('deleteFiles', { file_ids: _adminEventRemovedAttachmentIds });
                    } catch (df) {
                        console.warn('Error deleting old attachments from Drive:', df.message);
                    }
                }
                showModalMessage(isEdit ? 'تم تحديث الفعالية.' : 'تمت إضافة الفعالية.');
                closeAdminModal();
                _adminEventImages = [];
                _adminEventNewFiles = [];
                _adminEventMain = null;
                _adminEventAttachments = [];
                _adminEventNewAttachmentFiles = [];
                _adminEventRemovedAttachmentIds = [];
                await loadAdminEvents();
                clearDataCache();
            } catch (err) {
                showModalMessage('فشل حفظ الفعالية: ' + err.message, true);
            }
        }

        // -------------------------------------------------------------------
        // Tabs
        // -------------------------------------------------------------------

        function switchAdminTab(tab) {
            const usersPanel = document.getElementById('admin-users-panel');
            const teamPanel = document.getElementById('admin-team-panel');
            const eventsPanel = document.getElementById('admin-events-panel');
            const usersTab = document.getElementById('admin-tab-users');
            const teamTab = document.getElementById('admin-tab-team');
            const eventsTab = document.getElementById('admin-tab-events');
            const active = 'admin-tab form-button bg-[#1978e5] text-slate-50';
            const idle = 'admin-tab form-button bg-[#eaedf1] text-[#101418] hover:bg-gray-300';
            if (tab === 'team') {
                if (usersPanel) usersPanel.classList.add('hidden-section');
                if (eventsPanel) eventsPanel.classList.add('hidden-section');
                if (teamPanel) teamPanel.classList.remove('hidden-section');
                if (usersTab) usersTab.className = idle;
                if (eventsTab) eventsTab.className = idle;
                if (teamTab) teamTab.className = active;
                loadAdminTeam();
            } else if (tab === 'events') {
                if (usersPanel) usersPanel.classList.add('hidden-section');
                if (teamPanel) teamPanel.classList.add('hidden-section');
                if (eventsPanel) eventsPanel.classList.remove('hidden-section');
                if (usersTab) usersTab.className = idle;
                if (teamTab) teamTab.className = idle;
                if (eventsTab) eventsTab.className = active;
                loadAdminEvents();
            } else {
                if (teamPanel) teamPanel.classList.add('hidden-section');
                if (eventsPanel) eventsPanel.classList.add('hidden-section');
                if (usersPanel) usersPanel.classList.remove('hidden-section');
                if (teamTab) teamTab.className = idle;
                if (eventsTab) eventsTab.className = idle;
                if (usersTab) usersTab.className = active;
            }
        }

        // -------------------------------------------------------------------
        // Small helpers for modal HTML
        // -------------------------------------------------------------------

        function modalInput(id, placeholder, value, type) {
            return '<input type="' + (type || 'text') + '" id="' + id + '" placeholder="' + escapeHtml(placeholder) + '" value="' + escapeHtml(value === null || typeof value === 'undefined' ? '' : value) + '">';
        }

        function modalActions(saveId, cancelId, saveLabel, cancelLabel) {
            return '<div class="flex gap-2 justify-end">' +
                '<button id="' + saveId + '" class="form-button bg-[#1978e5] text-slate-50 h-9 px-4 text-sm">' + escapeHtml(saveLabel) + '</button>' +
                '<button id="' + cancelId + '" class="form-button bg-[#eaedf1] text-[#101418] h-9 px-4 text-sm">' + escapeHtml(cancelLabel) + '</button>' +
                '</div>';
        }

        // -------------------------------------------------------------------
        // Event listeners
        // -------------------------------------------------------------------

        function setupAdminEventListeners() {
            const usersTab = document.getElementById('admin-tab-users');
            const teamTab = document.getElementById('admin-tab-team');
            const eventsTab = document.getElementById('admin-tab-events');
            if (usersTab) usersTab.addEventListener('click', () => switchAdminTab('users'));
            if (teamTab) teamTab.addEventListener('click', () => switchAdminTab('team'));
            if (eventsTab) eventsTab.addEventListener('click', () => switchAdminTab('events'));

            const addMemberBtn = document.getElementById('admin-add-team-btn');
            if (addMemberBtn) addMemberBtn.addEventListener('click', () => openAdminTeamModal(null));

            const addUserMemberBtn = document.getElementById('admin-add-user-member-btn');
            if (addUserMemberBtn) addUserMemberBtn.addEventListener('click', () => openAdminUserMemberModal(null));

            const addEventBtn = document.getElementById('admin-add-event-btn');
            if (addEventBtn) addEventBtn.addEventListener('click', () => openAdminEventModal(null));

            const repairAvatarsBtn = document.getElementById('admin-repair-avatars');
            if (repairAvatarsBtn) repairAvatarsBtn.addEventListener('click', async () => {
                try {
                    const result = await api('repairAvatars', {});
                    const msg = result.message || 'تم إصلاح الصور الرمزية.';
                    const detail = (typeof result.updated_rows !== 'undefined' || typeof result.shared_files !== 'undefined') ?
                        ` (روابط محدثة: ${result.updated_rows || 0}، ملفات مشتركة: ${result.shared_files || 0})` : '';
                    showToast(msg + detail);
                } catch (err) {
                    showModalMessage('فشل إصلاح الصور الرمزية: ' + err.message, true);
                }
            });

            // Save/cancel buttons inside the admin modal
            if (_adminModalBody) _adminModalBody.addEventListener('click', async (e) => {
                if (e.target.closest('#admin-user-edit-save')) return saveAdminUserEdit();
                if (e.target.closest('#admin-user-edit-cancel')) return closeAdminModal();
                if (e.target.closest('#admin-user-member-save')) return saveAdminUserMemberForm();
                if (e.target.closest('#admin-user-member-cancel')) return closeAdminModal();
                if (e.target.closest('#admin-team-save')) return saveAdminTeamForm();
                if (e.target.closest('#admin-team-cancel')) return closeAdminModal();
                if (e.target.closest('#admin-event-save')) return saveAdminEventForm();
                if (e.target.closest('#admin-event-cancel')) return closeAdminModal();

                const removeImg = e.target.closest('[data-action="admin-event-remove-image"]');
                if (removeImg) {
                    const url = removeImg.getAttribute('data-url');
                    _adminEventImages = _adminEventImages.filter(u => u !== url);
                    if (_adminEventMain === url) _adminEventMain = _adminEventImages.length ? _adminEventImages[0] : null;
                    renderAdminEventPreviews();
                    return;
                }
                const setMain = e.target.closest('[data-action="admin-event-set-main"]');
                if (setMain) {
                    _adminEventMain = setMain.getAttribute('data-url');
                    renderAdminEventPreviews();
                    return;
                }
                const removeNew = e.target.closest('[data-action="admin-event-remove-new"]');
                if (removeNew) {
                    const idx = Number(removeNew.getAttribute('data-new-index'));
                    if (_adminEventNewFiles[idx] && _adminEventNewFiles[idx]._previewUrl === _adminEventMain) {
                        _adminEventMain = _adminEventImages.length ? _adminEventImages[0] : (_adminEventNewFiles.length > 1 ? _adminEventNewFiles[0]._previewUrl : null);
                    }
                    _adminEventNewFiles.splice(idx, 1);
                    renderAdminEventPreviews();
                    return;
                }
                const setMainNew = e.target.closest('[data-action="admin-event-set-main-new"]');
                if (setMainNew) {
                    const idx = Number(setMainNew.getAttribute('data-new-index'));
                    if (_adminEventNewFiles[idx]) _adminEventMain = _adminEventNewFiles[idx]._previewUrl;
                    renderAdminEventPreviews();
                    return;
                }
                const removeAtt = e.target.closest('[data-action="admin-event-remove-attachment"]');
                if (removeAtt) {
                    const idx = Number(removeAtt.getAttribute('data-index'));
                    const att = _adminEventAttachments[idx];
                    if (att && att.file_id) _adminEventRemovedAttachmentIds.push(att.file_id);
                    _adminEventAttachments.splice(idx, 1);
                    renderAdminAttachmentPreviews();
                    return;
                }
                const removeNewAtt = e.target.closest('[data-action="admin-event-remove-new-attachment"]');
                if (removeNewAtt) {
                    const idx = Number(removeNewAtt.getAttribute('data-index'));
                    _adminEventNewAttachmentFiles.splice(idx, 1);
                    renderAdminAttachmentPreviews();
                    return;
                }
            });

            if (_adminModalBody) _adminModalBody.addEventListener('change', (e) => {
                const filesInput = e.target.closest('#admin-event-images');
                if (filesInput && filesInput.files) {
                    const files = Array.from(filesInput.files);
                    const total = _adminEventImages.length + _adminEventNewFiles.length + files.length;
                    if (total > MAX_EVENT_IMAGES) {
                        showModalMessage(`لا يمكن رفع أكثر من ${MAX_EVENT_IMAGES} صور.`, true);
                        filesInput.value = '';
                        return;
                    }
                    const invalid = files.find(f => !f.type.startsWith('image/'));
                    if (invalid) {
                        showModalMessage('يرجى اختيار ملفات صور فقط.', true);
                        filesInput.value = '';
                        return;
                    }
                    const oversized = files.find(f => f.size > 10 * 1024 * 1024);
                    if (oversized) {
                        showModalMessage('حجم كل صورة يجب ألا يتجاوز 10 ميجابايت.', true);
                        filesInput.value = '';
                        return;
                    }
                    files.forEach(file => {
                        file._previewUrl = URL.createObjectURL(file);
                        _adminEventNewFiles.push(file);
                        if (!_adminEventMain) _adminEventMain = file._previewUrl;
                    });
                    filesInput.value = '';
                    renderAdminEventPreviews();
                    return;
                }
                const attachInput = e.target.closest('#admin-event-attachments');
                if (attachInput && attachInput.files) {
                    const files = Array.from(attachInput.files);
                    const total = _adminEventAttachments.length + _adminEventNewAttachmentFiles.length + files.length;
                    if (total > MAX_EVENT_ATTACHMENTS) {
                        showModalMessage(`لا يمكن رفع أكثر من ${MAX_EVENT_ATTACHMENTS} مرفقات.`, true);
                        attachInput.value = '';
                        return;
                    }
                    files.forEach(file => _adminEventNewAttachmentFiles.push(file));
                    attachInput.value = '';
                    renderAdminAttachmentPreviews();
                    return;
                }
            });

            document.addEventListener('click', async (e) => {
                const editUserBtn = e.target.closest('[data-action="admin-edit-user"]');
                if (editUserBtn) {
                    const userId = editUserBtn.getAttribute('data-target-user');
                    if (!userId) return;
                    const cached = _adminUsersCache.find(u => String(u.id) === String(userId));
                    if (cached) {
                        openAdminUserEditModal(userId, cached);
                    } else {
                        openAdminUserEditModal(userId, { full_name: '', user_name: '', academic_id: '', avatar_url: '' });
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
                        if (cached.is_user) openAdminUserMemberModal(cached);
                        else openAdminTeamModal(cached);
                        return;
                    }
                    try {
                        const res = await api('team', {});
                        const member = (res.team || []).find(m => String(m.id) === String(teamId));
                        if (!member) {
                            showModalMessage('العضو غير موجود.', true);
                            return;
                        }
                        if (member.is_user) openAdminUserMemberModal(member);
                        else openAdminTeamModal(member);
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

                const editEventBtn = e.target.closest('[data-action="admin-edit-event"]');
                if (editEventBtn) {
                    const eventId = editEventBtn.getAttribute('data-event-id');
                    if (!eventId) return;
                    const cached = _adminEventsCache.find(ev => String(ev.id) === String(eventId));
                    if (cached) {
                        openAdminEventModal(cached);
                        return;
                    }
                    try {
                        const res = await api('event', { id: eventId });
                        if (!res || !res.id) {
                            showModalMessage('الفعالية غير موجودة.', true);
                            return;
                        }
                        openAdminEventModal(res);
                    } catch (err) {
                        showModalMessage('فشل تحميل الفعالية: ' + err.message, true);
                    }
                    return;
                }

                const deleteEventBtn = e.target.closest('[data-action="admin-delete-event"]');
                if (deleteEventBtn) {
                    const eventId = deleteEventBtn.getAttribute('data-event-id');
                    if (!eventId) return;
                    showConfirmModal('حذف هذه الفعالية وجميع صورها وتفاعلاتها نهائيًا؟', async () => {
                        try {
                            await api('deleteEvent', { id: eventId });
                            showModalMessage('تم حذف الفعالية.');
                            clearDataCache();
                            await loadAdminEvents();
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
