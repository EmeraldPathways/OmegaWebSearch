import { search } from '../api.js';
import { showView, showLoading, showToast } from '../nav.js';
import { renderAllResults } from './results.js';

const form = document.getElementById('search-form');
const inputs = ['q1','q2','q3','q4','q5'].map(id => document.getElementById(id));
const countrySelect = document.getElementById('countryCode');
const languageSelect = document.getElementById('languageCode');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const queries = inputs
    .map(i => i.value.trim())
    .filter(q => q.length > 0);
  
  if (queries.length === 0) {
    showToast('Enter at least one search query.', 'error');
    return;
  }

  showLoading(true);
  try {
    const settled = await Promise.allSettled(
      queries.map(q => search({ q, page: 0, countryCode: countrySelect.value, languageCode: languageSelect.value }))
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
