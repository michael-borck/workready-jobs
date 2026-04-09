/* WorkReady Jobs — client-side filtering and rendering */

(function () {
    'use strict';

    var searchInput = document.getElementById('search');
    var sectorSelect = document.getElementById('sector');
    var companySelect = document.getElementById('company');
    var typeSelect = document.getElementById('type');
    var jobList = document.getElementById('job-list');
    var jobCount = document.getElementById('job-count');
    var totalCount = document.getElementById('total-count');
    var clearBtn = document.getElementById('clear-filters');

    // Populate filter dropdowns
    function populateSelect(el, items) {
        items.forEach(function (item) {
            var opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            el.appendChild(opt);
        });
    }

    populateSelect(sectorSelect, SECTORS);
    populateSelect(companySelect, COMPANIES);
    populateSelect(typeSelect, TYPES);

    totalCount.textContent = JOBS_DATA.length;

    // Filter jobs
    function getFiltered() {
        var query = searchInput.value.toLowerCase().trim();
        var sector = sectorSelect.value;
        var company = companySelect.value;
        var type = typeSelect.value;

        return JOBS_DATA.filter(function (job) {
            if (sector && job.sector !== sector) return false;
            if (company && job.company !== company) return false;
            if (type && job.employment_type !== type) return false;
            if (query) {
                var haystack = (
                    job.title + ' ' +
                    job.company + ' ' +
                    job.department + ' ' +
                    job.sector + ' ' +
                    job.employment_type
                ).toLowerCase();
                if (haystack.indexOf(query) === -1) return false;
            }
            return true;
        });
    }

    // Render job cards
    function render() {
        var jobs = getFiltered();
        jobCount.textContent = jobs.length;

        if (jobs.length === 0) {
            jobList.innerHTML =
                '<div class="no-results">' +
                '<h3>No jobs match your filters</h3>' +
                '<p>Try broadening your search or clearing filters.</p>' +
                '</div>';
            return;
        }

        var html = '';
        jobs.forEach(function (job) {
            html +=
                '<div class="job-card">' +
                '  <div class="job-card-header">' +
                '    <div>' +
                '      <h3><a href="' + escapeHtml(job.url) + '" target="_blank">' + escapeHtml(job.title) + '</a></h3>' +
                '      <div class="job-company"><a href="' + escapeHtml(job.company_url) + '" target="_blank">' + escapeHtml(job.company) + '</a></div>' +
                '    </div>' +
                '    <span class="job-sector">' + escapeHtml(job.sector) + '</span>' +
                '  </div>' +
                '  <div class="job-meta">' +
                (job.department ? '    <span class="job-tag"><span class="job-tag-icon">&#128188;</span> ' + escapeHtml(job.department) + '</span>' : '') +
                (job.location ? '    <span class="job-tag"><span class="job-tag-icon">&#128205;</span> ' + escapeHtml(job.location) + '</span>' : '') +
                '    <span class="job-tag"><span class="job-tag-icon">&#128336;</span> ' + escapeHtml(job.employment_type) + '</span>' +
                '  </div>' +
                '  <div class="job-card-actions">' +
                '    <a href="' + escapeHtml(job.url) + '" target="_blank" class="btn btn-apply">Apply on Company Site</a>' +
                '    <a href="' + escapeHtml(job.company_url) + '" target="_blank" class="btn btn-secondary">View Company</a>' +
                '  </div>' +
                '</div>';
        });

        jobList.innerHTML = html;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Event listeners
    searchInput.addEventListener('input', render);
    sectorSelect.addEventListener('change', render);
    companySelect.addEventListener('change', render);
    typeSelect.addEventListener('change', render);

    clearBtn.addEventListener('click', function () {
        searchInput.value = '';
        sectorSelect.value = '';
        companySelect.value = '';
        typeSelect.value = '';
        render();
    });

    // Initial render
    render();
})();
