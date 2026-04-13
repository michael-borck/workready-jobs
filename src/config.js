/* seek.jobs — runtime configuration */

window.SEEK_CONFIG = {
    API_BASE: localStorage.getItem('workready_api_base') || 'https://workready-api.eduserver.au',
    PORTAL_URL: 'https://workready.eduserver.au',
    // Career Compass is a local Electron app — this URL is the
    // landing/install page, not a working web tool. We can't deep-link
    // into a specific page (no protocol handler), so the nudge is
    // text-only with this fallback for students who don't have it yet.
    CAREER_COMPASS_URL: 'https://borck.education/career-compass/',
};

// Company-level sector fallback — used when a posting has no department
// (e.g. confidential agency listings).
window.SECTOR_MAP = {
    'nexuspoint-systems': 'Technology & Cyber',
    'ironvale-resources': 'Mining & Resources',
    'meridian-advisory': 'Operations & Strategy',
    'metro-council-wa': 'Government & Public Sector',
    'southern-cross-financial': 'Finance & Accounting',
    'horizon-foundation': 'Community & Engagement',
};

// Department → sector. Inferring sector per-job (rather than per-company)
// makes the filter genuinely useful: a finance grad sees finance roles
// across IronVale, Horizon, Southern Cross AND Metro Council, not just
// "Financial Services" companies.
window.DEPT_SECTOR = {
    // IronVale Resources
    'Mine Operations': 'Mining & Resources',
    'Sustainability & Environment': 'Sustainability & Environment',
    'Technology & Innovation': 'Technology & Cyber',
    'People & Community': 'Community & Engagement',
    'Finance': 'Finance & Accounting',

    // NexusPoint Systems
    'Cybersecurity': 'Technology & Cyber',
    'Service Delivery': 'Technology & Cyber',
    'Solutions Architecture': 'Technology & Cyber',
    'Operations': 'Operations & Strategy',
    'Business Development': 'Marketing & Communications',

    // Horizon Foundation
    'Programs': 'Community & Engagement',
    'Fundraising & Partnerships': 'Marketing & Communications',
    'Finance & Operations': 'Finance & Accounting',

    // Southern Cross Financial
    'Financial Planning': 'Finance & Accounting',
    'Compliance & Risk': 'Legal & Compliance',
    'Client Experience': 'Marketing & Communications',
    'Client Experience & Marketing': 'Marketing & Communications',

    // Metro Council WA
    'Digital & Information Services': 'Technology & Cyber',
    'Planning & Development': 'Government & Public Sector',
    'People, Culture & Community': 'Community & Engagement',
    'Corporate Services': 'Finance & Accounting',
    'Parks & Sustainability': 'Sustainability & Environment',

    // Meridian Advisory
    'Consulting': 'Operations & Strategy',
    'Strategy Practice': 'Operations & Strategy',
    'Operations & Digital Practice': 'Operations & Strategy',
};

// Resolve a sector for a posting. Tries department first, then falls back
// to the company-level mapping. Confidential agency listings without a
// company_slug get 'Other'.
window.inferSector = function (posting) {
    if (posting.department && window.DEPT_SECTOR[posting.department]) {
        return window.DEPT_SECTOR[posting.department];
    }
    if (posting.company_slug && window.SECTOR_MAP[posting.company_slug]) {
        return window.SECTOR_MAP[posting.company_slug];
    }
    return 'Other';
};
