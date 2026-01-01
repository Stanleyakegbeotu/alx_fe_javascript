// script.js
// Manages quotes (text + category), displays random quotes, supports persistence (localStorage),
// session tracking (sessionStorage), filtering by category, and import/export (JSON file).

// Initial array of quotes
const quotes = [
  { text: "The only way to do great work is to love what you do.", category: "Inspirational" },
  { text: "Life is what happens when you're busy making other plans.", category: "Life" },
  { text: "Be yourself; everyone else is already taken.", category: "Humor" }
];

// Storage keys
const STORAGE_KEY = 'quotes';
const SESSION_LAST_QUOTE_KEY = 'lastQuote';
const CATEGORY_FILTER_KEY = 'lastCategoryFilter';

// Utility: pick a random integer in [0, max)
function randInt(max) {
  return Math.floor(Math.random() * max);
}

// Save quotes to localStorage
function saveQuotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
  } catch (e) {
    console.error('Could not save quotes:', e);
  }
}

// Load quotes from localStorage (mutates the `quotes` array)
function loadQuotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Replace contents of the existing array (do not reassign const)
        quotes.length = 0;
        parsed.forEach(q => {
          if (q && typeof q.text === 'string') {
            quotes.push({ text: q.text, category: q.category || 'Uncategorized' });
          }
        });
      }
    }
  } catch (e) {
    console.error('Error loading quotes:', e);
  }
}

// Return quotes filtered by category (category === 'all' returns all)
function getFilteredQuotes(category) {
  if (!category || category === 'all') return quotes.slice();
  return quotes.filter(q => (q.category || 'Uncategorized') === category);
}

// Show a random quote respecting the selected category filter
function showRandomQuote() {
  const container = document.getElementById('quoteDisplay');
  if (!container) return;

  const select = document.getElementById('categoryFilter');
  const selected = select ? select.value : 'all';
  const pool = getFilteredQuotes(selected);

  if (pool.length === 0) {
    container.innerHTML = '<p><em>No quotes available for the selected category.</em></p>';
    sessionStorage.removeItem(SESSION_LAST_QUOTE_KEY);
    return;
  }

  const q = pool[randInt(pool.length)];
  container.innerHTML = `\n    <blockquote style="margin: 0 0 .5rem; font-size: 1.1rem;">${escapeHtml(q.text)}</blockquote>\n    <div style="font-size:.9rem; color:#666">Category: <strong>${escapeHtml(q.category)}</strong></div>\n  `;

  try {
    sessionStorage.setItem(SESSION_LAST_QUOTE_KEY, JSON.stringify(q));
  } catch (e) {
    console.error('Could not write to sessionStorage:', e);
  }
}

// Create the add-quote form programmatically and append it under the quote display
function createAddQuoteForm() {
  const container = document.getElementById('quoteDisplay') || document.body;

  const wrapper = document.createElement('div');
  wrapper.style.marginTop = '1rem';

  // Category filter select
  const select = document.createElement('select');
  select.id = 'categoryFilter';
  select.style.marginRight = '0.5rem';
  select.addEventListener('change', filterQuotes);

  const inputText = document.createElement('input');
  inputText.id = 'newQuoteText';
  inputText.type = 'text';
  inputText.placeholder = 'Enter a new quote';
  inputText.style.marginRight = '0.5rem';
  inputText.style.width = '300px';

  const inputCat = document.createElement('input');
  inputCat.id = 'newQuoteCategory';
  inputCat.type = 'text';
  inputCat.placeholder = 'Enter quote category';
  inputCat.style.marginRight = '0.5rem';

  const btn = document.createElement('button');
  btn.textContent = 'Add Quote';
  btn.addEventListener('click', addQuote);

  // Import file input
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.id = 'importFile';
  importInput.accept = '.json';
  importInput.style.marginLeft = '0.5rem';
  importInput.addEventListener('change', importFromJsonFile);

  // Export button
  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export Quotes (JSON)';
  exportBtn.style.marginLeft = '0.5rem';
  exportBtn.addEventListener('click', exportToJson);

  const feedback = document.createElement('div');
  feedback.id = 'addQuoteFeedback';
  feedback.style.marginTop = '0.5rem';
  feedback.style.fontSize = '.9rem';

  wrapper.appendChild(select);
  wrapper.appendChild(inputText);
  wrapper.appendChild(inputCat);
  wrapper.appendChild(btn);
  wrapper.appendChild(exportBtn);
  wrapper.appendChild(importInput);
  wrapper.appendChild(feedback);

  container.parentNode.insertBefore(wrapper, container.nextSibling);
}

