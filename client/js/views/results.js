import { showView, escHtml } from '../nav.js';

const container = document.getElementById('results-container');
const btnBack = document.getElementById('btn-back');

btnBack.addEventListener('click', () => showView('view-search'));

export function renderAllResults(results) {
  container.innerHTML = '';
  for (const entry of results) {
    container.appendChild(buildQuerySection(entry));
  }
}

function buildQuerySection({ query, data, error }) {
  const section = document.createElement('div');
  section.className = 'query-section';

  const header = document.createElement('h2');
  header.className = 'query-section-header';
  header.textContent = query;
  section.appendChild(header);

  if (error) {
    const errDiv = document.createElement('div');
    errDiv.className = 'query-section-error';
    errDiv.textContent = `Search failed: ${error}`;
    section.appendChild(errDiv);
    return section;
  }

  if (data.resultsCountText) {
    const countDiv = document.createElement('div');
    countDiv.className = 'results-count';
    countDiv.textContent = data.resultsCountText;
    section.appendChild(countDiv);
  }

  if (data.featuredSnippet) {
    section.appendChild(buildFeaturedSnippet(data.featuredSnippet));
  }

  for (const result of data.organicResults ?? []) {
    section.appendChild(buildResultCard(result));
  }

  if (data.peopleAlsoAsk?.length) {
    section.appendChild(buildPAA(data.peopleAlsoAsk));
  }

  if (data.relatedQueries?.length) {
    section.appendChild(buildRelated(data.relatedQueries));
  }

  return section;
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

function buildPAA(items) {
  const section = document.createElement('div');
  section.className = 'paa-section';
  const listHtml = items.map(item => `<li>${escHtml(item.question)}</li>`).join('');
  section.innerHTML = `<h3>People Also Ask</h3><ul>${listHtml}</ul>`;
  return section;
}

function buildRelated(queries) {
  const section = document.createElement('div');
  section.className = 'related-section';
  const chipsHtml = queries.map(q =>
    `<span class="related-chip">${escHtml(q)}</span>`
  ).join('');
  section.innerHTML = `<h3>Related Searches</h3><div class="related-chips">${chipsHtml}</div>`;
  return section;
}
