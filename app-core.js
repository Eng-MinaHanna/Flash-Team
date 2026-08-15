
        // --- Google Sheets Backend (Apps Script) ---
        // ضع رابط Web App من Apps Script هنا بعد النشر (راجع GoogleSheets-Backend/SETUP.md)
        const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx6F8K0I3uRPuxidCQxEp4wLcgM26d8YKQtz78YXwYXrnHnfN6UPjz1Z6A90jJA0k4/exec';
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
            if (isError) {
                showMessageModal(message);
                return;
            }
            showToast(message, 'success');
        }
        function showToast(message, type = 'success') {
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                container.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[1001] flex flex-col items-center gap-2 px-4 pointer-events-none';
                document.body.appendChild(container);
            }
            const toast = document.createElement('div');
            toast.className = 'toast-item';
            toast.setAttribute('role', 'status');
            toast.textContent = message;
            if (type === 'error') toast.classList.add('toast-error');
            container.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('toast-hide');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
        function emptyStateBlock(message, icon = '📄') {
            return `<div class="flex flex-col items-center justify-center gap-2 p-10 text-center col-span-full">
                        <div class="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 text-3xl">${icon}</div>
                        <p class="text-[#5c718a] dark:text-gray-400 text-sm font-medium">${message}</p>
                    </div>`;
        }
        function showConfirmModal(message, callback) {
            confirmModalMessage.textContent = message;
            confirmCallback = callback;
            confirmModal.classList.remove('hidden-section');
            if (confirmModalCancelBtn) confirmModalCancelBtn.focus();
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

        // Accepts an attachments array OR a JSON string of attachments and
        // returns a normalized array with renderable URLs.
        function normalizeAttachmentsData(attachments) {
            let list = attachments;
            if (typeof list === 'string') {
                try { list = JSON.parse(list); } catch (e) { list = []; }
            }
            if (!Array.isArray(list)) list = [];
            return list.map(function (att) {
                if (!att || typeof att !== 'object') return null;
                const fileId = att.file_id || att.id || '';
                const baseUrl = fileId ? 'https://drive.usercontent.google.com/download?id=' + fileId + '&export=download&confirm=t' : '';
                return {
                    id: att.id || fileId,
                    name: att.name || 'ملف',
                    mime: att.mime || 'application/octet-stream',
                    size: Number(att.size) || 0,
                    file_id: fileId,
                    view_url: att.view_url || baseUrl,
                    download_url: att.download_url || att.view_url || baseUrl,
                    preview_url: att.preview_url || (fileId ? 'https://drive.google.com/file/d/' + fileId + '/preview' : '')
                };
            }).filter(Boolean);
        }

        function parseLocalDate(dateStr) {
            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const parts = dateStr.split('-').map(Number);
                return new Date(parts[0], parts[1] - 1, parts[2]);
            }
            return new Date(dateStr);
        }

        function hideModal(modal) {
            if (modal) modal.classList.add('hidden-section');
        }

        function showMessageModal(message) {
            if (modalMessageText && messageModal) {
                modalMessageText.textContent = message;
                modalMessageText.className = 'text-red-600 font-semibold';
                messageModal.classList.remove('hidden-section');
                if (modalCloseBtn) modalCloseBtn.focus();
            }
        }

        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                hideModal(messageModal);
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
        [messageModal, confirmModal].forEach(modal => {
            if (!modal) return;
            modal.addEventListener('click', (e) => {
                if (e.target === modal) hideModal(modal);
            });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            [messageModal, confirmModal].forEach(modal => {
                if (modal && !modal.classList.contains('hidden-section')) {
                    hideModal(modal);
                    if (modal === confirmModal) confirmCallback = null;
                }
            });
        });

        document.addEventListener('error', (e) => {
            const img = e.target;
            if (img && img.tagName === 'IMG' && img.dataset.placeholder && img.src !== img.dataset.placeholder) {
                img.src = img.dataset.placeholder;
                if (img.id === 'header-logo-img') img.alt = 'شعار فريق Flash الافتراضي';
            }
        }, true);

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

        // Chunked resumable upload for large files (videos, PDF, DWG...).
        // Sends ~10MB chunks to the Apps Script backend which streams them into Drive.
        async function uploadFileChunked(file, onProgress) {
            const size = file.size;
            let meta;
            try {
                meta = await api('startFileUpload', { name: file.name, mime: file.type || 'application/octet-stream', size });
            } catch (e) {
                if (/external_request/i.test(e.message || '')) {
                    throw new Error('الرفع المجزأ يحتاج تفويضاً إضافياً من Google (script.external_request). أعد نشر مشروع Apps Script وتفويض الأذونات، أو استخدم ملفاً أصغر من 28MB.');
                }
                throw e;
            }
            if (!meta || !meta.upload_id) throw new Error('فشل بدء رفع الملف.');
            const uploadId = meta.upload_id;
            let start = 0;
            while (start < size) {
                const end = Math.min(size, start + UPLOAD_CHUNK_BYTES);
                const dataUrl = await fileToBase64(file.slice(start, end));
                const base64 = dataUrl.split(',')[1] || '';
                const result = await api('uploadFileChunk', { upload_id: uploadId, base64, start, total: size });
                if (result && result.done) {
                    if (onProgress) onProgress(100);
                    return { file_id: result.file_id, size };
                }
                start = (result && typeof result.uploaded === 'number') ? result.uploaded : end;
                if (onProgress) onProgress(Math.min(99, Math.round((start / size) * 100)));
            }
            throw new Error('انتهى رفع الملف دون اكتمال.');
        }

        // Uploads files up to SIMPLE_UPLOAD_MAX_BYTES in a single request via DriveApp
        // (needs no extra Google permissions). Larger files use uploadFileChunked.
        async function uploadFile(file, onProgress) {
            if (file.size <= SIMPLE_UPLOAD_MAX_BYTES) {
                if (onProgress) onProgress(5);
                const dataUrl = await fileToBase64(file);
                const base64 = dataUrl.split(',')[1] || '';
                if (onProgress) onProgress(40);
                const result = await api('uploadAttachment', {
                    name: file.name,
                    mime: file.type || 'application/octet-stream',
                    base64
                });
                if (!result || !result.file_id) throw new Error('فشل رفع الملف.');
                if (onProgress) onProgress(100);
                return { file_id: result.file_id, size: file.size };
            }
            return uploadFileChunked(file, onProgress);
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
        const _QUIET_API_ACTIONS = ['reactionCounts', 'userReaction', 'me', 'bulkCounts'];

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

        // --- Variables for event attachments (videos / PDF / DWG ...) ---
        let existingEventAttachments = [];
        let eventAttachmentsToUpload = [];
        let attachmentIdsPendingDeletion = [];
        const MAX_EVENT_ATTACHMENTS = 10;
        const UPLOAD_CHUNK_BYTES = 10 * 1024 * 1024;
        const SIMPLE_UPLOAD_MAX_BYTES = 28 * 1024 * 1024;

        // --- Common styles ---
        const inputFieldStyles = "form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#101418] focus:outline-0 focus:ring-2 focus:ring-[#1978e5] border border-[#d4dbe2] bg-gray-50 focus:border-[#1978e5] h-14 placeholder:text-[#5c718a] p-[15px] text-base font-normal leading-normal";
        const formButtonStyles = "flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-4 text-base font-bold leading-normal tracking-[0.015em] transition-colors";
        document.querySelectorAll('.input-field').forEach(el => el.className = inputFieldStyles);
        document.querySelectorAll('.form-button').forEach(el => el.className = `${formButtonStyles} ${el.className}`);
