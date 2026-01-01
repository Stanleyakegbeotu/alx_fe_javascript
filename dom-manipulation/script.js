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

  // Sync controls
  const syncBtn = document.createElement('button');
  syncBtn.textContent = 'Sync Now';
  syncBtn.style.marginLeft = '0.5rem';
  syncBtn.addEventListener('click', () => { pushLocalToServer().then(checkForServerUpdates); });

  const syncStatus = document.createElement('div');
  syncStatus.id = 'syncStatus';
  syncStatus.style.display = 'inline-block';
  syncStatus.style.marginLeft = '0.5rem';
  syncStatus.style.fontSize = '.9rem';
  syncStatus.style.color = '#155724';

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
  wrapper.appendChild(syncBtn);
  wrapper.appendChild(syncStatus);
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

// --- Simulated server and syncing logic ---
// This simulates server behavior locally. In a real app this would hit an API.
const simulatedServer = {
  quotes: [
    // Seed server with a slightly different dataset to simulate potential conflicts
    { text: "The only way to do great work is to love what you do.", category: "Work" },
    { text: "Life is what happens when you're busy making other plans.", category: "Life" },
    { text: "To be or not to be, that is the question.", category: "Literature" }
  ],
  fetch() {
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(this.quotes))), 700));
  },
  post(quotesArray) {
    return new Promise(resolve => setTimeout(() => {
      // For simplicity, server replaces or merges: server prefers its version for matching texts
      const serverMap = new Map(this.quotes.map(q => [q.text, q]));
      quotesArray.forEach(q => {
        if (!serverMap.has(q.text)) serverMap.set(q.text, { text: q.text, category: q.category || 'Uncategorized' });
      });
      this.quotes = Array.from(serverMap.values());
      resolve(JSON.parse(JSON.stringify(this.quotes)));
    }, 500));
  },
  // Simulate external server updates happening independently
  randomUpdate() {
    const possible = [
      { text: "Be yourself; everyone else is already taken.", category: "Philosophy" },
      { text: "Innovation distinguishes between a leader and a follower.", category: "Inspirational" },
      { text: "Simplicity is the ultimate sophistication.", category: "Design" }
    ];
    const pick = possible[Math.floor(Math.random() * possible.length)];
    // Either add or modify
    const idx = this.quotes.findIndex(q => q.text === pick.text);
    if (idx >= 0) {
      this.quotes[idx].category = pick.category;
    } else {
      this.quotes.push(pick);
    }
  }
};

let syncIntervalId = null;
let serverUpdateIntervalId = null;

async function checkForServerUpdates() {
  try {
    const serverData = await simulatedServer.fetch();
    // Compare serverData with local quotes
    const serverMap = new Map(serverData.map(q => [q.text, q]));
    const localMap = new Map(quotes.map(q => [q.text, q]));

    const newOnServer = [];
    const changedOnServer = [];

    serverMap.forEach((sq, text) => {
      const local = localMap.get(text);
      if (!local) newOnServer.push(sq);
      else if ((local.category || 'Uncategorized') !== (sq.category || 'Uncategorized')) changedOnServer.push({ local, server: sq });
    });

    if (newOnServer.length === 0 && changedOnServer.length === 0) {
      // nothing to do
      setSyncStatus('Up to date');
      return;
    }

    // Prepare a summary and notify user
    showSyncNotification({ newOnServer, changedOnServer, serverData });
  } catch (e) {
    console.error('Failed to check server updates:', e);
    setSyncStatus('Sync error');
  }
}

function setSyncStatus(msg) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.textContent = msg;
}

function showSyncNotification(summary) {
  // summary: { newOnServer, changedOnServer, serverData }
  const container = document.getElementById('quoteDisplay');
  if (!container) return;

  // Create a simple notification area (or reuse existing feedback)
  let notif = document.getElementById('syncNotification');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'syncNotification';
    notif.style.border = '1px solid #b8daff';
    notif.style.background = '#cce5ff';
    notif.style.padding = '0.6rem';
    notif.style.marginTop = '0.6rem';
  } else {
    notif.innerHTML = '';
  }

  const title = document.createElement('div');
  title.innerHTML = `<strong>Server updates available</strong>`;
  notif.appendChild(title);

  const details = document.createElement('div');
  details.style.marginTop = '0.4rem';
  details.innerHTML = `New on server: ${summary.newOnServer.length}, Changed on server: ${summary.changedOnServer.length}`;
  notif.appendChild(details);

  const acceptBtn = document.createElement('button');
  acceptBtn.textContent = 'Accept Server Changes';
  acceptBtn.style.marginLeft = '0.5rem';
  acceptBtn.addEventListener('click', () => { applyServerChanges(summary.serverData); notif.remove(); setSyncStatus('Updated'); });

  const viewBtn = document.createElement('button');
  viewBtn.textContent = 'View Changes';
  viewBtn.style.marginLeft = '0.5rem';
  viewBtn.addEventListener('click', () => {
    // Show a simple details list
    const parts = [];
    if (summary.newOnServer.length) parts.push('New on server:\n' + summary.newOnServer.map(q => `- ${q.text} (${q.category})`).join('\n'));
    if (summary.changedOnServer.length) parts.push('Changed on server:\n' + summary.changedOnServer.map(c => `- ${c.local.text}: ${c.local.category} -> ${c.server.category}`).join('\n'));
    alert(parts.join('\n\n'));
  });

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.style.marginLeft = '0.5rem';
  dismissBtn.addEventListener('click', () => { notif.remove(); setSyncStatus('Update available'); });

  notif.appendChild(acceptBtn);
  notif.appendChild(viewBtn);
  notif.appendChild(dismissBtn);

  const wrapper = container.nextSibling;
  if (wrapper) wrapper.appendChild(notif);
}

function applyServerChanges(serverData) {
  // Server precedence: update local entries where server has same text; add new server entries; keep local-only entries
  const serverMap = new Map(serverData.map(q => [q.text, q]));
  const localMap = new Map(quotes.map(q => [q.text, q]));

  // Apply updates
  serverMap.forEach((sq, text) => {
    if (localMap.has(text)) {
      const idx = quotes.findIndex(q => q.text === text);
      if (idx >= 0) quotes[idx] = { text: sq.text, category: sq.category || 'Uncategorized' };
    } else {
      quotes.push({ text: sq.text, category: sq.category || 'Uncategorized' });
    }
  });

  saveQuotes();
  populateCategories();
  filterQuotes();
  setSyncStatus('Synchronized with server');
}

async function pushLocalToServer() {
  try {
    setSyncStatus('Pushing to server...');
    const resp = await simulatedServer.post(quotes);
    setSyncStatus('Pushed');
    return resp;
  } catch (e) {
    console.error('Failed to push to server:', e);
    setSyncStatus('Push failed');
    return null;
  }
}

function startPeriodicSync(intervalMs = 30000) {
  if (syncIntervalId) clearInterval(syncIntervalId);
  syncIntervalId = setInterval(checkForServerUpdates, intervalMs);
  // Also start a simulated external server update generator
  if (serverUpdateIntervalId) clearInterval(serverUpdateIntervalId);
  serverUpdateIntervalId = setInterval(() => { simulatedServer.randomUpdate(); }, 45000);
  // Run an initial check
  checkForServerUpdates();
}

// --- End simulated server and syncing logic ---

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
