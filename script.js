// HM MODZ PROJECT BETA TESTING - script
const MOVIES_JSON = "movies.json";
const PAGE_SIZE = 12;

let movies = [];
let filtered = [];
let currentPage = 1;
let currentGenre = "";
let currentQuery = "";

// DOM refs (index & watch use same script)
const dom = {
  moviesGrid: document.getElementById("moviesGrid"),
  searchInput: document.getElementById("searchInput"),
  searchBtn: document.getElementById("searchBtn"),
  genreSelect: document.getElementById("genreSelect"),
  playerBox: document.getElementById("playerBox"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageInfo: document.getElementById("pageInfo"),
  allBtn: document.getElementById("allBtn"),
  recommendRow: document.getElementById("recommendRow"),
  videoMeta: document.getElementById("videoMeta")
};

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/[&<>"']/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; });
}

async function loadMoviesJson() {
  try {
    const res = await fetch(MOVIES_JSON);
    movies = await res.json();
    if (!Array.isArray(movies)) movies = [];
    // extract genres
    const genres = Array.from(new Set(movies.map(m => m.genre).filter(Boolean))).sort();
    const sel = document.getElementById("genreSelect");
    if (sel) {
      genres.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        sel.appendChild(opt);
      });
    }
    applyFilters();
    // if on watch page, try to load video by id param
    if (location.pathname.endsWith('watch.html')) {
      loadWatchPage();
    }
  } catch (e) {
    if (document.getElementById("moviesGrid"))
      document.getElementById("moviesGrid").innerHTML = '<div style="padding:18px;color:#f7bdbd">Gagal memuat movies.json. Pastikan file ada di folder yang sama.</div>';
    console.error(e);
  }
}

function applyFilters() {
  currentQuery = (document.getElementById("searchInput") ? document.getElementById("searchInput").value : "").trim().toLowerCase();
  currentGenre = (document.getElementById("genreSelect") ? document.getElementById("genreSelect").value : "");
  filtered = movies.filter(m => {
    const matchesQ = !currentQuery || (m.title && m.title.toLowerCase().includes(currentQuery));
    const matchesG = !currentGenre || (m.genre === currentGenre);
    return matchesQ && matchesG;
  });
  currentPage = 1;
  renderPage();
}

function renderPage() {
  const grid = document.getElementById("moviesGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  if (pageItems.length === 0) {
    grid.innerHTML = '<div style="padding:18px;color:#bcdff8">Tidak ada hasil.</div>';
    if (document.getElementById("pageInfo")) document.getElementById("pageInfo").textContent = 'Page 0';
    if (document.getElementById("prevPage")) document.getElementById("prevPage").disabled = true;
    if (document.getElementById("nextPage")) document.getElementById("nextPage").disabled = true;
    return;
  }
  pageItems.forEach((m, idx) => {
    const globalIndex = (currentPage - 1) * PAGE_SIZE + idx;
    const card = document.createElement("div");
    card.className = "movie-card";
    const img = m.image || "";
    const id = m.id !== undefined ? m.id : globalIndex;
    card.innerHTML = `
      <img class="movie-poster" src="${img}" alt="${escapeHtml(m.title)}" />
      <div class="movie-title">${escapeHtml(m.title)}</div>
      <div class="movie-meta"><div>${m.year || ''}</div><div>${m.genre || ''}</div></div>
      <div class="movie-actions">
        <a class="btn" href="watch.html?id=${encodeURIComponent(id)}">Tonton Film</a>
        <a class="btn outline" href="${m.url}" target="_blank" rel="noopener">Buka di Tab Baru</a>
      </div>
    `;
    grid.appendChild(card);
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (document.getElementById("pageInfo")) document.getElementById("pageInfo").textContent = `Page ${currentPage} / ${totalPages}`;
  if (document.getElementById("prevPage")) document.getElementById("prevPage").disabled = currentPage <= 1;
  if (document.getElementById("nextPage")) document.getElementById("nextPage").disabled = currentPage >= totalPages;
}

function bindEvents() {
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) searchBtn.addEventListener("click", applyFilters);
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.addEventListener("keydown", (e) => { if (e.key === 'Enter') applyFilters(); });
  const genre = document.getElementById("genreSelect");
  if (genre) genre.addEventListener("change", applyFilters);
  const prev = document.getElementById("prevPage");
  if (prev) prev.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderPage(); } });
  const next = document.getElementById("nextPage");
  if (next) next.addEventListener("click", () => { currentPage++; renderPage(); });
  const allBtn = document.getElementById("allBtn");
  if (allBtn) allBtn.addEventListener("click", () => { const sel = document.getElementById("genreSelect"); if (sel) sel.value=''; applyFilters(); });
  const grid = document.getElementById("moviesGrid");
  if (grid) {
    grid.addEventListener("click", (e) => {
      const a = e.target.closest('a.btn');
      if (!a) return;
      // link handled by browser
    });
  }
}

