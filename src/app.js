/* seek.jobs — API-driven job board */

(function () {
    'use strict';

    var CONFIG = window.SEEK_CONFIG;
    var inferSector = window.inferSector || function (p) {
        return (window.SECTOR_MAP || {})[p.company_slug] || 'Other';
    };
    var state = {
        email: null,
        postings: [],
        blockedCompanies: [],
        blockedJobs: [],   // [{company_slug, job_slug}, ...]
        activeApplications: [],  // postings the student is currently mid-application on
    };

    var $ = function (id) { return document.getElementById(id); };
    var els = {
        signedInAs: $('signed-in-as'),
        userEmail: $('user-email'),
        portalLink: $('portal-link'),
        signinBtn: $('signin-btn'),
        searchInput: $('search'),
        sectorSelect: $('sector'),
        typeSelect: $('type'),
        showBlocked: $('show-blocked'),
        clearBtn: $('clear-filters'),
        jobCount: $('job-count'),
        totalCount: $('total-count'),
        jobList: $('job-list'),
        signinModal: $('signin-modal'),
        signinForm: $('signin-form'),
        signinEmail: $('signin-email'),
        applyModal: $('apply-modal'),
        applyForm: $('apply-form'),
        applyTitle: $('apply-title'),
        applySubtitle: $('apply-subtitle'),
        applyPostingId: $('apply-posting-id'),
        applyName: $('apply-name'),
        applyEmail: $('apply-email'),
        applyCover: $('apply-cover'),
        applyResume: $('apply-resume'),
        applyResult: $('apply-result'),
    };

    // --- API helpers ---
    function api(path) {
        return fetch(CONFIG.API_BASE + path).then(function (r) {
            if (!r.ok) throw new Error('API error: ' + r.status);
            return r.json();
        });
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Render markdown to HTML for the expanded card detail view. Tiny inline
    // converter — no external library. Handles the subset our descriptions
    // actually use: headings, bold, italic, inline code, paragraphs, bulleted
    // and numbered lists. All content is HTML-escaped first.
    function renderMarkdown(text) {
        if (!text) return '';

        var lines = text.split('\n');
        var html = '';
        var inList = null; // 'ul' | 'ol' | null
        var paraBuf = [];

        function flushPara() {
            if (paraBuf.length) {
                html += '<p>' + inlineMd(paraBuf.join(' ')) + '</p>';
                paraBuf = [];
            }
        }
        function closeList() {
            if (inList) { html += '</' + inList + '>'; inList = null; }
        }

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            if (/^\s*$/.test(line)) {
                flushPara();
                closeList();
                continue;
            }

            var hMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (hMatch) {
                flushPara();
                closeList();
                var level = Math.min(hMatch[1].length + 1, 6); // # → h2
                html += '<h' + level + '>' + inlineMd(hMatch[2]) + '</h' + level + '>';
                continue;
            }

            var ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
            if (ulMatch) {
                flushPara();
                if (inList !== 'ul') { closeList(); html += '<ul>'; inList = 'ul'; }
                html += '<li>' + inlineMd(ulMatch[1]) + '</li>';
                continue;
            }

            var olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
            if (olMatch) {
                flushPara();
                if (inList !== 'ol') { closeList(); html += '<ol>'; inList = 'ol'; }
                html += '<li>' + inlineMd(olMatch[1]) + '</li>';
                continue;
            }

            closeList();
            paraBuf.push(line.trim());
        }
        flushPara();
        closeList();
        return html;
    }

    function inlineMd(text) {
        // HTML-escape first, then apply inline markdown (asterisks/underscores
        // survive escaping unchanged so the regex still matches).
        var s = String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        return s
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/__([^_]+)__/g, '<strong>$1</strong>')
            .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    // Strip markdown for the card preview. The API returns the full markdown
    // body as listing_description, which starts with a `# Title` and a metadata
    // block (`**Department:**`, `**Reports to:**`, ...). We try to skip past
    // that to a real prose section, then strip remaining markdown markers and
    // truncate at a word boundary.
    function stripMarkdownPreview(text, maxLen) {
        if (!text) return '';

        // Skip past the metadata block by finding the first body section heading
        var match = text.match(
            /##+\s+(?:About|Role|Overview|Position|Description|Summary|The\s+Role|Key)[^\n]*\n+([\s\S]*)/i
        );
        var content = match ? match[1] : text;

        var s = content
            .replace(/^#{1,6}\s+.+$/gm, '')           // headings
            .replace(/\*\*([^*]+)\*\*/g, '$1')        // bold
            .replace(/__([^_]+)__/g, '$1')            // bold (underscore)
            .replace(/\*([^*\n]+)\*/g, '$1')          // italic
            .replace(/`([^`]+)`/g, '$1')              // inline code
            .replace(/!?\[([^\]]+)\]\([^)]+\)/g, '$1') // links / images
            .replace(/^\s*[-*+]\s+/gm, '')            // bullet markers
            .replace(/^\s*\d+\.\s+/gm, '')            // numbered list markers
            .replace(/\s+/g, ' ')                     // collapse whitespace
            .trim();

        if (s.length > maxLen) {
            s = s.substring(0, maxLen).replace(/\s+\S*$/, '') + '…';
        }
        return s;
    }

    // --- Sign-in ---
    function signIn(email) {
        state.email = email;
        localStorage.setItem('seekjobs_email', email);
        renderUserBar();
        loadAll();
    }

    function signOut() {
        state.email = null;
        localStorage.removeItem('seekjobs_email');
        renderUserBar();
        loadAll();
    }

    function renderUserBar() {
        if (state.email) {
            els.signedInAs.classList.remove('hidden');
            els.portalLink.classList.remove('hidden');
            els.userEmail.textContent = state.email;
            els.signinBtn.textContent = 'Sign out';
        } else {
            els.signedInAs.classList.add('hidden');
            els.portalLink.classList.add('hidden');
            els.signinBtn.textContent = 'Sign in';
        }
    }

    // --- Data loading ---
    function loadAll() {
        // Postings
        var postingsUrl = '/api/v1/postings';
        if (state.email) postingsUrl += '?email=' + encodeURIComponent(state.email);

        var postingsP = api(postingsUrl);
        var statePromise = state.email
            ? api('/api/v1/student/' + encodeURIComponent(state.email) + '/state')
                .catch(function () { return null; })
            : Promise.resolve(null);

        Promise.all([postingsP, statePromise])
            .then(function (results) {
                state.postings = results[0].postings || [];
                var studentState = results[1];
                if (studentState) {
                    state.blockedCompanies = studentState.blocked_companies || [];
                    state.blockedJobs = studentState.blocked_jobs || [];
                    state.activeApplications = (studentState.applications || [])
                        .filter(function (a) { return a.status === 'active'; })
                        .map(function (a) { return [a.company_slug, a.job_slug].join('|'); });
                } else {
                    state.blockedCompanies = [];
                    state.blockedJobs = [];
                    state.activeApplications = [];
                }
                populateFilters();
                render();
            })
            .catch(function (err) {
                console.error('Failed to load:', err);
                els.jobList.innerHTML = '<div class="error">Could not connect to the WorkReady API.</div>';
            });
    }

    function populateFilters() {
        // Compute filter options from the postings — sector is now inferred
        // per-job (from department) so a single company can span multiple
        // disciplines. Company filter is gone; use the search bar instead.
        var sectors = {};
        var types = {};
        state.postings.forEach(function (p) {
            sectors[inferSector(p)] = true;
            if (p.employment_type) types[p.employment_type] = true;
        });

        function fillSelect(el, items) {
            var current = el.value;
            while (el.options.length > 1) el.remove(1);
            Object.keys(items).sort().forEach(function (item) {
                var opt = document.createElement('option');
                opt.value = item;
                opt.textContent = item;
                el.appendChild(opt);
            });
            if (current) el.value = current;
        }

        fillSelect(els.sectorSelect, sectors);
        fillSelect(els.typeSelect, types);
    }

    // --- Blocking checks ---
    function isBlocked(posting) {
        if (!posting.company_slug) return false;  // confidential — can't tell, allow
        if (state.blockedCompanies.indexOf(posting.company_slug) !== -1) return true;
        var key = posting.company_slug + '|' + (posting.job_slug || '');
        if (state.blockedJobs.some(function (b) {
            return b.company_slug === posting.company_slug
                && b.job_slug === posting.job_slug;
        })) return true;
        return false;
    }

    function isAlreadyApplied(posting) {
        if (!posting.company_slug || !posting.job_slug) return false;
        var key = posting.company_slug + '|' + posting.job_slug;
        return state.activeApplications.indexOf(key) !== -1;
    }

    function blockedReason(posting) {
        if (state.blockedCompanies.indexOf(posting.company_slug) !== -1) {
            return 'No longer accepting applications from you (company-wide)';
        }
        return 'Your application for this role was unsuccessful';
    }

    // --- Filtering ---
    function getFiltered() {
        var query = els.searchInput.value.toLowerCase().trim();
        var sector = els.sectorSelect.value;
        var type = els.typeSelect.value;
        var showBlocked = els.showBlocked.checked;

        return state.postings.filter(function (p) {
            var blocked = isBlocked(p);
            if (!showBlocked && blocked) return false;

            if (sector && inferSector(p) !== sector) return false;
            if (type && p.employment_type !== type) return false;
            if (query) {
                var haystack = (
                    p.listing_title + ' ' +
                    (p.company_name || '') + ' ' +
                    (p.agency_name || '') + ' ' +
                    (p.department || '') + ' ' +
                    (p.employment_type || '')
                ).toLowerCase();
                if (haystack.indexOf(query) === -1) return false;
            }
            return true;
        });
    }

    // --- Render ---
    function render() {
        var postings = getFiltered();
        els.jobCount.textContent = postings.length;
        els.totalCount.textContent = state.postings.length;

        if (postings.length === 0) {
            els.jobList.innerHTML =
                '<div class="no-results"><h3>No jobs match your filters</h3>' +
                '<p>Try broadening your search or clearing filters.</p></div>';
            return;
        }

        var html = '';
        postings.forEach(function (p) {
            html += renderPostingCard(p);
        });
        els.jobList.innerHTML = html;

        // Bind apply buttons
        els.jobList.querySelectorAll('[data-apply]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();  // don't toggle card expansion
                var postingId = parseInt(btn.getAttribute('data-apply'), 10);
                var p = state.postings.find(function (x) { return x.id === postingId; });
                if (p) openApplyModal(p);
            });
        });

        // Bind clickable company-name links — set the search filter to that
        // company. Replaces the old Company filter dropdown with a one-click
        // pivot from any card.
        els.jobList.querySelectorAll('[data-filter-company]').forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();  // don't toggle card expansion
                els.searchInput.value = link.getAttribute('data-filter-company');
                render();
                els.searchInput.focus();
            });
        });

        // Bind card expand/collapse on cards that have a detail section
        els.jobList.querySelectorAll('.job-card[tabindex="0"]').forEach(function (card) {
            card.addEventListener('click', function (e) {
                // Don't toggle if click was on/inside the actions row or a link
                if (e.target.closest('.job-card-actions')) return;
                if (e.target.tagName === 'A') return;
                toggleCard(card);
            });
            card.addEventListener('keydown', function (e) {
                if (e.target !== card) return;  // only when card itself has focus
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCard(card);
                }
            });
        });
    }

    function toggleCard(card) {
        var nowExpanded = card.classList.toggle('expanded');
        card.setAttribute('aria-expanded', nowExpanded ? 'true' : 'false');
    }

    function renderPostingCard(p) {
        var blocked = isBlocked(p);
        var alreadyApplied = isAlreadyApplied(p);
        var classes = 'job-card';
        if (p.confidential) classes += ' job-card-confidential';
        if (p.source_type === 'agency') classes += ' job-card-agency';
        if (blocked) classes += ' job-card-blocked';

        // What name to display
        var displayCompany;
        var sector = inferSector(p);
        if (p.confidential) {
            displayCompany = '<span class="company-confidential">Confidential client</span>';
        } else if (p.company_name) {
            // Clickable — sets the search filter to the company name
            displayCompany =
                '<a href="#" class="company-link" data-filter-company="' +
                escapeHtml(p.company_name) + '">' + escapeHtml(p.company_name) + '</a>';
        }

        var sourceTag = '';
        if (p.source_type === 'agency') {
            sourceTag = '<span class="source-tag source-tag-agency">via ' +
                escapeHtml(p.agency_name || 'Recruitment Agency') + '</span>';
        }

        var locationLine = p.location || 'Perth, WA';

        var actions;
        if (blocked) {
            actions = '<div class="job-card-blocked-msg">&#128274; ' +
                escapeHtml(blockedReason(p)) + '</div>';
        } else if (alreadyApplied) {
            actions = '<div class="job-card-applied-msg">&#9203; Application under review</div>';
        } else {
            var btns = [];
            if (p.apply_url && p.source_type === 'direct') {
                btns.push('<a href="' + escapeHtml(p.apply_url) + '" target="_blank" class="btn btn-secondary">Apply on company site</a>');
            }
            btns.push('<button class="btn btn-apply" data-apply="' + p.id + '">Quick Apply</button>');
            actions = '<div class="job-card-actions">' + btns.join('') + '</div>';
        }

        var hasDetail = !!p.listing_description;
        return (
            '<article class="' + classes + '"' + (hasDetail ? ' tabindex="0" aria-expanded="false"' : '') + '>' +
            '  <div class="job-card-header">' +
            '    <div>' +
            '      <h3 class="job-title">' + escapeHtml(p.listing_title) + '</h3>' +
            (displayCompany ? '      <div class="job-company">' + displayCompany + '</div>' : '') +
            '    </div>' +
            (sector ? '    <span class="job-sector">' + escapeHtml(sector) + '</span>' : '') +
            '  </div>' +
            (sourceTag ? '  <div class="job-source">' + sourceTag + '</div>' : '') +
            '  <div class="job-meta">' +
            (p.department ? '    <span class="job-tag">&#128188; ' + escapeHtml(p.department) + '</span>' : '') +
            '    <span class="job-tag">&#128205; ' + escapeHtml(locationLine) + '</span>' +
            (p.employment_type ? '    <span class="job-tag">&#128336; ' + escapeHtml(p.employment_type) + '</span>' : '') +
            '  </div>' +
            (p.listing_description ? '  <p class="job-description">' + escapeHtml(stripMarkdownPreview(p.listing_description, 200)) + '</p>' : '') +
            (p.listing_description ? '  <div class="job-card-toggle-hint" aria-hidden="true"></div>' : '') +
            (p.listing_description ? '  <div class="job-card-detail"><div class="job-card-detail-prose">' + renderMarkdown(p.listing_description) + '</div></div>' : '') +
            '  ' + actions +
            '</article>'
        );
    }

    // --- Modals ---
    function openModal(modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    function openApplyModal(posting) {
        els.applyPostingId.value = posting.id;
        var displayName = posting.confidential
            ? 'Confidential client'
            : (posting.company_name || posting.listing_title);
        els.applyTitle.textContent = 'Apply: ' + posting.listing_title;
        els.applySubtitle.textContent = posting.source_type === 'agency'
            ? 'Via ' + (posting.agency_name || 'recruitment agency') + ' for ' + displayName
            : 'Direct application to ' + displayName;
        if (state.email) els.applyEmail.value = state.email;
        els.applyResult.classList.add('hidden');
        // The "get it" link in the Career Compass nudge points at the
        // install/landing page — Career Compass is a local Electron app,
        // so we can't deep-link into a specific page from the browser.
        var ccLink = document.getElementById('apply-cc-link');
        if (ccLink) {
            ccLink.href = (window.SEEK_CONFIG && window.SEEK_CONFIG.CAREER_COMPASS_URL)
                || 'https://borck.education/career-compass/';
        }
        openModal(els.applyModal);
    }

    function submitApplication(e) {
        e.preventDefault();
        var fd = new FormData();
        fd.append('posting_id', els.applyPostingId.value);
        fd.append('job_title', '');  // server resolves from posting
        fd.append('applicant_name', els.applyName.value);
        fd.append('applicant_email', els.applyEmail.value);
        fd.append('cover_letter', els.applyCover.value);
        fd.append('source', 'seek');
        fd.append('resume', els.applyResume.files[0]);

        var btn = els.applyForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Submitting...';
        els.applyResult.classList.add('hidden');

        fetch(CONFIG.API_BASE + '/api/v1/resume', { method: 'POST', body: fd })
            .then(function (r) {
                if (r.ok) return r.json();
                throw new Error('Submission failed');
            })
            .then(function () {
                els.applyResult.className = 'apply-result apply-success';
                els.applyResult.textContent =
                    'Application submitted. Check your WorkReady inbox for the outcome.';
                els.applyResult.classList.remove('hidden');
                els.applyForm.reset();
                // If the student has signed in, also use their email
                if (!state.email) signIn(els.applyEmail.value);
                // Reload to refresh blocked state
                setTimeout(loadAll, 500);
            })
            .catch(function (err) {
                els.applyResult.className = 'apply-result apply-error';
                els.applyResult.textContent = err.message;
                els.applyResult.classList.remove('hidden');
            })
            .finally(function () {
                btn.disabled = false;
                btn.textContent = 'Submit Application';
            });
    }

    // --- Event bindings ---
    els.searchInput.addEventListener('input', render);
    els.sectorSelect.addEventListener('change', render);
    els.typeSelect.addEventListener('change', render);
    els.showBlocked.addEventListener('change', render);

    els.clearBtn.addEventListener('click', function () {
        els.searchInput.value = '';
        els.sectorSelect.value = '';
        els.typeSelect.value = '';
        els.showBlocked.checked = true;
        render();
    });

    els.signinBtn.addEventListener('click', function () {
        if (state.email) signOut();
        else openModal(els.signinModal);
    });

    els.signinForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = els.signinEmail.value.trim();
        if (email) {
            signIn(email);
            closeModal(els.signinModal);
        }
    });

    els.applyForm.addEventListener('submit', submitApplication);

    document.querySelectorAll('[data-close]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var modal = btn.closest('.modal');
            if (modal) closeModal(modal);
        });
    });

    // Click outside modal closes it
    document.querySelectorAll('.modal').forEach(function (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal(modal);
        });
    });

    // ESC closes any open modal
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal:not(.hidden)').forEach(closeModal);
        }
    });

    // --- Initial load ---
    // Pick up email from URL query param (?student=) first, then localStorage
    var urlParams = new URLSearchParams(window.location.search);
    var queryEmail = urlParams.get('student');
    var savedEmail = localStorage.getItem('seekjobs_email');
    var initialEmail = queryEmail || savedEmail;

    if (initialEmail) {
        state.email = initialEmail;
        if (queryEmail) {
            localStorage.setItem('seekjobs_email', queryEmail);
            // Clean the URL so the email isn't visible
            window.history.replaceState({}, '', window.location.pathname);
        }
    }

    renderUserBar();
    loadAll();
})();
