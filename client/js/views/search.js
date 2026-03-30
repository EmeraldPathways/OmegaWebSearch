import { search } from '../api.js';
import { showView, showLoading, showToast } from '../nav.js';
import { renderAllResults } from './results.js';

const form = document.getElementById('search-form');
const textarea = document.getElementById('queries');

// Hardcoded: Ireland (IE) / English (EN)
const COUNTRY_CODE = 'ie';
const LANGUAGE_CODE = 'en';
const MAX_QUERIES = 10;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const queries = textarea.value
    .split('\n')
    .map(q => q.trim())
    .filter(q => q.length > 0)
    .slice(0, MAX_QUERIES);
  
  if (queries.length === 0) {
    showToast('Enter at least one search query.', 'error');
    return;
  }

  showLoading(true);
  try {
    const settled = await Promise.allSettled(
      queries.map(q => search({ q, page: 0, countryCode: COUNTRY_CODE, languageCode: LANGUAGE_CODE }))
    );
    
    const results = settled.map((outcome, i) => ({
      query: queries[i],
      data: outcome.status === 'fulfilled' ? outcome.value : null,
      error: outcome.status === 'rejected' ? outcome.reason.message : null,
    }));
    
    renderAllResults(results);
    showView('view-results');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    showLoading(false);
  }
});
