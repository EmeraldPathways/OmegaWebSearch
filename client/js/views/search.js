import { search } from '../api.js';
import { showView, showLoading, showToast } from '../nav.js';
import { renderResults } from './results.js';

const form = document.getElementById('search-form');
const qInput = document.getElementById('q');
const countrySelect = document.getElementById('countryCode');
const languageSelect = document.getElementById('languageCode');

export let currentQuery = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await doSearch({
    q: qInput.value.trim(),
    countryCode: countrySelect.value,
    languageCode: languageSelect.value,
    page: 0,
  });
});

export async function doSearch({ q, countryCode, languageCode, page }) {
  if (!q) return;
  showLoading(true);
  try {
    const data = await search({ q, page, countryCode, languageCode });
    currentQuery = { q, countryCode, languageCode };
    renderResults(data, currentQuery, page);
    showView('view-results');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    showLoading(false);
  }
}
