import { showView, showLoading, showToast, escHtml } from '../nav.js';
import { doSearch, currentQuery } from './search.js';

const container = document.getElementById('results-container');
const countEl = document.getElementById('results-count');
const resultsQInput = document.getElementById('results-q');
const resultsSearchBtn = document.getElementById('results-search-btn');
const btnBack = document.getElementById('btn-back');

btnBack.addEventListener('click', () => showView('view-search'));

resultsSearchBtn.addEventListener('click', () => {
  const q = resultsQInput.value.trim();
  if (!q || !currentQuery) return;
  doSearch({ ...currentQuery, q, page: 0 });
});

resultsQInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') resultsSearchBtn.click();
});

export function renderResults(data, query, page) {
  resultsQInput.value = query.q;
  container.innerHTML = '';
  countEl.textContent = data.resultsCountText ?? '';

  if (data.featuredSnippet) {
    container.appendChild(buildFeaturedSnippet(data.featuredSnippet));
  }

  for (const result of data.organicResults ?? []) {
    container.appendChild(buildResultCard(result));
  }

  container.appendChild(buildPagination(data, query, page));

  if (data.peopleAlsoAsk?.length) {
    container.appendChild(buildPAA(data.peopleAlsoAsk));
  }

  if (data.relatedQueries?.length) {
    container.appendChild(buildRelated(data.relatedQueries, query));
  }
}

function buildFeaturedSnippet(snippet) {
  const div = document.createElement('div');
  div.className = 'featured-snippet';
  div.innerHTML = `
    <div class="featured-snippet-label">Featured snippet</div>
    <a class="featured-snippet-title" href="${escHtml(snippet.url)}" target="_blank" rel="noopener">${escHtml(snippet.title)}</a>
    <div class="featured-snippet-url">${escHtml(snippet.url)}</div>
    <div class="featured-snippet-desc">${escHtml(snippet.description)}</div>
  `;
  return div;
}

function buildResultCard(result) {
  const div = document.createElement('div');
  div.className = 'result-card';

  const siteLinksHtml = result.siteLinks?.length
    ? `<div class="sitelinks">${result.siteLinks.map(sl =>
        `<a href="${escHtml(sl.url)}" target="_blank" rel="noopener">${escHtml(sl.title)}</a>`
      ).join('')}</div>`
    : '';

  div.innerHTML = `
    <div class="result-url">${escHtml(result.displayedUrl)}</div>
    <a class="result-title" href="${escHtml(result.url)}" target="_blank" rel="noopener">${escHtml(result.title)}</a>
    <div class="result-desc">${escHtml(result.description)}</div>
    ${siteLinksHtml}
  `;
  return div;
}

function buildPagination(data, query, page) {
  const div = document.createElement('div');
  div.className = 'pagination';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn-page';
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = page === 0;
  prevBtn.addEventListener('click', () => {
    showLoading(true);
    doSearch({ ...query, page: page - 1 })
      .finally(() => showLoading(false));
  });

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn-page';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = !data.hasNextPage;
  nextBtn.addEventListener('click', () => {
    showLoading(true);
    doSearch({ ...query, page: page + 1 })
      .finally(() => showLoading(false));
  });

  div.appendChild(prevBtn);
  div.appendChild(nextBtn);
  return div;
}

function buildPAA(items) {
  const section = document.createElement('div');
  section.className = 'paa-section';
  const listHtml = items.map(item => `<li>${escHtml(item.question)}</li>`).join('');
  section.innerHTML = `<h3>People Also Ask</h3><ul>${listHtml}</ul>`;
  return section;
}

function buildRelated(queries, query) {
  const section = document.createElement('div');
  section.className = 'related-section';
  const chipsHtml = queries.map(q =>
    `<button class="related-chip" data-q="${escHtml(q)}">${escHtml(q)}</button>`
  ).join('');
  section.innerHTML = `<h3>Related Searches</h3><div class="related-chips">${chipsHtml}</div>`;

  section.querySelectorAll('.related-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      doSearch({ ...query, q: btn.dataset.q, page: 0 });
    });
  });

  return section;
}
