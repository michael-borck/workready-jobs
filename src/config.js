/* seek.jobs — runtime configuration */

window.SEEK_CONFIG = {
    API_BASE: localStorage.getItem('workready_api_base') || 'https://workready-api.eduserver.au',
    PORTAL_URL: 'https://workready.eduserver.au',
};

// Sector mapping (used for filtering — could be returned by API later)
window.SECTOR_MAP = {
    'nexuspoint-systems': 'Technology',
    'ironvale-resources': 'Resources & Mining',
    'meridian-advisory': 'Management Consulting',
    'metro-council-wa': 'Government',
    'southern-cross-financial': 'Financial Services',
    'horizon-foundation': 'Not-for-profit',
};
