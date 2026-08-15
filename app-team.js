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
            if (document.getElementById('update-linkedin')) document.getElementById('update-linkedin').value = currentUser.linkedin || '';
            if (document.getElementById('update-facebook')) document.getElementById('update-facebook').value = currentUser.facebook || '';
            if (document.getElementById('update-phone')) document.getElementById('update-phone').value = currentUser.phone || '';
            if (document.getElementById('update-profile-role-display')) document.getElementById('update-profile-role-display').textContent = currentUser.role || 'غير محدد';
            if (updateAvatarPreview) updateAvatarPreview.src = currentUser.avatar_url || 'https://placehold.co/100x100/E0E0E0/B0B0B0?text=Avatar';
        }

        if (updateProfileForm) {
            updateProfileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!currentUser) {
                    showModalMessage('يجب تسجيل الدخول لتحديث الملف الشخصي.', true);
                    return;
                }

                const fullName = document.getElementById('update-full-name').value;
                const userName = document.getElementById('update-user-name').value;
                const academicId = document.getElementById('update-academic-id').value;
                const linkedin = document.getElementById('update-linkedin').value.trim();
                const facebook = document.getElementById('update-facebook').value.trim();
                const phone = document.getElementById('update-phone').value.trim();
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
                        full_name: fullName, user_name: userName, academic_id: academicId, avatar_url: avatarUrl,
                        linkedin: linkedin, facebook: facebook, phone: phone
                    });
                    saveSession(_sessionToken, result.user);
                    writeMeCache(result.user);

                    showModalMessage('تم تحديث الملف الشخصي بنجاح!');
                    await updateAuthState(currentUser);
                } catch (error) {
                    showModalMessage(`فشل تحديث الملف الشخصي: ${error.message}`, true);
                    console.error("Profile update error:", error);
                }
            });
        }

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
                markCacheFresh('team');
                persistCacheToStorage();
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
                        <img src="${escapeHtml(img)}" loading="lazy" data-placeholder="https://placehold.co/200x200/1E3A8A/60A5FA?text=${encodeURIComponent(member.initials || '؟')}&font=cairo" alt="${escapeHtml(member.name || 'عضو')}" class="w-24 h-24 rounded-full mx-auto mb-3 border-4 ${borderImgClass} shadow-md object-cover">
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

            teamMembersListContainer.innerHTML = html || emptyStateBlock('لا يوجد أعضاء في الفريق بعد.', '👥');
            attachTeamCardClickHandlers();
        }

        function attachTeamCardClickHandlers() {
            if (!teamMembersListContainer) return;
            teamMembersListContainer.onclick = null;
            teamMembersListContainer.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-action]');
                if (actionBtn) {
                    const action = actionBtn.dataset.action;
                    if (action === 'vacant-info') {
                        showModalMessage('ميزة اقتراح المهام غير متاحة حاليًا.', true);
                    } else if (action === 'retry-team') {
                        loadProfiles();
                    }
                    return;
                }
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
                        cardAttributes += ` data-main-link="${escapeHtml(member.mainLink)}"`;
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
                        <button data-action="vacant-info" class="text-xxs py-1 px-2 w-full mt-auto bg-gray-500 hover:bg-gray-600 text-white rounded" style="font-size: 0.55rem; padding: 0.2rem 0.4rem;">
                            تفاصيل
                        </button>
                    </div>`;
                }
                teamMembersListContainer.innerHTML = memberHtml;
                attachTeamCardClickHandlers();

            } catch (e) {
                console.error("Error in loadProfiles (static data processing):", e);
                teamMembersListContainer.innerHTML = emptyStateBlock('فشل تحميل ملفات الفريق.') + '<div class="flex justify-center col-span-full pb-8"><button data-action="retry-team" class="px-5 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold transition-colors cursor-pointer">إعادة المحاولة</button></div>';
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
                    <img src="${safeImgSrc}" loading="lazy" data-placeholder="${escapeHtml(placeholderSrc)}" alt="صورة ${escapeHtml(member.name || 'عضو')}" class="w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto mb-1 border-2 shadow-md object-cover">
                    <h3 class="text-xs font-bold mb-0.5 leading-tight">${escapeHtml(member.name || 'عضو غير معروف')}</h3>
                    <p class="font-semibold text-xxs text-blue-500" style="font-size: 0.6rem;">${escapeHtml(member.role || 'عضو')}</p>
                    ${socialLinksHTML}
                `;
        }