function getIdFromQuery() {
  const p = new URLSearchParams(location.search);
  return p.get('id');
}

function loadWatchPage() {
  const id = getIdFromQuery();
  if (!id) {
    showPlayerError('ID film tidak ditemukan di URL.');
    return;
  }
  // find by id property or fallback to index number
  let film = movies.find(m => String(m.id) === String(id));
  if (!film) {
    const idx = parseInt(id,10);
    if (!isNaN(idx) && movies[idx]) film = movies[idx];
  }
  if (!film) {
    showPlayerError('Film tidak ditemukan.');
    return;
  }
  renderPlayerForFilm(film);
  renderRecommendations(film);
}

function showPlayerError(msg) {
  const box = document.getElementById("playerBox");
  if (box) box.innerHTML = `<div style="color:#f7bdbd;padding:18px">${msg}</div>`;
  if (document.getElementById("videoMeta")) document.getElementById("videoMeta").innerHTML = '';
}

function isDirectVideoUrl(url) {
  if (!url) return false;
  const lower = url.split('?')[0].toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.m3u8') || lower.endsWith('.webm') || lower.endsWith('.mpd');
}

function renderPlayerForFilm(film) {
  const box = document.getElementById("playerBox");
  if (!box) return;
  const url = film.url || '';
  const title = film.title || '';
  const metaHtml = `<div style="padding:8px 0;color:#bcdff8"><strong>${escapeHtml(title)}</strong> ${film.year ? ' • ' + film.year : ''} ${film.genre ? ' • ' + film.genre : ''}</div>`;
  if (document.getElementById("videoMeta")) document.getElementById("videoMeta").innerHTML = metaHtml;
  if (isDirectVideoUrl(url)) {
    // HLS (.m3u8) handled as native source (may require hls.js on some browsers)
    const type = url.toLowerCase().endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
    box.innerHTML = `<video class="player-video" controls crossorigin playsinline>
      <source src="${url}" type="${type}">
      Browser tidak mendukung pemutaran video ini.
    </video>`;
    const v = box.querySelector('video');
    if (v) v.play().catch(()=>{});
  } else {
    // not a direct video file — provide button to open external page
    box.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;align-items:center">
      <div style="color:#bcdff8">Sumber ini bukan file video langsung.</div>
      <a class="btn" href="${escapeHtml(url)}" target="_blank" rel="noopener">Buka di Situs Asli</a>
    </div>`;
  }
}

function renderRecommendations(currentFilm) {
  const row = document.getElementById("recommendRow");
  if (!row) return;
  row.innerHTML = '';
  const others = movies.filter(m => m !== currentFilm).slice(0,20);
  others.forEach(m => {
    const card = document.createElement("div");
    card.className = 'recommend-card';
    card.innerHTML = `
      <img src="${m.image || ''}" alt="${escapeHtml(m.title)}" />
      <div class="meta">${escapeHtml(m.title)}</div>
      <div style="margin-top:6px"><a class="btn" href="watch.html?id=${encodeURIComponent(m.id !== undefined ? m.id : movies.indexOf(m))}">Tonton</a></div>
    `;
    row.appendChild(card);
  });
}

// matrix bg
(function matrixBg(){
  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = canvas.width = innerWidth;
  let h = canvas.height = innerHeight;
  let cols, ypos=[], letters;
  function setup(){ w = canvas.width = innerWidth; h = canvas.height = innerHeight; const fontSize = Math.max(10, Math.floor(w/120)); ctx.font = fontSize + 'px monospace'; cols = Math.floor(w / fontSize) + 1; ypos = []; for(let i=0;i<cols;i++) ypos[i] = Math.random()*h; letters = '01{}[]<>/\\|+-=_*abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(''); }
  function loop(){ ctx.globalAlpha = 0.6; ctx.fillStyle = 'rgba(0,8,20,0.25)'; ctx.fillRect(0,0,w,h); ctx.fillStyle = '#79b8ff'; for(let i=0;i<ypos.length;i++){ const text = letters[Math.floor(Math.random()*letters.length)]; const x = i * (w/cols); ctx.fillText(text, x, ypos[i]); ypos[i] += Math.random()*8 + 6; if (ypos[i] > h + 1000) ypos[i] = -10; } requestAnimationFrame(loop); }
  window.addEventListener('resize', setup); setup(); loop();
})();

// init
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  loadMoviesJson();
});