// Populate category select from quotes and restore saved selection
function populateCategories() {
  const select = document.getElementById('categoryFilter');
  if (!select) return;

  const cats = Array.from(new Set(quotes.map(q => q.category || 'Uncategorized'))).sort();

  // Build options
  select.innerHTML = '';
  const optAll = document.createElement('option');
  optAll.value = 'all';
  optAll.textContent = 'All Categories';
  select.appendChild(optAll);

  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  // Restore saved filter
  const saved = localStorage.getItem(CATEGORY_FILTER_KEY);
  if (saved && (saved === 'all' || cats.includes(saved))) select.value = saved;
  else select.value = 'all';
}

// Filter quotes based on selected category and update display
function filterQuotes() {
  const select = document.getElementById('categoryFilter');
  const chosen = select ? select.value : 'all';

  try {
    localStorage.setItem(CATEGORY_FILTER_KEY, chosen);
  } catch (e) {
    console.error('Could not save category filter:', e);
  }

  const pool = getFilteredQuotes(chosen);
  if (pool.length === 0) {
    const container = document.getElementById('quoteDisplay');
    if (container) container.innerHTML = '<p><em>No quotes for the selected category.</em></p>';
    sessionStorage.removeItem(SESSION_LAST_QUOTE_KEY);
    return;
  }

  // Show a random quote from the filtered set
  const q = pool[randInt(pool.length)];
  showQuote(q.text, q.category);
}

// Add a new quote from the form inputs, update the quotes array and refresh display
function addQuote(event) {
  if (event && event.preventDefault) event.preventDefault();

  const textEl = document.getElementById('newQuoteText');
  const catEl = document.getElementById('newQuoteCategory');
  const feedback = document.getElementById('addQuoteFeedback');

  if (!textEl || !catEl) return;

  const text = textEl.value.trim();
  const category = catEl.value.trim() || 'Uncategorized';

  if (!text) {
    if (feedback) feedback.textContent = 'Please enter a quote before adding.';
    return;
  }

  // Add to array
  const newQuote = { text, category };
  quotes.push(newQuote);

  // Persist and update UI
  saveQuotes();
  populateCategories();

  // Select the new category
  const select = document.getElementById('categoryFilter');
  if (select) {
    select.value = category;
    try { localStorage.setItem(CATEGORY_FILTER_KEY, category); } catch (e) { /* ignore */ }
  }

  // Clear inputs
  textEl.value = '';
  catEl.value = '';

  if (feedback) {
    feedback.textContent = 'Quote added! Showing your quote now.';
    setTimeout(() => { if (feedback) feedback.textContent = ''; }, 2500);
  }

  // Update display using the filter
  filterQuotes();
}

// Show a specific quote (used after adding or restoring session)
function showQuote(text, category) {
  const container = document.getElementById('quoteDisplay');
  if (!container) return;
  const q = { text, category };
  container.innerHTML = `\n    <blockquote style="margin: 0 0 .5rem; font-size: 1.1rem;">${escapeHtml(q.text)}</blockquote>\n    <div style="font-size:.9rem; color:#666">Category: <strong>${escapeHtml(q.category)}</strong></div>\n  `;

  // Save last shown quote to sessionStorage
  try {
    sessionStorage.setItem(SESSION_LAST_QUOTE_KEY, JSON.stringify(q));
  } catch (e) {
    console.error('Could not write to sessionStorage:', e);
  }
}

// Export quotes to a JSON file for download
function exportToJson() {
  try {
    const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotes-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.error('Export failed:', e);
    alert('Failed to export quotes. See console for details.');
  }
}

