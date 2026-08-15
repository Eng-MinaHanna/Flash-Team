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

        // --- Event attachments (videos / PDF / DWG ...) ---
        const eventAttachmentFilesInput = document.getElementById('event-attachment-files');
        const eventAttachmentsPreviewContainer = document.getElementById('event-attachments-preview');
        const eventAttachmentsProgressContainer = document.getElementById('event-attachments-progress');

        function getAttachmentType(att) {
            const mime = String((att && att.mime) || '').toLowerCase();
            const name = String((att && att.name) || '').toLowerCase();
            if (mime.indexOf('video/') === 0) return 'video';
            if (mime === 'application/pdf' || name.indexOf('.pdf') !== -1) return 'pdf';
            if (name.indexOf('.dwg') !== -1) return 'dwg';
            return 'other';
        }

        function formatFileSize(bytes) {
            const b = Number(bytes) || 0;
            if (b < 1024) return b + ' B';
            if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
            if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + ' MB';
            return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        }

        function attachmentTypeIcon(type) {
            if (type === 'video') return '🎬';
            if (type === 'pdf') return '📄';
            if (type === 'dwg') return '📐';
            return '📎';
        }

        function serializeAttachment(att) {
            return {
                id: (att && att.id) || (att && att.file_id),
                name: (att && att.name) || 'ملف',
                mime: (att && att.mime) || 'application/octet-stream',
                size: Number((att && att.size) || 0),
                file_id: (att && att.file_id) || (att && att.id)
            };
        }

        function renderEventAttachment(att) {
            const type = getAttachmentType(att);
            const name = escapeHtml(att.name || 'ملف');
            const sizeLabel = formatFileSize(att.size);
            const downloadUrl = att.download_url || att.view_url || '';
            const downloadBtn = '<a href="' + escapeHtml(downloadUrl) + '" target="_blank" rel="noopener" class="inline-block mt-1 bg-[#1978e5] text-white text-xs font-semibold py-1.5 px-3 rounded-lg hover:bg-blue-700">تحميل</a>';
            if (type === 'video') {
                return '<div class="mb-4">' +
                    '<div class="flex items-center justify-between mb-1"><span class="text-sm font-semibold text-[#101418] truncate">' + name + '</span><span class="text-xs text-gray-500 shrink-0 mr-2">' + sizeLabel + '</span></div>' +
                    '<video controls preload="metadata" playsinline class="w-full rounded-lg bg-black" src="' + escapeHtml(att.view_url || downloadUrl) + '"></video>' +
                    '<div>' + downloadBtn + '</div>' +
                    '</div>';
            }
            if (type === 'pdf') {
                return '<div class="mb-2 flex items-center justify-between gap-2 p-3 border border-[#d4dbe2] rounded-lg bg-gray-50">' +
                    '<div class="flex items-center gap-2 min-w-0"><span>' + attachmentTypeIcon(type) + '</span>' +
                    '<span class="text-sm font-medium text-[#101418] truncate">' + name + '</span>' +
                    '<span class="text-xs text-gray-500 shrink-0">' + sizeLabel + '</span></div>' +
                    '<div class="flex items-center gap-2 shrink-0">' +
                    '<a href="' + escapeHtml(att.preview_url || downloadUrl) + '" target="_blank" rel="noopener" class="bg-[#1978e5] text-white text-xs font-semibold py-1.5 px-3 rounded-lg hover:bg-blue-700">عرض</a>' +
                    '<a href="' + escapeHtml(downloadUrl) + '" target="_blank" rel="noopener" class="bg-gray-200 text-[#101418] text-xs font-semibold py-1.5 px-3 rounded-lg hover:bg-gray-300">تحميل</a>' +
                    '</div></div>';
            }
            return '<div class="mb-2 flex items-center justify-between gap-2 p-3 border border-[#d4dbe2] rounded-lg bg-gray-50">' +
                '<div class="flex items-center gap-2 min-w-0"><span>' + attachmentTypeIcon(type) + '</span>' +
                '<span class="text-sm font-medium text-[#101418] truncate">' + name + '</span>' +
                '<span class="text-xs text-gray-500 shrink-0">' + sizeLabel + '</span></div>' +
                '<a href="' + escapeHtml(downloadUrl) + '" target="_blank" rel="noopener" class="bg-[#1978e5] text-white text-xs font-semibold py-1.5 px-3 rounded-lg hover:bg-blue-700 shrink-0">تحميل</a></div>';
        }

        function renderEventDetailsAttachments(attachments) {
            let container = document.getElementById('event-details-attachments');
            if (!container) {
                container = document.createElement('div');
                container.id = 'event-details-attachments';
                container.className = 'mb-4';
                const content = document.getElementById('event-details-content');
                if (content) content.appendChild(container);
            }
            if (!container) return;
            const list = normalizeAttachmentsData(attachments);
            if (!list.length) { container.innerHTML = ''; return; }
            container.innerHTML = '<h3 class="text-lg font-semibold text-gray-700 mb-3">مرفقات الفعالية:</h3>' + list.map(renderEventAttachment).join('');
        }

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

        // --- Attachments preview & handling ---
        function renderAttachmentsPreview() {
            if (!eventAttachmentsPreviewContainer) return;
            eventAttachmentsPreviewContainer.innerHTML = '';
            existingEventAttachments.forEach((att, index) => {
                eventAttachmentsPreviewContainer.appendChild(createAttachmentPreviewElement(att, false, index));
            });
            eventAttachmentsToUpload.forEach((file, index) => {
                eventAttachmentsPreviewContainer.appendChild(createAttachmentPreviewElement(file, true, index));
            });
        }

        function createAttachmentPreviewElement(att, isNew, index) {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-center justify-between gap-2 p-2 border border-[#d4dbe2] rounded-lg bg-gray-50';
            const type = isNew ? getAttachmentType({ mime: att.type, name: att.name }) : getAttachmentType(att);
            const name = isNew ? att.name : (att.name || 'ملف');
            const sizeLabel = formatFileSize(att.size);
            const left = document.createElement('div');
            left.className = 'flex items-center gap-2 min-w-0';
            left.innerHTML = '<span>' + attachmentTypeIcon(type) + '</span>' +
                '<span class="text-xs font-medium text-[#101418] truncate">' + escapeHtml(name) + '</span>' +
                '<span class="text-[11px] text-gray-500 shrink-0">' + sizeLabel + '</span>';
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'text-red-500 hover:text-red-700 text-sm shrink-0 cursor-pointer';
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                if (isNew) {
                    eventAttachmentsToUpload.splice(index, 1);
                } else {
                    const removedId = att.file_id || att.id;
                    if (removedId) attachmentIdsPendingDeletion.push(removedId);
                    existingEventAttachments.splice(index, 1);
                }
                renderAttachmentsPreview();
            };
            wrapper.appendChild(left);
            wrapper.appendChild(removeBtn);
            return wrapper;
        }

        function showAttachmentsProgress(text) {
            if (!eventAttachmentsProgressContainer) return;
            eventAttachmentsProgressContainer.classList.remove('hidden-section');
            eventAttachmentsProgressContainer.innerHTML = '<div class="p-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">' + escapeHtml(text) + '</div>';
        }

        function hideAttachmentsProgress() {
            if (!eventAttachmentsProgressContainer) return;
            eventAttachmentsProgressContainer.classList.add('hidden-section');
            eventAttachmentsProgressContainer.innerHTML = '';
        }

        function resetEventAttachmentsState() {
            existingEventAttachments = [];
            eventAttachmentsToUpload = [];
            attachmentIdsPendingDeletion = [];
            if (eventAttachmentsPreviewContainer) eventAttachmentsPreviewContainer.innerHTML = '';
            hideAttachmentsProgress();
            if (eventAttachmentFilesInput) eventAttachmentFilesInput.value = '';
        }

        if (eventAttachmentFilesInput) {
            eventAttachmentFilesInput.addEventListener('change', (event) => {
                const files = Array.from(event.target.files);
                const totalCount = existingEventAttachments.length + eventAttachmentsToUpload.length + files.length;
                if (totalCount > MAX_EVENT_ATTACHMENTS) {
                    showModalMessage(`لا يمكن رفع أكثر من ${MAX_EVENT_ATTACHMENTS} مرفقات.`, true);
                    event.target.value = "";
                    return;
                }
                files.forEach(file => {
                    eventAttachmentsToUpload.push(file);
                });
                event.target.value = "";
                renderAttachmentsPreview();
            });
        }

        if (createEventBtnGeneral) {
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
                resetEventAttachmentsState();
                createEventFormContainer.classList.remove('hidden-section');
                createEventBtnGeneral.classList.add('hidden-section');
            });
        }

        if (cancelCreateEventBtn) {
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
                resetEventAttachmentsState();
            });
        }

        if (createEventForm) {
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

                let uploadedAttachments = [];
                if (eventAttachmentsToUpload.length > 0) {
                    for (const file of eventAttachmentsToUpload) {
                        showAttachmentsProgress(`جاري رفع ${file.name}...`);
                        const uploadResult = await uploadFile(file, (pct) => {
                            showAttachmentsProgress(`جاري رفع ${file.name}... ${pct}%`);
                        });
                        uploadedAttachments.push({
                            id: file.name + '_' + Date.now(),
                            name: file.name,
                            mime: file.type || 'application/octet-stream',
                            size: file.size,
                            file_id: uploadResult.file_id
                        });
                    }
                    hideAttachmentsProgress();
                }
                const finalAttachments = existingEventAttachments.map(serializeAttachment).concat(uploadedAttachments).slice(0, MAX_EVENT_ATTACHMENTS);

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
                        image_urls: finalImageUrls, main_image_url: mainImageUrlToSave,
                        attachments: finalAttachments
                    });
                } else {
                    await api('createEvent', {
                        title, description, event_date,
                        image_urls: finalImageUrls, main_image_url: mainImageUrlToSave,
                        attachments: finalAttachments
                    });
                }

                if (imageUrlsPendingDeletion.length > 0) {
                    try {
                        await api('deleteImages', { image_urls: imageUrlsPendingDeletion });
                    } catch (de) {
                        console.warn('Error deleting old images from Drive:', de.message);
                    }
                }
                if (attachmentIdsPendingDeletion.length > 0) {
                    try {
                        await api('deleteFiles', { file_ids: attachmentIdsPendingDeletion });
                    } catch (df) {
                        console.warn('Error deleting old attachments from Drive:', df.message);
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
                resetEventAttachmentsState();
                createEventFormContainer.classList.add('hidden-section');
                if (currentUser) updateAuthState(currentUser);
                editingEventId = null;
                await loadEvents();
            } catch (error) {
                showModalMessage(`فشل ${editingEventId ? 'تحديث' : 'إنشاء'} الفعالية: ${error.message}`, true);
                console.error("Event form submission error:", error);
            }
            });
        }

        function createEventCard(eventItem, isUpcoming = true) {
            const eventDate = parseLocalDate(eventItem.event_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
            const rawDescription = (eventItem.description == null) ? '' : String(eventItem.description);
            const descriptionText = rawDescription.length > 150 ? rawDescription.substring(0, 150) + '...' : rawDescription;
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
                            <img class="h-48 w-full object-cover md:h-full event-image" loading="lazy" src="${escapeHtml(displayImageUrl)}" alt="${escapeHtml(eventItem.title)}">
                        </div>
                        <div class="p-6 md:w-2/3 flex flex-col justify-between">
                            <div>
                                <div class="uppercase tracking-wide text-sm text-[#1978e5] font-semibold">${eventDate}</div>
                                <a href="#" class="block mt-1 text-lg leading-tight font-medium text-black hover:underline event-details-link" data-eventid="${eventItem.id}">${escapeHtml(eventItem.title)}</a>
                                <p class="mt-2 text-slate-600 text-sm">${escapeHtml(descriptionText || 'لا يوجد وصف متاح.')}</p>
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

            return cardHTML;
        }

        // --- Bulk counts (one call for ALL events instead of 2 calls per card) ---
        let _bulkCountsCache = null;
        let _bulkCountsLoadingPromise = null;

        async function loadBulkCounts(force) {
            if (!force && _bulkCountsCache) return _bulkCountsCache;
            if (_bulkCountsLoadingPromise) return _bulkCountsLoadingPromise;
            _bulkCountsLoadingPromise = api('bulkCounts', {}, true)
                .then(r => {
                    _bulkCountsCache = { counts: r.counts || {}, myReactions: r.myReactions || {} };
                    return _bulkCountsCache;
                })
                .catch(e => {
                    console.warn('Bulk counts failed:', e.message);
                    return null;
                })
                .finally(() => { _bulkCountsLoadingPromise = null; });
            return _bulkCountsLoadingPromise;
        }

        function clearReactionIconState(eventId) {
            ['like', 'love', 'sad'].forEach(t => {
                ['', 'details-'].forEach(prefix => {
                    const el = document.getElementById(`${t}-icon-${prefix}${eventId}`);
                    if (el) el.classList.remove('selected', 'text-blue-600', 'text-red-600', 'text-yellow-500');
                });
            });
        }

        function applyUserReactionToEvent(eventId, type) {
            clearReactionIconState(eventId);
            if (!type) return;
            const colorClass = type === 'like' ? 'text-blue-600' : (type === 'love' ? 'text-red-600' : 'text-yellow-500');
            ['', 'details-'].forEach(prefix => {
                const el = document.getElementById(`${type}-icon-${prefix}${eventId}`);
                if (el) el.classList.add('selected', colorClass);
            });
        }

        function applyBulkCountsToEvent(eventId) {
            if (!_bulkCountsCache) return;
            const c = _bulkCountsCache.counts[eventId];
            if (c) {
                ['like', 'love', 'sad'].forEach(t => {
                    const el = document.getElementById(`${t}-count-${eventId}`);
                    if (el) el.textContent = c[t] || 0;
                    const elD = document.getElementById(`${t}-count-details-${eventId}`);
                    if (elD) elD.textContent = c[t] || 0;
                });
                const cc = document.getElementById(`comments-count-${eventId}`);
                if (cc) cc.textContent = c.comments || 0;
                const ccD = document.getElementById(`comments-count-details-${eventId}`);
                if (ccD) ccD.textContent = c.comments || 0;
            }
            applyUserReactionToEvent(eventId, (_bulkCountsCache.myReactions[eventId]) || null);
        }

        function applyBulkCountsAll(eventIds) {
            if (!_bulkCountsCache) return;
            (eventIds || Object.keys(_bulkCountsCache.counts)).forEach(applyBulkCountsToEvent);
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
            const optimisticApplied = !!_bulkCountsCache;
            let prevType = null;
            let prevCounts = null;
            if (_bulkCountsCache) {
                prevType = _bulkCountsCache.myReactions[eventId] || null;
                prevCounts = Object.assign({}, _bulkCountsCache.counts[eventId] || {});
                const counts = _bulkCountsCache.counts[eventId];
                if (prevType && counts && counts[prevType] > 0) counts[prevType]--;
                if (reactionType === prevType) {
                    delete _bulkCountsCache.myReactions[eventId];
                } else {
                    _bulkCountsCache.myReactions[eventId] = reactionType;
                    if (counts) counts[reactionType] = (counts[reactionType] || 0) + 1;
                }
                applyBulkCountsToEvent(eventId);
            }
            try {
                await api('react', { event_id: eventId, reaction_type: reactionType });
                await loadBulkCounts(true);
                if (_bulkCountsCache) applyBulkCountsToEvent(eventId);
            } catch (error) {
                if (_bulkCountsCache && optimisticApplied) {
                    if (prevType) {
                        _bulkCountsCache.myReactions[eventId] = prevType;
                    } else {
                        delete _bulkCountsCache.myReactions[eventId];
                    }
                    if (Object.keys(prevCounts).length) {
                        _bulkCountsCache.counts[eventId] = prevCounts;
                    } else {
                        delete _bulkCountsCache.counts[eventId];
                    }
                    applyBulkCountsToEvent(eventId);
                }
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
                if (_bulkCountsCache) {
                    const c = _bulkCountsCache.counts[eventId];
                    if (c) c.comments = (c.comments || 0) + 1;
                    applyBulkCountsToEvent(eventId);
                }
                await loadBulkCounts(true);
                if (_bulkCountsCache) applyBulkCountsToEvent(eventId);
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

            loadBulkCounts();

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
                markCacheFresh('events');
                persistCacheToStorage();
                renderEvents(eventsData);
            } catch (e) {
                console.error('Overall error caught in loadEvents. Error:', e);
                if (upcomingEventsList && !upcomingEventsList.innerHTML.includes('text-red-500')) {
                    upcomingEventsList.innerHTML = emptyStateBlock('فشل تحميل الفعاليات القادمة.') + '<div class="flex justify-center col-span-full pb-8"><button data-action="retry-events" class="px-5 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold transition-colors cursor-pointer">إعادة المحاولة</button></div>';
                }
                if (pastEventsList && !pastEventsList.innerHTML.includes('text-red-500')) {
                    pastEventsList.innerHTML = emptyStateBlock('فشل تحميل الفعاليات السابقة.') + '<div class="flex justify-center col-span-full pb-8"><button data-action="retry-events" class="px-5 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold transition-colors cursor-pointer">إعادة المحاولة</button></div>';
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
            upcomingEventsList.innerHTML = upcoming.length ? upcoming.map(e => createEventCard(e, true)).join('') : emptyStateBlock('لا توجد فعاليات قادمة حالياً.', '📅');
            pastEventsList.innerHTML = past.length ? past.map(e => createEventCard(e, false)).join('') : emptyStateBlock('لا توجد فعاليات سابقة.', '🗓️');
            attachDynamicEventListeners();
            const allIds = eventsData.map(e => String(e.id));
            loadBulkCounts().then(d => {
                if (d) {
                    applyBulkCountsAll(allIds);
                } else {
                    allIds.forEach(id => {
                        fetchEventCounts(id);
                        if (currentUser) checkUserReaction(id);
                    });
                }
            });
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

                renderEventDetailsAttachments(eventData.attachments);

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
                    <p class="text-[#0e141b] text-base leading-relaxed whitespace-pre-wrap">${escapeHtml(eventData.description == null ? 'لا يوجد وصف تفصيلي لهذه الفعالية.' : String(eventData.description))}</p>
                     <div class="mt-6 pt-4 border-t border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-700 mb-2">التفاعلات:</h3>
                        <div class="flex items-center gap-2 text-slate-500 text-xs"> ${reactionButtonsHTML} </div>
                    </div>
                    ${ownerControlsHTML}`;

                const bulk = await loadBulkCounts();
                if (bulk) {
                    applyBulkCountsToEvent(eventData.id);
                } else {
                    await fetchEventCounts(eventData.id, true);
                    await checkUserReaction(eventData.id, true);
                }
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
                                <img src="${escapeHtml(commenterAvatarUrl)}" loading="lazy" data-placeholder="https://placehold.co/40x40/E0E0E0/B0B0B0?text=?" alt="${escapeHtml(commenterName)}" class="size-10 rounded-full shrink-0 object-cover">
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
                    await loadBulkCounts(true);
                    if (_bulkCountsCache) applyBulkCountsToEvent(eventId);
                } catch (error) {
                    showModalMessage(`فشل حذف التعليق: ${error.message}`, true);
                    console.error("Delete comment error:", error);
                }
            });
        }

        if (addCommentForm) {
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
                    if (_bulkCountsCache) {
                        const c = _bulkCountsCache.counts[currentEventId];
                        if (c) c.comments = (c.comments || 0) + 1;
                        applyBulkCountsToEvent(currentEventId);
                    }
                    await loadBulkCounts(true);
                    if (_bulkCountsCache) applyBulkCountsToEvent(currentEventId);
                } catch (error) {
                    showModalMessage(`فشل إضافة التعليق: ${error.message}`, true);
                    console.error("Add comment error:", error);
                }
            });
        }

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

                existingEventAttachments = normalizeAttachmentsData(eventToEdit.attachments).map(serializeAttachment);
                eventAttachmentsToUpload = [];
                attachmentIdsPendingDeletion = [];

                eventImageFilesInput.value = '';
                renderImagePreviews();
                renderAttachmentsPreview();

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

        [upcomingEventsList, pastEventsList].forEach((container) => {
            if (container) {
                container.addEventListener('click', (e) => {
                    const actionBtn = e.target.closest('[data-action]');
                    if (actionBtn && actionBtn.dataset.action === 'retry-events') {
                        loadEvents();
                    }
                });
            }
        });
