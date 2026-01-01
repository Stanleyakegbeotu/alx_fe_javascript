// script.js
// Manages quotes (text + category), displays random quotes, supports persistence (localStorage),
// session tracking (sessionStorage), filtering by category, import/export (JSON file),
// AND server simulation with syncing + conflict resolution.

// =====================
// Server Simulation Config
// =====================
const SERVER_API_URL = 'https://jsonplaceholder.typicode.com/posts';
const SYNC_INTERVAL_MS = 15000; // 15 seconds

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

// Utility: random integer
function randInt(max) {
  return Math.floor(Math.random() * max);
}

// =====================
// Local Storage Handling
// =====================
function saveQuotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}

function loadQuotes() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    quotes.length = 0;
    parsed.forEach(q => {
      if (q && typeof q.text === 'string') {
        quotes.push({ text: q.text, category: q.category || 'Uncategorized' });
      }
    });
  }
}

// =====================
// Quote Display Logic
// =====================
function getFilteredQuotes(category) {
  if (!category || category === 'all') return quotes.slice();
  return quotes.filter(q => (q.category || 'Uncategorized') === category);
}

function showRandomQuote() {
  const container = document.getElementById('quoteDisplay');
  if (!container) return;

  const select = document.getElementById('categoryFilter');
  const selected = select ? select.value : 'all';
  const pool = getFilteredQuotes(selected);

  if (pool.length === 0) {
    container.innerHTML = '<em>No quotes available.</em>';
    return;
  }

  const q = pool[randInt(pool.length)];
  showQuote(q.text, q.category);
}

function showQuote(text, category) {
  const container = document.getElementById('quoteDisplay');
  if (!container) return;

  container.innerHTML = `
    <blockquote>${escapeHtml(text)}</blockquote>
    <small>Category: <strong>${escapeHtml(category)}</strong></small>
  `;

  sessionStorage.setItem(
    SESSION_LAST_QUOTE_KEY,
    JSON.stringify({ text, category })
  );
}

// =====================
// UI Creation
// =====================
function createAddQuoteForm() {
  const container = document.getElementById('quoteDisplay');

  const wrapper = document.createElement('div');
  wrapper.style.marginTop = '1rem';

  const select = document.createElement('select');
  select.id = 'categoryFilter';
  select.addEventListener('change', filterQuotes);

  const inputText = document.createElement('input');
  inputText.id = 'newQuoteText';
  inputText.placeholder = 'Enter a quote';

  const inputCat = document.createElement('input');
  inputCat.id = 'newQuoteCategory';
  inputCat.placeholder = 'Enter category';

  const btn = document.createElement('button');
  btn.textContent = 'Add Quote';
  btn.onclick = addQuote;

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export JSON';
  exportBtn.onclick = exportToJson;

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = '.json';
  importInput.onchange = importFromJsonFile;

  const feedback = document.createElement('div');
  feedback.id = 'addQuoteFeedback';

  wrapper.append(
    select,
    inputText,
    inputCat,
    btn,
    exportBtn,
    importInput,
    feedback
  );

  container.after(wrapper);
}

function populateCategories() {
  const select = document.getElementById('categoryFilter');
  if (!select) return;

  const cats = [...new Set(quotes.map(q => q.category))];

  select.innerHTML = '<option value="all">All Categories</option>';
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  select.value = localStorage.getItem(CATEGORY_FILTER_KEY) || 'all';
}

function filterQuotes() {
  const select = document.getElementById('categoryFilter');
  const cat = select.value;
  localStorage.setItem(CATEGORY_FILTER_KEY, cat);
  showRandomQuote();
}

function addQuote() {
  const text = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim() || 'Uncategorized';
  const feedback = document.getElementById('addQuoteFeedback');

  if (!text) {
    feedback.textContent = 'Quote cannot be empty';
    return;
  }

  quotes.push({ text, category });
  saveQuotes();
  populateCategories();

  newQuoteText.value = '';
  newQuoteCategory.value = '';
  feedback.textContent = 'Quote added successfully';

  filterQuotes();
}

// =====================
// Import / Export
// =====================
function exportToJson() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], {
    type: 'application/json'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'quotes.json';
  a.click();
}

function importFromJsonFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const data = JSON.parse(reader.result);
    if (Array.isArray(data)) {
      data.forEach(q => {
        if (q.text) quotes.push(q);
      });
      saveQuotes();
      populateCategories();
      showRandomQuote();
    }
  };
  reader.readAsText(file);
}

// =====================
// Server Sync + Conflict Resolution
// =====================
async function fetchQuotesFromServer() {
  const res = await fetch(SERVER_API_URL);
  const data = await res.json();

  return data.slice(0, 5).map(p => ({
    text: p.title,
    category: 'Server'
  }));
}

function syncWithServer(serverQuotes) {
  let conflicts = 0;

  serverQuotes.forEach(sq => {
    const index = quotes.findIndex(q => q.text === sq.text);

    if (index === -1) {
      quotes.push(sq);
    } else if (quotes[index].category !== sq.category) {
      quotes[index] = sq; // server wins
      conflicts++;
    }
  });

  saveQuotes();
  populateCategories();
  notifySync(serverQuotes.length, conflicts);
}

function notifySync(total, conflicts) {
  let notice = document.getElementById('syncNotice');

  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'syncNotice';
    notice.style.color = 'green';
    document.body.appendChild(notice);
  }

  notice.textContent =
    `🔄 Synced ${total} server quotes | Conflicts resolved: ${conflicts}`;

  setTimeout(() => (notice.textContent = ''), 4000);
}

async function startServerSync() {
  const serverQuotes = await fetchQuotesFromServer();
  syncWithServer(serverQuotes);
}

// =====================
// Utilities
// =====================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// =====================
// App Init
// =====================
document.addEventListener('DOMContentLoaded', () => {
  loadQuotes();
  createAddQuoteForm();
  populateCategories();

  document.getElementById('newQuote')?.addEventListener('click', showRandomQuote);

  const last = sessionStorage.getItem(SESSION_LAST_QUOTE_KEY);
  if (last) {
    const q = JSON.parse(last);
    showQuote(q.text, q.category);
  } else {
    showRandomQuote();
  }

  // Start periodic server sync
  startServerSync();
  setInterval(startServerSync, SYNC_INTERVAL_MS);
});