// Import quotes from a selected JSON file (merges into existing quotes)
function importFromJsonFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array of quotes');

      const valid = parsed.filter(q => q && typeof q.text === 'string');
      if (valid.length === 0) throw new Error('No valid quotes found in file');

      // Merge and persist
      valid.forEach(q => quotes.push({ text: q.text, category: q.category || 'Uncategorized' }));
      saveQuotes();
      populateCategories();

      const feedback = document.getElementById('addQuoteFeedback');
      if (feedback) feedback.textContent = `Imported ${valid.length} quote(s).`;
      setTimeout(() => { if (feedback) feedback.textContent = ''; }, 2500);

      // Update display to show last imported quote and select its category
      const last = valid[valid.length - 1];
      const select = document.getElementById('categoryFilter');
      if (select && last && last.category) {
        select.value = last.category;
        try { localStorage.setItem(CATEGORY_FILTER_KEY, last.category); } catch (e) { /* ignore */ }
      }
      showQuote(last.text, last.category || 'Uncategorized');

      // Clear the file input so same file can be imported again if needed
      event.target.value = '';
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import quotes: ' + (err.message || err));
    }
  };
  reader.readAsText(file);
}

// Simple HTML escaping to avoid injection
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Wire up on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // Load persisted quotes first
  loadQuotes();

  // Attach random quote button
  const btn = document.getElementById('newQuote');
  if (btn) btn.addEventListener('click', showRandomQuote);

  // Create the add-quote form + import/export controls
  createAddQuoteForm();

  // Populate categories and restore last selected filter
  populateCategories();

  // If there's a last viewed quote in session, display it; otherwise show a filtered/random one
  try {
    const lastRaw = sessionStorage.getItem(SESSION_LAST_QUOTE_KEY);
    if (lastRaw) {
      const last = JSON.parse(lastRaw);
      if (last && last.text) {
        showQuote(last.text, last.category || 'Uncategorized');
        return;
      }
    }
  } catch (e) {
    console.error('Could not read last quote from sessionStorage:', e);
  }

  // Show an initial quote respecting the selected filter
  filterQuotes();
});

// Synchronization configuration & state
const SYNC_INTERVAL_MS = 60 * 1000; // 1 minute
let syncTimerId = null;
const LAST_SYNC_KEY = 'lastSyncTime';

// Fetch quotes from a mock server (JSONPlaceholder used for simulation)
async function fetchServerQuotes() {
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=15');
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    // Map posts to quotes: title => text, use userId as category label
    return data.map(p => ({ text: String(p.title || '').trim(), category: `Server-${p.userId}` }));
  } catch (e) {
    console.error('Failed to fetch server quotes:', e);
    throw e;
  }
}

// Simulate posting a local quote to the server (mock)
async function postLocalQuoteToServer(quote) {
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: quote.text, body: quote.category })
    });
    return res.ok ? await res.json() : null;
  } catch (e) {
    console.warn('Could not post local quote to server (simulation):', e);
    return null;
  }
}

// Merge logic: server takes precedence when conflicts occur
function normalizeText(t) {
  return String(t || '').trim().toLowerCase();
}

function mergeWithServer(serverQuotes) {
  const details = { added: 0, updated: 0, conflictsResolved: 0 };

  // Build map of local quotes by normalized text
  const localMap = new Map();
  quotes.forEach((q, idx) => {
    localMap.set(normalizeText(q.text), { q, idx });
  });

  // Apply server data
  serverQuotes.forEach(sq => {
    const key = normalizeText(sq.text);
    if (!key) return; // skip empty

    const localEntry = localMap.get(key);
    if (localEntry) {
      // If category differs, overwrite local with server version (server precedence)
      if ((localEntry.q.category || 'Uncategorized') !== (sq.category || 'Uncategorized')) {
        quotes[localEntry.idx].category = sq.category || 'Uncategorized';
        details.updated += 1;
        details.conflictsResolved += 1;
      }
    } else {
      // Add missing server quote
      quotes.push({ text: sq.text, category: sq.category || 'Uncategorized' });
      details.added += 1;
    }
  });

  // Optionally, post local-only quotes to server for eventual consistency (simulation)
  // Here we kick off async posts without awaiting them to avoid blocking
  (async () => {
    for (const q of quotes) {
      const key = normalizeText(q.text);
      const serverHas = serverQuotes.some(sq => normalizeText(sq.text) === key);
      if (!serverHas) {
        await postLocalQuoteToServer(q);
      }
    }
  })();

  if (details.added || details.updated) {
    saveQuotes();
    populateCategories();
  }

  return details;
}

