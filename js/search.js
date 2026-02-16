/* ═══════════════════════════════════════════════════════════
   STAMMBAUM – Search
   ═══════════════════════════════════════════════════════════ */

const Search = (() => {
  let searchTimeout = null;
  let allMembers = [];

  function init() {
    const input = document.getElementById('search-input');
    const resultsEl = document.getElementById('search-results');

    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch(input.value.trim());
      }, 200);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 1) {
        performSearch(input.value.trim());
      }
    });

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#search-bar') && !e.target.closest('#search-results')) {
        hideResults();
      }
    });

    // ESC to close
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideResults();
        input.blur();
      }
    });
  }

  function setMembers(members) {
    allMembers = members;
  }

  function performSearch(query) {
    const resultsEl = document.getElementById('search-results');

    if (!query || query.length < 1) {
      hideResults();
      return;
    }

    const q = query.toLowerCase();
    const matches = allMembers.filter(m => {
      const full = `${m.firstName} ${m.lastName} ${m.birthName || ''} ${m.location || ''}`.toLowerCase();
      return full.includes(q);
    }).slice(0, 8);

    if (matches.length === 0) {
      resultsEl.innerHTML = `
        <div class="search-result-item" style="justify-content:center; color:var(--text-muted); cursor:default;">
          Keine Ergebnisse für "${query}"
        </div>
      `;
      showResults();
      return;
    }

    resultsEl.innerHTML = matches.map(m => {
      const initials = `${m.firstName[0]}${m.lastName[0]}`.toUpperCase();
      const yearInfo = m.birthDate ? `* ${m.birthDate.substring(0, 4)}` : '';
      const locationInfo = m.location || '';
      const info = [yearInfo, locationInfo].filter(Boolean).join(' · ');

      return `
        <div class="search-result-item" data-id="${m.id}">
          <div class="result-avatar">${initials}</div>
          <div>
            <div class="result-name">${m.firstName} ${m.lastName}</div>
            ${info ? `<div class="result-info">${info}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Click handlers
    resultsEl.querySelectorAll('.search-result-item[data-id]').forEach(el => {
      el.addEventListener('click', () => {
        const memberId = el.dataset.id;
        hideResults();
        document.getElementById('search-input').value = '';
        Profile.show(memberId);
      });
    });

    showResults();
  }

  function showResults() {
    document.getElementById('search-results').classList.remove('hidden');
  }

  function hideResults() {
    document.getElementById('search-results').classList.add('hidden');
  }

  return {
    init,
    setMembers,
    performSearch,
    hideResults,
  };
})();
