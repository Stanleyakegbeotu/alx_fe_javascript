// script.js
// Manages quotes (text + category), displays random quotes, and allows dynamic addition.

// Initial array of quotes
const quotes = [
  { text: "The only way to do great work is to love what you do.", category: "Inspirational" },
  { text: "Life is what happens when you're busy making other plans.", category: "Life" },
  { text: "Be yourself; everyone else is already taken.", category: "Humor" }
];

// Utility: pick a random integer in [0, max)
function randInt(max) {
  return Math.floor(Math.random() * max);
}

// Show a random quote in the #quoteDisplay element
function showRandomQuote() {
  const container = document.getElementById('quoteDisplay');
  if (!container) return;
  if (quotes.length === 0) {
    container.innerHTML = '<p><em>No quotes available.</em></p>';
    return;
  }

  const q = quotes[randInt(quotes.length)];
  container.innerHTML = `\n    <blockquote style="margin: 0 0 .5rem; font-size: 1.1rem;">${escapeHtml(q.text)}</blockquote>\n    <div style="font-size:.9rem; color:#666">Category: <strong>${escapeHtml(q.category)}</strong></div>\n  `;
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

  const feedback = document.createElement('div');
  feedback.id = 'addQuoteFeedback';
  feedback.style.marginTop = '0.5rem';
  feedback.style.fontSize = '.9rem';

  wrapper.appendChild(inputText);
  wrapper.appendChild(inputCat);
  wrapper.appendChild(btn);
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
  quotes.push({ text, category });

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

// Show a specific quote (used after adding)
function showQuote(text, category) {
  const container = document.getElementById('quoteDisplay');
  if (!container) return;
  container.innerHTML = `\n    <blockquote style="margin: 0 0 .5rem; font-size: 1.1rem;">${escapeHtml(text)}</blockquote>\n    <div style="font-size:.9rem; color:#666">Category: <strong>${escapeHtml(category)}</strong></div>\n  `;
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
  // Attach random quote button
  const btn = document.getElementById('newQuote');
  if (btn) btn.addEventListener('click', showRandomQuote);

  // Create the add-quote form
  createAddQuoteForm();

  // Show an initial quote
  showRandomQuote();
});

// Expose functions globally (optional)
window.showRandomQuote = showRandomQuote;
window.createAddQuoteForm = createAddQuoteForm;
window.addQuote = addQuote;
