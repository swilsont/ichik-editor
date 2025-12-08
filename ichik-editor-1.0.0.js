/**
 * IchikEditor.js (c) 2025 Sebastian Wilson T. https://github.com/swilsont/ichik-editor
 * Licensed under the MIT License.
 * WYSIWYG editor that converts HTML to Markdown securely, without dependencies and with i18n.
 */
const IchikEditor = (function() {

    // ==============================================
    // 1. CONFIGURATION & STATIC DATA
    // ==============================================

    const EMOJI_LIST = [
        '😀','😁','😂','🤣','😉','😊',
        '🥰','😍','🤔','🤨','😐','😑',
        '😶','🙄','😏','😣','😥','😮',
        '😴','😫','😜','😎','😭','😱',
        '😡','👍','👎','👋','🙌','👏',
        '🤝','💪','🎉','✨','🔥','❤️',
        '🚀','⭐','💡','✅'
    ];

    // Default Text Labels.
    // Can be overwritten by passing a 'labels' object in the constructor.
    const DEFAULT_LABELS = {
        toolbar: {
            formats: {
                normal: 'Normal',
                h1: 'Heading 1',
                h2: 'Heading 2',
                h3: 'Heading 3',
                h4: 'Heading 4',
                h5: 'Heading 5',
                h6: 'Heading 6'
            },
            bold: '<strong>B</strong>',
            italic: '<em>I</em>',
            ul: '• Bullet List',
            ol: '1. Numbered List',
            hr: '—',
            link: '🔗 Link',
            image: '🖼️ Image',
            emoji: '😀 Emoji',
            clear: 'Clear format'
        },
        popups: {
            link: {
                title: 'Link URL',
                placeholder: 'https://...',
                cancel: 'Cancel',
                save: 'Save'
            },
            image: {
                titleUrl: 'Image URL',
                placeholderUrl: 'https://...',
                titleAlt: 'Description (Alt Text, optional)',
                placeholderAlt: 'Ex: Company Name\'s Logo',
                titleWidth: 'Width (Optional)',
                placeholderWidth: 'Ex: 300px or 100%',
                cancel: 'Cancel',
                insert: 'Insert',
                update: 'Update'
            }
        },
        alerts: {
            httpsRequired: 'For security reasons, only HTTPS URLs are allowed.',
            invalidProtocol: 'Protocol not allowed. Only HTTPS.'
        }
    };

    // Toolbar Structure. 'labelKey' refers to DEFAULT_LABELS keys.
    const TOOLBAR_SCHEMA = [
        {
            type: 'select',
            cmd: 'formatBlock',
            options: [
                { labelKey: 'normal', value: 'P' },
                { labelKey: 'h1', value: 'H1' },
                { labelKey: 'h2', value: 'H2' },
                { labelKey: 'h3', value: 'H3' },
                { labelKey: 'h4', value: 'H4' },
                { labelKey: 'h5', value: 'H5' },
                { labelKey: 'h6', value: 'H6' }
            ]
        },
        { type: 'button', labelKey: 'bold', cmd: 'bold' },
        { type: 'button', labelKey: 'italic', cmd: 'italic' },
        { type: 'separator' },
        { type: 'button', labelKey: 'ul', cmd: 'insertUnorderedList' },
        { type: 'button', labelKey: 'ol', cmd: 'insertOrderedList' },
        { type: 'button', labelKey: 'hr', cmd: 'insertHorizontalRule' },
        { type: 'separator' },
        { type: 'button', labelKey: 'emoji', cmd: 'toggleEmoji' },
        { type: 'button', labelKey: 'link', cmd: 'createLink' },
        { type: 'button', labelKey: 'image', cmd: 'customInsertImage' },
        { type: 'separator' },
        { type: 'button', labelKey: 'clear', cmd: 'removeFormat' }
    ];

    // ==============================================
    // 2. STATELESS HELPERS (Pure Utils)
    // ==============================================

    /**
     * Validates URLs to enforce HTTPS and avoid unsafe protocols (like javascript:).
     */
    function enforceHttps(inputUrl, messages) {
        if (!inputUrl) return null;
        let url = inputUrl.trim();
        if (url.toLowerCase().startsWith('https://')) return url;

        if (url.toLowerCase().startsWith('http://')) {
            alert(messages.httpsRequired);
            return null;
        }
        if (/^[a-zA-Z0-9\-\.]+:\/\//.test(url)) {
            alert(messages.invalidProtocol);
            return null;
        }
        return 'https://' + url;
    }

    /**
     * Sanitizes user text before converting to Markdown.
     * Prevents Stored XSS by converting <script> to &lt;script&gt;
     */
    function escapeHtml(text) {
        if (!text) return '';
        return  text.replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
    }

    /**
     * Positions a floating element (popup) ensuring it doesn't overflow the viewport.
     * Useful for mobile devices where menus might get cut off on the right side.
     */
    function smartPosition(triggerEl, popupEl, displayType) {
        popupEl.style.display = displayType; // 'flex' (form) or 'grid' (emoji)

        const rect = triggerEl.getBoundingClientRect();
        const popupWidth = popupEl.offsetWidth;
        const viewportWidth = window.innerWidth;
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        let left = rect.left + scrollX;
        let top = rect.bottom + scrollY + 6; // +6px vertical margin

        // If it overflows right...
        if (rect.left + popupWidth > viewportWidth - 10) {
            // ...align with the right edge of the button
            left = (rect.right + scrollX) - popupWidth;
        }
        // Safety for very narrow screens
        if (left < 10) left = 10;

        popupEl.style.left = left + 'px';
        popupEl.style.top = top + 'px';
    }

    /**
     * Recursive Parser: Traverses DOM tree and generates Markdown.
     */
    function parseToMd(node) {
        // Base Case: Text Node (Sanitized)
        if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent);

        let content = '';
        node.childNodes.forEach(child => content += parseToMd(child));

        switch (node.tagName) {
            case 'B': case 'STRONG': return `**${content}**`;
            case 'I': case 'EM':     return `*${content}*`;
            case 'H1': return `# ${content}\n\n`;
            case 'H2': return `## ${content}\n\n`;
            case 'H3': return `### ${content}\n\n`;
            case 'H4': return `#### ${content}\n\n`;
            case 'H5': return `##### ${content}\n\n`;
            case 'H6': return `###### ${content}\n\n`;
            case 'DIV': case 'P':  return content.trim() ? `${content}\n\n` : '';
            case 'BR': return `\n`;
            case 'UL': case 'OL': return `${content}\n`;
            case 'LI':
                const parent = node.parentElement;
                // Detect index if ordered list
                const index = parent.tagName === 'OL' ? (Array.from(parent.children).indexOf(node) + 1) + '. ' : '- ';
                return `${index}${content}\n`;
            case 'HR': return `\n---\n\n`;
            case 'A': return `[${content}](${node.getAttribute('href')})`;
            case 'IMG':
                const alt = node.getAttribute('alt') || '';
                const src = node.getAttribute('src');
                const width = node.getAttribute('width');
                // If width exists, use raw HTML. If not, standard Markdown.
                if (width) return `\n<img src="${src}" alt="${alt}" width="${width}">\n`;
                return `\n![${alt}](${src})\n`;
            default: return content;
        }
    }

    // ==============================================
    // 3. CORE LOGIC (Private functions with State)
    // ==============================================

    /**
     * Internal Constructor. Creates DOM and binds events.
     */
    function initEditor(inst) {
        inst.container.innerHTML = '';
        inst.container.classList.add('ichik-editor-container');

        // 1. Toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'ichik-toolbar';
        buildToolbar(inst, toolbar);
        inst.container.appendChild(toolbar);

        // 2. Editor
        inst.editorEl = document.createElement('div');
        inst.editorEl.className = 'ichik-editor';
        inst.editorEl.contentEditable = true;
        inst.editorEl.innerHTML = '';
        inst.container.appendChild(inst.editorEl);

        // 3. Floating UI
        createTooltip(inst);
        createEmojiPicker(inst);
        createFormPopup(inst);

        bindEvents(inst);
    }

    function buildToolbar(inst, toolbarEl) {
        TOOLBAR_SCHEMA.forEach(item => {
            // Select (Dropdown) Rendering
            if (item.type === 'select') {
                const select = document.createElement('select');
                select.dataset.cmd = item.cmd;
                item.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = inst.labels.toolbar.formats[opt.labelKey];
                    select.appendChild(option);
                });
                select.onchange = (e) => {
                    e.preventDefault();
                    document.execCommand(item.cmd, false, select.value);
                    inst.editorEl.focus();
                };
                inst.uiRefs.selects.push(select);
                toolbarEl.appendChild(select);

            // Button Rendering
            } else if (item.type === 'button') {
                const btn = document.createElement('button');
                btn.innerHTML = inst.labels.toolbar[item.labelKey];
                btn.dataset.cmd = item.cmd;
                btn.onclick = (e) => handleToolbarClick(inst, e, item, btn);
                inst.uiRefs.buttons.push(btn);
                toolbarEl.appendChild(btn);

            // Separator Rendering
            } else if (item.type === 'separator') {
                const sep = document.createElement('span');
                sep.style.cssText = 'width: 1px; height: 20px; background: #ccc; margin: 0 4px;';
                toolbarEl.appendChild(sep);
            }
        });
    }

    // --- POPUP SYSTEM ---

    function createFormPopup(inst) {
        inst.popupEl = document.createElement('div');
        inst.popupEl.className = 'ichik-popup';

        inst.popupEl.style.display = 'none';

        inst.popupEl.addEventListener('click', (e) => e.stopPropagation());
        document.body.appendChild(inst.popupEl);
    }

    /**
     * Opens a form popup (Link or Image).
     * Supports both new creation and existing node editing.
     */
    function openFormPopup(inst, type, triggerBtn, existingNode = null) {
        closeAllPopups(inst);
        saveSelection(inst); // Save cursor position

        let html = '';
        const labels = inst.labels.popups;

        if (type === 'link') {
            const currentUrl = existingNode ? existingNode.href : '';
            if (existingNode) selectNode(existingNode);

            html = `
                <label>${labels.link.title}</label>
                <input type="text" id="ichik-inp-url" value="${currentUrl}" placeholder="${labels.link.placeholder}">
                <div class="ichik-popup-actions">
                    <button id="ichik-btn-cancel" class="ichik-btn-cancel">${labels.link.cancel}</button>
                    <button id="ichik-btn-save" class="ichik-btn-save">${labels.link.save}</button>
                </div>
            `;
        }
        else if (type === 'image') {
            const currentUrl = existingNode ? existingNode.getAttribute('src') : '';
            const currentAlt = existingNode ? existingNode.getAttribute('alt') : '';
            const currentWidth = existingNode ? (existingNode.getAttribute('width') || '') : ''; // If no width, use empty string
            const btnText = existingNode ? labels.image.update : labels.image.insert;

            html = `
                <label>${labels.image.titleUrl}</label>
                <input type="text" id="ichik-inp-url" value="${currentUrl}" placeholder="${labels.image.placeholderUrl}">
                <label>${labels.image.titleAlt}</label>
                <input type="text" id="ichik-inp-alt" value="${currentAlt}" placeholder="${labels.image.placeholderAlt}">
                <label>${labels.image.titleWidth}</label>
                <input type="text" id="ichik-inp-width" value="${currentWidth}" placeholder="${labels.image.placeholderWidth}">
                <div class="ichik-popup-actions">
                    <button id="ichik-btn-cancel" class="ichik-btn-cancel">${labels.image.cancel}</button>
                    <button id="ichik-btn-save" class="ichik-btn-save">${btnText}</button>
                </div>
            `;
        }

        inst.popupEl.innerHTML = html;
        smartPosition(triggerBtn, inst.popupEl, 'flex');

        // Auto-focus on first input
        setTimeout(() => {
            const firstInput = inst.popupEl.querySelector('input');
            if(firstInput) firstInput.focus();
        }, 50);

        // Popup internal listeners
        inst.popupEl.querySelector('#ichik-btn-cancel').onclick = () => closeAllPopups(inst);

        inst.popupEl.querySelector('#ichik-btn-save').onclick = () => {
            const urlVal = inst.popupEl.querySelector('#ichik-inp-url').value;

            if (type === 'link') {
                restoreSelection(inst);
                if (!urlVal.trim()) {
                    document.execCommand('unlink', false, null); // Remove if empty
                } else {
                    const secureUrl = enforceHttps(urlVal, inst.labels.alerts);
                    if (secureUrl) document.execCommand('createLink', false, secureUrl);
                }
            }
            else if (type === 'image') {
                restoreSelection(inst);
                const secureUrl = enforceHttps(urlVal, inst.labels.alerts);

                if (secureUrl) {
                    const alt = inst.popupEl.querySelector('#ichik-inp-alt').value || '';
                    const w = inst.popupEl.querySelector('#ichik-inp-width').value || '';

                    if (existingNode) {
                        // Update existing
                        existingNode.setAttribute('src', secureUrl);
                        existingNode.setAttribute('alt', alt);
                        if (w && /^\d+(px|%)?$/.test(w)) existingNode.setAttribute('width', w);
                        else existingNode.removeAttribute('width');
                    } else {
                        // Insert new
                        const dummyImg = document.createElement('img');
                        dummyImg.setAttribute('src', secureUrl);
                        dummyImg.setAttribute('alt', alt);
                        if (w && /^\d+(px|%)?$/.test(w)) dummyImg.setAttribute('width', w);
                        document.execCommand('insertHTML', false, dummyImg.outerHTML);
                    }
                }
            }
            closeAllPopups(inst);
        };
    }

    function closeAllPopups(inst) {
        inst.emojiPickerEl.style.display = 'none';
        inst.popupEl.style.display = 'none';
        inst.editorEl.focus();
    }

    // --- TOOLBAR EVENT HANDLING ---

    function handleToolbarClick(inst, e, item, btn) {
        e.preventDefault();

        // Stop propagation so the global document click listener
        // doesn't immediately close the popup we just opened.
        if (['createLink', 'customInsertImage', 'toggleEmoji'].includes(item.cmd)) {
            e.stopPropagation();
        }

        if (item.cmd === 'createLink') {
            if (inst.popupEl.style.display === 'flex') closeAllPopups(inst);
            else {
                const linkNode = getLinkAtCursor(inst);
                openFormPopup(inst, 'link', btn, linkNode);
            }
        }
        else if (item.cmd === 'customInsertImage') {
            if (inst.popupEl.style.display === 'flex') closeAllPopups(inst);
            else {
                const imgNode = getImageAtCursor(inst);
                openFormPopup(inst, 'image', btn, imgNode);
            }
        }
        else if (item.cmd === 'toggleEmoji') {
            if (inst.emojiPickerEl.style.display === 'grid') {
                closeAllPopups(inst);
            } else {
                closeAllPopups(inst);
                saveSelection(inst);
                smartPosition(btn, inst.emojiPickerEl, 'grid'); // Explicitly set 'grid' for Emojis
            }
        }
        else if (item.cmd === 'removeFormat') {
            inst.editorEl.focus();
            document.execCommand('removeFormat', false, null);
            document.execCommand('formatBlock', false, 'P');
            document.execCommand('unlink', false, null);
            updateToolbarState(inst);
        }
        else {
            inst.editorEl.focus();
            document.execCommand(item.cmd, false, null);
            updateToolbarState(inst);
        }
    }

    function createEmojiPicker(inst) {
        inst.emojiPickerEl = document.createElement('div');
        inst.emojiPickerEl.className = 'ichik-emoji-picker';

        inst.emojiPickerEl.style.display = 'none';

        inst.emojiPickerEl.addEventListener('click', (e) => e.stopPropagation());

        EMOJI_LIST.forEach(emoji => {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.className = 'ichik-emoji-item';
            span.onclick = () => {
                restoreSelection(inst);
                document.execCommand('insertText', false, emoji);
                closeAllPopups(inst);
            };
            inst.emojiPickerEl.appendChild(span);
        });
        document.body.appendChild(inst.emojiPickerEl);
    }

    function createTooltip(inst) {
        inst.tooltipEl = document.createElement('div');
        inst.tooltipEl.className = 'ichik-tooltip';
        document.body.appendChild(inst.tooltipEl);
    }

    function updateToolbarState(inst) {
        // Update Buttons (Active state)
        inst.uiRefs.buttons.forEach(btn => {
            const cmd = btn.dataset.cmd;
            try {
                if (document.queryCommandState(cmd)) btn.classList.add('active');
                else btn.classList.remove('active');
            } catch (e) { }
        });
        // Update Selects (Detect H1, P, etc)
        inst.uiRefs.selects.forEach(select => {
            if (select.dataset.cmd === 'formatBlock') {
                let val = document.queryCommandValue('formatBlock');
                val = val ? val.toUpperCase() : 'P';
                if (val === 'DIV') val = 'P'; // Chrome quirk
                const exists = Array.from(select.options).some(o => o.value === val);
                if (exists) select.value = val;
            }
        });
    }

    function bindEvents(inst) {
        // Paste as plain text
        inst.editorEl.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
        });

        // Click on Image -> Select Node
        inst.editorEl.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                const range = document.createRange();
                range.selectNode(e.target);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                updateToolbarState(inst);
            }
        });

        // Update toolbar state on navigation
        inst.editorEl.addEventListener('keyup', () => updateToolbarState(inst));
        inst.editorEl.addEventListener('mouseup', () => updateToolbarState(inst));

        // Global listener to close popups.
        document.addEventListener('click', () => {
            if (inst.emojiPickerEl.style.display !== 'none' || inst.popupEl.style.display !== 'none') {
                closeAllPopups(inst);
            }
        });

        // Tooltip hover
        inst.editorEl.addEventListener('mousemove', (e) => {
            let target = e.target;
            if (target.nodeType === 3) target = target.parentNode;
            const link = target.closest ? target.closest('a') : null;
            if (link && inst.editorEl.contains(link)) {
                inst.tooltipEl.textContent = `🔗 ${link.getAttribute('href')}`;
                inst.tooltipEl.style.display = 'block';
                inst.tooltipEl.style.left = (e.clientX + 15) + 'px';
                inst.tooltipEl.style.top = (e.clientY + 15) + 'px';
            } else {
                inst.tooltipEl.style.display = 'none';
            }
        });
        inst.editorEl.addEventListener('mouseleave', () => inst.tooltipEl.style.display = 'none');
    }

    // --- SELECTION UTILS ---

    function getLinkAtCursor(inst) {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            let node = sel.anchorNode;
            while (node && node !== inst.editorEl) {
                if (node.tagName === 'A') return node;
                node = node.parentNode;
            }
        }
        return null;
    }

    function getImageAtCursor(inst) {
        const sel = window.getSelection();
        if (sel.rangeCount === 0) return null;

        const range = sel.getRangeAt(0);
        // Direct case
        if (sel.anchorNode && sel.anchorNode.tagName === 'IMG') return sel.anchorNode;
        // Container range case (Common in Chrome)
        if (range.startContainer === range.endContainer &&
            range.endOffset - range.startOffset === 1) {
            const node = range.startContainer.childNodes[range.startOffset];
            if (node && node.tagName === 'IMG') return node;
        }
        return null;
    }

    function selectNode(node) {
        const range = document.createRange();
        range.selectNode(node);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    /**
     * Saves the current selection.
     * If the selection is NOT inside this editor instance, it claims focus.
     */
    function saveSelection(inst) {
        const sel = window.getSelection();
        const isSelectionInside = sel.rangeCount > 0 && inst.editorEl.contains(sel.anchorNode);
        if (isSelectionInside) {
            inst.savedSelection = sel.getRangeAt(0);
        } else {
            inst.editorEl.focus();
            const range = document.createRange();
            range.selectNodeContents(inst.editorEl);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            inst.savedSelection = range;
        }
    }

    function restoreSelection(inst) {
        inst.editorEl.focus();
        if (inst.savedSelection) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(inst.savedSelection);
        }
    }

    // --- OBJECT MERGE UTILS (For Options) ---
    function deepMerge(target, source) {
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], deepMerge(target[key], source[key]));
            }
        }
        Object.assign(target || {}, source);
        return target;
    }

    // ==============================================
    // 4. PUBLIC API
    // ==============================================

    class Editor {
        constructor(idOrSelector, options = {}) {
            let el = document.getElementById(idOrSelector);
            if (!el) el = document.querySelector(idOrSelector);
            if (!el) throw new Error(`IchikEditor: Element not found (${idOrSelector})`);

            this.container = el;

            // Merge labels configuration for i18n
            this.labels = JSON.parse(JSON.stringify(DEFAULT_LABELS));
            if (options.labels) {
                deepMerge(this.labels, options.labels);
            }

            this.editorEl = null;
            this.tooltipEl = null;
            this.emojiPickerEl = null;
            this.popupEl = null;
            this.savedSelection = null;
            this.uiRefs = { buttons: [], selects: [] };

            initEditor(this);
        }

        getMarkdown() { return parseToMd(this.editorEl).trim(); }
        getHTML() { return this.editorEl.innerHTML.trim(); }
        setHTML(html) { if(this.editorEl) this.editorEl.innerHTML = html; }
    }

    return Editor;

})();