// Perform a sync cycle: fetch server, merge, show notification
async function doSync(showNotification = true) {
  const statusEl = document.getElementById('syncStatus');
  if (statusEl) statusEl.textContent = 'Syncing...';

  try {
    const serverQuotes = await fetchServerQuotes();
    const details = mergeWithServer(serverQuotes);

    const now = new Date().toISOString();
    try { localStorage.setItem(LAST_SYNC_KEY, now); } catch (e) { /* ignore */ }

    if (statusEl) statusEl.textContent = `Last sync: ${new Date().toLocaleString()} (added: ${details.added}, updated: ${details.updated})`;

    if (showNotification && (details.added || details.updated || details.conflictsResolved)) {
      showSyncNotification(details);
    }

    return details;
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Sync failed (see console)';
    console.error('Sync failed:', err);
    return null;
  }
}

function startSync(intervalMs = SYNC_INTERVAL_MS) {
  if (syncTimerId) return; // already running
  syncTimerId = setInterval(() => doSync(false), intervalMs);
  // Run an immediate sync
  doSync();
  const btn = document.getElementById('autoSyncBtn');
  if (btn) btn.textContent = 'Stop Auto Sync';
}

function stopSync() {
  if (!syncTimerId) return;
  clearInterval(syncTimerId);
  syncTimerId = null;
  const btn = document.getElementById('autoSyncBtn');
  if (btn) btn.textContent = 'Start Auto Sync';
  const statusEl = document.getElementById('syncStatus');
  if (statusEl) statusEl.textContent = 'Auto sync stopped';
}

// UI: show sync notifications and allow manual inspection
function showSyncNotification(details) {
  const area = document.getElementById('syncDetails');
  if (!area) return;
  area.innerHTML = `\n    <div>Added: ${details.added}, Updated: ${details.updated}, Conflicts resolved: ${details.conflictsResolved}</div>\n  `;
  area.style.border = '1px solid #ccc';
  area.style.padding = '0.5rem';
  area.style.marginTop = '0.5rem';
}

// Enhance form UI to include sync controls (in createAddQuoteForm)
// Note: createAddQuoteForm already appends elements — we'll augment it by adding sync controls
(function patchCreateFormForSync() {
  const original = createAddQuoteForm;
  createAddQuoteForm = function () {
    original();
    const select = document.getElementById('categoryFilter');
    const wrapper = select ? select.parentNode : null;
    if (!wrapper) return;

    // Sync controls
    const syncNowBtn = document.createElement('button');
    syncNowBtn.textContent = 'Sync Now';
    syncNowBtn.style.marginLeft = '0.5rem';
    syncNowBtn.addEventListener('click', () => doSync(true));

    const autoBtn = document.createElement('button');
    autoBtn.id = 'autoSyncBtn';
    autoBtn.textContent = 'Start Auto Sync';
    autoBtn.style.marginLeft = '0.5rem';
    autoBtn.addEventListener('click', () => {
      if (syncTimerId) stopSync(); else startSync();
    });

    const status = document.createElement('div');
    status.id = 'syncStatus';
    status.style.marginLeft = '0.5rem';
    status.style.display = 'inline-block';
    status.style.minWidth = '200px';

    const details = document.createElement('div');
    details.id = 'syncDetails';
    details.style.marginTop = '0.5rem';

    wrapper.appendChild(syncNowBtn);
    wrapper.appendChild(autoBtn);
    wrapper.appendChild(status);
    wrapper.appendChild(details);

    // Restore last sync time if available
    try {
      const last = localStorage.getItem(LAST_SYNC_KEY);
      if (last) status.textContent = `Last sync: ${new Date(last).toLocaleString()}`;
    } catch (e) { /* ignore */ }
  };
})();

// Expose sync functions globally
window.startSync = startSync;
window.stopSync = stopSync;
window.doSync = doSync;

// Expose functions globally (optional)
window.showRandomQuote = showRandomQuote;
window.createAddQuoteForm = createAddQuoteForm;
window.addQuote = addQuote;
window.importFromJsonFile = importFromJsonFile;
window.exportToJson = exportToJson;
window.saveQuotes = saveQuotes;
window.loadQuotes = loadQuotes;
window.populateCategories = populateCategories;
window.filterQuotes = filterQuotes;
window.getFilteredQuotes = getFilteredQuotes;
