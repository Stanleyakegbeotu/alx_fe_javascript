// script.js
// Manages quotes (text + category), displays random quotes, supports persistence (localStorage),
// session tracking (sessionStorage), and import/export (JSON file).

// Initial array of quotes
const quotes = [
  { text: "The only way to do great work is to love what you do.", category: "Inspirational" },
  { text: "Life is what happens when you're busy making other plans.", category: "Life" },
  { text: "Be yourself; everyone else is already taken.", category: "Humor" }
];

// Storage keys
const STORAGE_KEY = 'quotes';
const SESSION_LAST_QUOTE_KEY = 'lastQuote';

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

// Show a random quote in the #quoteDisplay element
function showRandomQuote() {
  const container = document.getElementById('quoteDisplay');
  if (!container) return;
  if (quotes.length === 0) {
    container.innerHTML = '<p><em>No quotes available.</em></p>';
    sessionStorage.removeItem(SESSION_LAST_QUOTE_KEY);
    return;
  }

  const q = quotes[randInt(quotes.length)];
  container.innerHTML = `\n    <blockquote style="margin: 0 0 .5rem; font-size: 1.1rem;">${escapeHtml(q.text)}</blockquote>\n    <div style="font-size:.9rem; color:#666">Category: <strong>${escapeHtml(q.category)}</strong></div>\n  `;

  // Save last shown quote to sessionStorage
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

  wrapper.appendChild(inputText);
  wrapper.appendChild(inputCat);
  wrapper.appendChild(btn);
  wrapper.appendChild(exportBtn);
  wrapper.appendChild(importInput);
  wrapper.appendChild(feedback);

  container.parentNode.insertBefore(wrapper, container.nextSibling);
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

  // Persist
  saveQuotes();

  // Clear inputs
  textEl.value = '';
  catEl.value = '';

  if (feedback) {
    feedback.textContent = 'Quote added! Showing your quote now.';
    setTimeout(() => { if (feedback) feedback.textContent = ''; }, 2500);
  }

  // Immediately show the newly added quote
  showQuote(text, category);
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

      const feedback = document.getElementById('addQuoteFeedback');
      if (feedback) feedback.textContent = `Imported ${valid.length} quote(s).`;
      setTimeout(() => { if (feedback) feedback.textContent = ''; }, 2500);

      // Update display to show last imported quote
      const last = valid[valid.length - 1];
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

  // If there's a last viewed quote in session, display it; otherwise show a random one
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

  // Show an initial quote
  showRandomQuote();
});

// Expose functions globally (optional)
window.showRandomQuote = showRandomQuote;
window.createAddQuoteForm = createAddQuoteForm;
window.addQuote = addQuote;
window.importFromJsonFile = importFromJsonFile;
window.exportToJson = exportToJson;
window.saveQuotes = saveQuotes;
window.loadQuotes = loadQuotes;
