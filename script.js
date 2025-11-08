// Template player that reads movies.json and plays provided URLs
const MOVIES_JSON = "movies.json";
const PAGE_SIZE = 12;

let movies = [];
let filtered = [];
let currentPage = 1;
let currentGenre = "";
let currentQuery = "";

const dom = {
  moviesGrid: document.getElementById("moviesGrid"),
  searchInput: document.getElementById("searchInput"),
  searchBtn: document.getElementById("searchBtn"),
  genreSelect: document.getElementById("genreSelect"),
  playerBox: document.getElementById("playerBox"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageInfo: document.getElementById("pageInfo"),
  allBtn: document.getElementById("allBtn")
};

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/[&<>"']/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; });
}

async function loadMoviesJson() {
  try {
    const res = await fetch(MOVIES_JSON);
    movies = await res.json();
    // extract genres
    const genres = Array.from(new Set(movies.map(m => m.genre).filter(Boolean))).sort();
    genres.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      dom.genreSelect.appendChild(opt);
    });
    applyFilters();
  } catch (e) {
    dom.moviesGrid.innerHTML = '<div style="padding:18px;color:#f7bdbd">Gagal memuat movies.json. Pastikan file ada di folder yang sama.</div>';
    console.error(e);
  }
}

function applyFilters() {
  currentQuery = dom.searchInput.value.trim().toLowerCase();
  currentGenre = dom.genreSelect.value;
  filtered = movies.filter(m => {
    const matchesQ = !currentQuery || (m.title && m.title.toLowerCase().includes(currentQuery));
    const matchesG = !currentGenre || (m.genre === currentGenre);
    return matchesQ && matchesG;
  });
  currentPage = 1;
  renderPage();
}

function renderPage() {
  dom.moviesGrid.innerHTML = "";
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  if (pageItems.length === 0) {
    dom.moviesGrid.innerHTML = '<div style="padding:18px;color:#bcdff8">Tidak ada hasil.</div>';
    dom.pageInfo.textContent = 'Page 0';
    dom.prevPage.disabled = true;
    dom.nextPage.disabled = true;
    return;
  }
  pageItems.forEach(m => {
    const card = document.createElement("div");
    card.className = "movie-card";
    const img = m.image || "";
    card.innerHTML = `
      <img class="movie-poster" src="${img}" alt="${escapeHtml(m.title)}" />
      <div class="movie-title">${escapeHtml(m.title)}</div>
      <div class="movie-meta"><div>${m.year || ''}</div><div>${m.genre || ''}</div></div>
      <div class="movie-actions">
        <button class="btn watchFilm" data-url="${encodeURIComponent(m.url)}">Tonton Film</button>
        <a class="btn outline" href="${m.url}" target="_blank" rel="noopener">Buka di Tab Baru</a>
      </div>
    `;
    dom.moviesGrid.appendChild(card);
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  dom.pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
  dom.prevPage.disabled = currentPage <= 1;
  dom.nextPage.disabled = currentPage >= totalPages;
}

function bindEvents() {
  dom.searchBtn.addEventListener("click", applyFilters);
  dom.searchInput.addEventListener("keydown", (e) => { if (e.key === 'Enter') applyFilters(); });
  dom.genreSelect.addEventListener("change", applyFilters);
  dom.prevPage.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderPage(); } });
  dom.nextPage.addEventListener("click", () => { currentPage++; renderPage(); });
  dom.moviesGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".watchFilm");
    if (!btn) return;
    const url = decodeURIComponent(btn.dataset.url || "");
    playVideo(url);
  });
  dom.allBtn.addEventListener("click", () => { dom.genreSelect.value = ''; applyFilters(); });
}

function playVideo(url) {
  if (!url) {
    dom.playerBox.innerHTML = '<div style="color:#f7bdbd">URL film tidak tersedia.</div>';
    return;
  }
  // If it's an HLS (m3u8) file, we can try to use native if supported or use video.js/hls.js (not included).
  const isHls = url.endsWith('.m3u8');
  if (isHls) {
    dom.playerBox.innerHTML = `<video class="player-video" controls crossorigin playsinline>
      <source src="${url}" type="application/x-mpegURL">
      Browser kamu mungkin tidak mendukung HLS native. Buka di tab baru lewat tombol "Buka di Tab Baru".
    </video>`;
  } else {
    dom.playerBox.innerHTML = `<video class="player-video" controls crossorigin playsinline>
      <source src="${url}" type="video/mp4">
      Browser kamu tidak mendukung pemutaran video ini.
    </video>`;
  }
  // try autoplay (may be blocked by browser)
  const v = dom.playerBox.querySelector('video');
  if (v) {
    v.play().catch(()=>{});
  }
}

function init() {
  bindEvents();
  loadMoviesJson();
  // small anti-adblock neutralizer (safe): hide common adblock warnings if present in older templates
  try {
    document.querySelectorAll('[id*=adblock],[class*=adblock]').forEach(n=>n.style.display='none');
  } catch(e){}
  // matrix canvas animation (simple)
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
}

init();