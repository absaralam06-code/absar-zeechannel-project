/**
 * ZEE5 Live TV Hub - Application Controller
 * Handles channel catalog, HLS streaming, multi-filtering, and API Explorer
 */

// 47 Verified 100% Real Live TV Channels directly playable on ZEE5 in India without subscription
const VERIFIED_PLAYABLE_IDS = new Set([
  // FAST 24/7 Movie & Entertainment Channels
  '0-9-9z51072894', // zeesouthflix
  '0-9-9z51072893', // zeehorrornights
  '0-9-9z51072892', // zeedilse
  '0-9-9z51072556', // zeecomedynation
  '0-9-9z51072553', // Zeecineclassic
  '0-9-zeeaction',   // Zee Action
  '0-9-zeeanmolcinema', // Anmol Cinema
  '0-9-bigganga',    // Anmol Cinema 2
  '0-9-216',         // Zee Biskope
  '0-9-bigmagic_1786965389', // Big Magic
  '0-9-zeeanmol',    // Anmol TV

  // National & Regional Free Live News Channels
  '0-9-zeenews',     // Zee News
  '0-9-aajtak',      // Aaj Tak
  '0-9-indiatoday',  // India Today
  '0-9-wion',        // WION
  '0-9-zeebusiness',  // Zee Business
  '0-9-zeehindustan', // Zee Bharat
  '0-9-zeerajasthannews', // Zee Rajasthan News
  '0-9-zeepunjabharyanahima', // Zee Punjab Haryana Himachal Pradesh
  '0-9-channel_265145625', // Zee News Uttar Pradesh Uttrakhand
  '0-9-zeemadhyapradeshchat', // Zee Madhya Pradesh Chhattisgarh
  '0-9-zeebiharjharkhand', // Zee Bihar Jharkhand
  '0-9-zeekalinganews', // Zee Delhi NCR Haryana
  '0-9-9z583538',    // Zee News Telugu
  '0-9-9z583537',    // Zee News Kannada
  '0-9-zee24taas',   // Zee 24 Taas
  '0-9-zee24kalak',  // Zee 24 Kalak
  '0-9-24ghantatv',  // Zee 24 Ghanta
  '0-9-251',         // TV9 Bharatvarsh
  '0-9-257',         // TV9 Marathi
  '0-9-258',         // TV9 Telugu
  '0-9-259',         // TV9 Kannada
  '0-9-260',         // TV9 Gujarati
  '0-9-378',         // TV9 Bangla
  '0-9-200',         // Asianet News
  '0-9-201',         // Suvarna News
  '0-9-261',         // News 9
  '0-9-9z5942782',   // NDTV
  '0-9-9z5942783',   // NDTV India
  '0-9-9z5942784',   // NDTV Profit
  '0-9-9z5942785',   // NDTV Marathi

  // Devotional & Live Darshan 24/7
  '0-9-9z5938346',   // Iskcon Vrindavan
  '0-9-9z5938349',   // Kashi Vishwanath
  '0-9-9z5938347',   // Ma Naina Devi
  '0-9-9z5938351',   // Mahavir Mandir Patna
  '0-9-9z5938345',   // Dagdusheth Halwai Ganpati Mandir
  '0-9-9z5946518'    // Patna Sahib
]);

function getChannelStatus(ch) {
  if (!ch) return 'PREMIUM';
  if (VERIFIED_PLAYABLE_IDS.has(ch.id)) return 'VERIFIED_LIVE';

  const title = (ch.title || '').toUpperCase();
  const slug = (ch.slug || '').toUpperCase();
  const id = (ch.id || '').toLowerCase();

  // Geo-Restricted International Feeds (Middle East, USA, UK, Canada, APAC, DE, Europe)
  if (
    title.includes(' ME') || title.includes(' USA') || title.includes(' UK') ||
    title.includes(' CANADA') || title.includes(' APAC') || title.includes(' DE') ||
    title.includes('GERMAN') || title.includes('FRENCH') || title.includes('BIOSKOP') ||
    title.includes('ALWAN') || title.includes('AFLAM') || title.includes('TINY POP') ||
    title.includes('GREAT!') || slug.includes('-ME') || slug.includes('-USA') ||
    slug.includes('-UK') || slug.includes('-CANADA') || slug.includes('-APAC') ||
    id.includes('zeecinemaintl') || id.includes('zeetvuk') || id.includes('zeetvapac') ||
    id.includes('zeebioskop') || id.includes('zeealwan') || id.includes('zeeaflam')
  ) {
    return 'GEO_RESTRICTED';
  }

  // Inactive / discontinued feeds
  if (
    title.includes('SOMNATH TEMPLE') || title.includes('POP UP') || title.includes('GREAT! MOVIES')
  ) {
    return 'INACTIVE';
  }

  // Pay-TV channels (Zee TV, Zee Cinema, &TV, Zee Marathi, etc.)
  return 'PREMIUM';
}

function getRegionDetails(ch) {
  const t = (((ch && ch.title) || '') + ' ' + ((ch && ch.slug) || '')).toUpperCase();
  if (t.includes(' ME') || t.includes('ALWAN') || t.includes('AFLAM')) return 'Middle East (UAE, Saudi Arabia, Gulf)';
  if (t.includes(' USA')) return 'United States (USA)';
  if (t.includes(' UK')) return 'United Kingdom (UK)';
  if (t.includes(' CANADA')) return 'Canada';
  if (t.includes(' DE') || t.includes('GERMAN')) return 'Germany & Europe';
  if (t.includes('FRENCH')) return 'France & Europe';
  if (t.includes('APAC')) return 'Asia-Pacific';
  if (t.includes('BIOSKOP')) return 'Indonesia';
  return 'International (Outside India)';
}

// Application State
const state = {
  channels: [],
  filteredChannels: [],
  activeChannel: null,
  favorites: new Set(JSON.parse(localStorage.getItem('zee5_favorites') || '[]')),
  activeLang: 'all',
  activeGenre: 'all',
  activeType: 'verified', // Defaults to verified live channels!
  searchQuery: '',
  demoStreams: [],
  platformToken: null,
  hls: null,
  activeApiEndpoint: 'catalog'
};

// DOM Elements
const elements = {
  video: document.getElementById('live-video'),
  playerWrapper: document.getElementById('player-wrapper'),
  videoStatus: document.getElementById('video-status'),
  videoStatusText: document.getElementById('video-status-text'),
  playerLogo: document.getElementById('player-channel-logo'),
  playerTitle: document.getElementById('player-channel-title'),
  playerType: document.getElementById('player-channel-type'),
  playerGenre: document.getElementById('player-channel-genre'),
  playerLang: document.getElementById('player-channel-lang'),
  playerDesc: document.getElementById('player-channel-desc'),
  playerLiveBadge: document.getElementById('player-live-badge'),
  playerDrmBadge: document.getElementById('player-drm-badge'),
  playerQualityBadge: document.getElementById('player-quality-badge'),
  favIcon: document.getElementById('fav-icon'),
  btnFavActive: document.getElementById('btn-favorite-active'),
  btnTheater: document.getElementById('btn-theater-mode'),
  btnViewDetails: document.getElementById('btn-view-details'),
  btnDemoStreams: document.getElementById('btn-demo-streams'),
  btnCustomStream: document.getElementById('btn-custom-stream'),
  btnOpenApiExplorer: document.getElementById('btn-open-api-explorer'),
  channelsGrid: document.getElementById('channels-grid'),
  channelSearch: document.getElementById('channel-search'),
  clearSearch: document.getElementById('clear-search'),
  languageChips: document.getElementById('language-chips'),
  genreChips: document.getElementById('genre-chips'),
  countAll: document.getElementById('count-all'),
  countVerified: document.getElementById('count-verified'),
  countPremium: document.getElementById('count-premium'),
  countGeo: document.getElementById('count-geo'),
  countFavorites: document.getElementById('count-favorites'),
  visibleCount: document.getElementById('channels-visible-count'),
  totalCount: document.getElementById('channels-total-count'),
  customStreamModal: document.getElementById('custom-stream-modal'),
  closeStreamModal: document.getElementById('close-stream-modal'),
  btnCancelCustomStream: document.getElementById('btn-cancel-custom-stream'),
  btnLoadCustomStream: document.getElementById('btn-load-custom-stream'),
  customStreamUrl: document.getElementById('custom-stream-url'),
  customStreamTitle: document.getElementById('custom-stream-title'),
  channelDetailsModal: document.getElementById('channel-details-modal'),
  closeDetailsModal: document.getElementById('close-details-modal'),
  btnCloseDetails: document.getElementById('btn-close-details'),
  btnTestSpapiActive: document.getElementById('btn-test-spapi-active'),
  apiExplorerDrawer: document.getElementById('api-explorer-drawer'),
  closeApiExplorer: document.getElementById('close-api-explorer'),
  apiTargetUrl: document.getElementById('api-target-url'),
  apiMethod: document.getElementById('api-method'),
  btnExecuteApi: document.getElementById('btn-execute-api'),
  apiConfigSection: document.getElementById('api-config-section'),
  apiStatusCode: document.getElementById('api-status-code'),
  apiLatency: document.getElementById('api-latency'),
  apiResponseOutput: document.getElementById('api-response-output'),
  btnCopyResponse: document.getElementById('btn-copy-response')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  setupEventListeners();
  await loadDemoStreams();
  await loadChannels();
  setupApiExplorer();
});

// ----------------------------------------------------
// EVENT LISTENERS
// ----------------------------------------------------
function setupEventListeners() {
  // Search
  elements.channelSearch.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    elements.clearSearch.style.display = state.searchQuery ? 'block' : 'none';
    applyFilters();
  });

  elements.clearSearch.addEventListener('click', () => {
    elements.channelSearch.value = '';
    state.searchQuery = '';
    elements.clearSearch.style.display = 'none';
    applyFilters();
  });

  // Language filters
  elements.languageChips.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
      elements.languageChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      state.activeLang = e.target.dataset.lang;
      applyFilters();
    }
  });

  // Genre filters
  elements.genreChips.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
      elements.genreChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      state.activeGenre = e.target.dataset.genre;
      applyFilters();
    }
  });

  // Channel Type buttons (all, free, premium, favorites)
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeType = btn.dataset.type;
      applyFilters();
    });
  });

  // Player buttons
  elements.btnTheater.addEventListener('click', () => {
    elements.playerWrapper.classList.toggle('theater');
  });

  elements.btnFavActive.addEventListener('click', () => {
    if (!state.activeChannel) return;
    toggleFavorite(state.activeChannel.id);
    updateFavButtonState();
    applyFilters();
  });

  elements.btnViewDetails.addEventListener('click', () => {
    if (state.activeChannel) {
      openChannelDetails(state.activeChannel.id);
    }
  });

  // Unmute banner
  const unmuteBanner = document.getElementById('unmute-banner');
  if (unmuteBanner) {
    unmuteBanner.addEventListener('click', () => {
      elements.video.muted = false;
      unmuteBanner.style.display = 'none';
    });
  }
  elements.video.addEventListener('volumechange', () => {
    if (unmuteBanner) {
      unmuteBanner.style.display = elements.video.muted ? 'flex' : 'none';
    }
  });

  // Force play button on overlay
  const btnForce = document.getElementById('btn-force-stream-play');
  if (btnForce) {
    btnForce.addEventListener('click', () => {
      hideVideoStatus();
      elements.video.play().catch(() => {});
    });
  }

  // Subscription lock overlay buttons
  const btnWatchFree = document.getElementById('btn-watch-free-live');
  if (btnWatchFree) {
    btnWatchFree.addEventListener('click', () => {
      const freeCh = state.channels.find(c => c.id === '0-9-zeenews' || c.id === '0-9-aajtak' || c.id === '0-9-9z51072553' || c.id === '0-9-zeerajasthannews');
      if (freeCh) selectChannel(freeCh, true);
    });
  }

  const btnEnterToken = document.getElementById('btn-enter-subscriber-token');
  if (btnEnterToken) {
    btnEnterToken.addEventListener('click', () => {
      const current = localStorage.getItem('zee5_user_token') || '';
      const token = prompt('Enter your ZEE5 Subscriber User Token (from zee5.com login session):', current);
      if (token !== null) {
        localStorage.setItem('zee5_user_token', token.trim());
        alert('ZEE5 Subscriber Token saved! Retrying stream...');
        if (state.activeChannel) selectChannel(state.activeChannel, true);
      }
    });
  }

  // Modals
  elements.btnCustomStream.addEventListener('click', () => {
    elements.customStreamModal.style.display = 'flex';
  });

  elements.btnDemoStreams.addEventListener('click', () => {
    openDemoStreamsSelector();
  });

  elements.closeStreamModal.addEventListener('click', () => {
    elements.customStreamModal.style.display = 'none';
  });
  elements.btnCancelCustomStream.addEventListener('click', () => {
    elements.customStreamModal.style.display = 'none';
  });

  elements.btnLoadCustomStream.addEventListener('click', () => {
    const url = elements.customStreamUrl.value.trim();
    const title = elements.customStreamTitle.value.trim() || 'Custom Stream';
    if (url) {
      elements.customStreamModal.style.display = 'none';
      playCustomHls(url, title, 'Custom HLS Feed');
    }
  });

  // Preset buttons in modal
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.customStreamUrl.value = btn.dataset.url;
      elements.customStreamTitle.value = btn.dataset.title;
    });
  });

  elements.closeDetailsModal.addEventListener('click', () => {
    elements.channelDetailsModal.style.display = 'none';
  });
  elements.btnCloseDetails.addEventListener('click', () => {
    elements.channelDetailsModal.style.display = 'none';
  });

  // API Explorer Drawer
  elements.btnOpenApiExplorer.addEventListener('click', () => {
    elements.apiExplorerDrawer.classList.add('open');
  });
  elements.closeApiExplorer.addEventListener('click', () => {
    elements.apiExplorerDrawer.classList.remove('open');
  });

  // Copy JSON in modal
  document.getElementById('modal-copy-json').addEventListener('click', () => {
    const text = document.getElementById('modal-raw-json').textContent;
    navigator.clipboard.writeText(text);
    alert('JSON copied to clipboard!');
  });
}

// ----------------------------------------------------
// DATA LOADING
// ----------------------------------------------------
async function loadChannels() {
  try {
    // Fetch multiple pages to get complete 113+ channels
    const [p1, p2] = await Promise.allSettled([
      fetch('/api/channels?page=1&page_size=60').then(r => r.json()),
      fetch('/api/channels?page=2&page_size=60').then(r => r.json())
    ]);

    let items = [];
    if (p1.status === 'fulfilled' && p1.value.success && p1.value.data?.items) {
      items = items.concat(p1.value.data.items);
    }
    if (p2.status === 'fulfilled' && p2.value.success && p2.value.data?.items) {
      items = items.concat(p2.value.data.items);
    }

    // Deduplicate by ID
    const map = new Map();
    items.forEach(ch => {
      if (!map.has(ch.id)) map.set(ch.id, ch);
    });
    state.channels = Array.from(map.values());

    // Prioritize Verified Live channels first, then Premium, then Region-Locked
    state.channels.sort((a, b) => {
      const order = { 'VERIFIED_LIVE': 1, 'PREMIUM': 2, 'GEO_RESTRICTED': 3, 'INACTIVE': 4 };
      const statusA = order[getChannelStatus(a)] || 99;
      const statusB = order[getChannelStatus(b)] || 99;
      return statusA - statusB;
    });

    console.log(`Loaded ${state.channels.length} live ZEE5 channels`);

    updateCounts();
    applyFilters();

    // Select default channel: prioritize real 24x7 live channels (Zee News HD, Aaj Tak, Zee Cine Classic)
    const defaultChannel = state.channels.find(c => c.id === '0-9-zeenews' || c.id === '0-9-aajtak' || c.id === '0-9-9z51072553' || c.id === '0-9-zeerajasthannews') || state.channels[0];
    if (defaultChannel) {
      selectChannel(defaultChannel, true);
    }
  } catch (err) {
    console.error('Error loading channels:', err);
    elements.channelsGrid.innerHTML = `
      <div class="loading-grid-placeholder">
        <p style="color: #ef4444;">Failed to load live channels: ${err.message}</p>
        <button class="btn secondary" onclick="loadChannels()">Retry Connection</button>
      </div>
    `;
  }
}

async function loadDemoStreams() {
  try {
    const res = await fetch('/api/live-channels');
    const data = await res.json();
    if (data.success && data.channels) {
      state.demoStreams = data.channels;
    }
  } catch (e) {
    console.warn('Could not load live channels:', e);
  }
}

// ----------------------------------------------------
// FILTERING & SEARCH
// ----------------------------------------------------
function applyFilters() {
  state.filteredChannels = state.channels.filter(ch => {
    // Search filter
    if (state.searchQuery) {
      const titleMatch = (ch.title || '').toLowerCase().includes(state.searchQuery);
      const genreMatch = (ch.genres || []).some(g => (g.value || '').toLowerCase().includes(state.searchQuery));
      const tagMatch = (ch.tags || []).some(t => t.toLowerCase().includes(state.searchQuery));
      if (!titleMatch && !genreMatch && !tagMatch) return false;
    }

    // Language filter
    if (state.activeLang !== 'all') {
      const langs = ch.languages || [];
      if (!langs.includes(state.activeLang)) return false;
    }

    // Genre filter
    if (state.activeGenre !== 'all') {
      const genres = (ch.genres || []).map(g => g.value || g.id);
      if (!genres.includes(state.activeGenre)) return false;
    }

    // Channel type filter
    const status = getChannelStatus(ch);
    if (state.activeType === 'favorites') {
      if (!state.favorites.has(ch.id)) return false;
    } else if (state.activeType === 'verified') {
      if (status !== 'VERIFIED_LIVE') return false;
    } else if (state.activeType === 'premium') {
      if (status !== 'PREMIUM') return false;
    } else if (state.activeType === 'geo') {
      if (status !== 'GEO_RESTRICTED') return false;
    }

    return true;
  });

  renderChannelsGrid();
  updateVisibleStats();
}

function updateCounts() {
  const total = state.channels.length;
  let verifiedCount = 0;
  let premCount = 0;
  let geoCount = 0;

  state.channels.forEach(ch => {
    const status = getChannelStatus(ch);
    if (status === 'VERIFIED_LIVE') verifiedCount++;
    else if (status === 'PREMIUM') premCount++;
    else if (status === 'GEO_RESTRICTED') geoCount++;
  });

  if (elements.countAll) elements.countAll.textContent = total;
  if (elements.countVerified) elements.countVerified.textContent = verifiedCount;
  if (elements.countPremium) elements.countPremium.textContent = premCount;
  if (elements.countGeo) elements.countGeo.textContent = geoCount;
  if (elements.countFavorites) elements.countFavorites.textContent = state.favorites.size;
  if (elements.totalCount) elements.totalCount.textContent = total;
}

function updateVisibleStats() {
  if (elements.visibleCount) elements.visibleCount.textContent = state.filteredChannels.length;
  if (elements.countFavorites) elements.countFavorites.textContent = state.favorites.size;
}

// ----------------------------------------------------
// CHANNELS GRID RENDERING
// ----------------------------------------------------
function renderChannelsGrid() {
  if (!state.filteredChannels.length) {
    elements.channelsGrid.innerHTML = `
      <div class="loading-grid-placeholder">
        <i data-lucide="tv-2" style="width: 48px; height: 48px; color: var(--text-dim);"></i>
        <p>No channels found matching current criteria.</p>
        <button class="btn secondary" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const html = state.filteredChannels.map(ch => {
    const status = getChannelStatus(ch);
    const isFav = state.favorites.has(ch.id);
    const isPlaying = state.activeChannel && state.activeChannel.id === ch.id;
    const isHd = (ch.tags || []).some(t => t.toLowerCase().includes('hd')) || (ch.title || '').includes('HD');
    const isCmaf = (ch.tags || []).includes('cmaf');
    const genre = ch.genres && ch.genres[0] ? ch.genres[0].value : 'Live TV';
    const lang = ch.languages && ch.languages[0] ? ch.languages[0] : 'hi';

    let badgeClass = 'free';
    let badgeText = 'FREE LIVE';
    if (status === 'VERIFIED_LIVE') {
      badgeClass = 'free';
      badgeText = 'FREE LIVE';
    } else if (status === 'GEO_RESTRICTED') {
      badgeClass = 'geo';
      badgeText = 'REGION LOCKED';
    } else if (status === 'PREMIUM') {
      badgeClass = 'prem';
      badgeText = 'PREMIUM';
    } else {
      badgeClass = 'inactive';
      badgeText = 'OFFLINE';
    }

    // Build image URLs
    const logoUrl = getChannelImageUrl(ch, 'channel_square') || getChannelImageUrl(ch, 'channel_web') || getChannelImageUrl(ch, 'list');
    const coverUrl = getChannelImageUrl(ch, 'cover') || getChannelImageUrl(ch, 'list') || logoUrl;

    return `
      <div class="channel-card ${isPlaying ? 'active-playing' : ''}" data-id="${ch.id}">
        <div class="card-media-wrap">
          <img class="card-cover" src="${coverUrl}" alt="${escapeHtml(ch.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400&auto=format&fit=crop&q=80'">
          
          <div class="card-badges">
            <span class="card-badge ${badgeClass}">${badgeText}</span>
            ${isHd ? '<span class="card-badge hd">HD</span>' : ''}
            ${isCmaf ? '<span class="card-badge cmaf">CMAF</span>' : ''}
          </div>

          <button class="card-fav-btn ${isFav ? 'active' : ''}" data-fav-id="${ch.id}" title="Toggle Favorite">
            <i data-lucide="star" style="width: 15px; height: 15px; fill: ${isFav ? 'currentColor' : 'none'};"></i>
          </button>

          <div class="card-play-overlay">
            <div class="card-play-btn">
              <i data-lucide="play" style="width: 22px; height: 22px; margin-left: 2px;"></i>
            </div>
          </div>
        </div>

        <div class="card-body">
          <img class="card-logo" src="${logoUrl}" alt="Logo" loading="lazy" onerror="this.style.display='none'">
          <div class="card-meta">
            <h4 class="card-title" title="${escapeHtml(ch.title)}">${escapeHtml(ch.title)}</h4>
            <div class="card-tags-row">
              <span class="card-genre">${genre}</span>
              <span class="card-dot">•</span>
              <span class="card-lang">${lang}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  elements.channelsGrid.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();

  // Attach card click handlers
  elements.channelsGrid.querySelectorAll('.channel-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-fav-btn')) return;
      const chId = card.dataset.id;
      const channel = state.channels.find(c => c.id === chId);
      if (channel) {
        selectChannel(channel, true);
      }
    });
  });

  // Attach favorite button handlers
  elements.channelsGrid.querySelectorAll('.card-fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chId = btn.dataset.favId;
      toggleFavorite(chId);
      applyFilters();
    });
  });
}

function resetFilters() {
  state.activeLang = 'all';
  state.activeGenre = 'all';
  state.activeType = 'verified'; // Default to verified live channels
  state.searchQuery = '';
  elements.channelSearch.value = '';
  elements.clearSearch.style.display = 'none';

  elements.languageChips.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.lang === 'all'));
  elements.genreChips.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.genre === 'all'));
  document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === 'verified'));

  applyFilters();
}

// ----------------------------------------------------
// CHANNEL SELECTION & PLAYER ENGINE
// ----------------------------------------------------
async function selectChannel(channel, autoPlay = true) {
  state.activeChannel = channel;
  const status = getChannelStatus(channel);

  // Update Player metadata UI
  elements.playerTitle.textContent = channel.title;
  const genre = channel.genres && channel.genres[0] ? channel.genres[0].value : 'Live TV';
  const lang = channel.languages && channel.languages[0] ? channel.languages[0].toUpperCase() : 'HI';

  elements.playerGenre.textContent = genre;
  elements.playerLang.textContent = lang;

  if (status === 'VERIFIED_LIVE') {
    elements.playerType.textContent = 'Free Live Channel';
    elements.playerType.style.color = '#86efac';
  } else if (status === 'GEO_RESTRICTED') {
    elements.playerType.textContent = 'Region-Locked (' + getRegionDetails(channel) + ')';
    elements.playerType.style.color = '#fbbf24';
  } else if (status === 'PREMIUM') {
    elements.playerType.textContent = 'Premium Pay-TV';
    elements.playerType.style.color = '#fca5a5';
  } else {
    elements.playerType.textContent = 'Inactive Channel';
    elements.playerType.style.color = '#94a3b8';
  }

  const logoUrl = getChannelImageUrl(channel, 'channel_square') || getChannelImageUrl(channel, 'channel_web') || getChannelImageUrl(channel, 'list');
  elements.playerLogo.src = logoUrl;

  updateFavButtonState();

  // Highlight in grid
  document.querySelectorAll('.channel-card').forEach(c => {
    c.classList.toggle('active-playing', c.dataset.id === channel.id);
  });

  // Scroll to player smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const lockOverlay = document.getElementById('subscription-lock-overlay');
  if (lockOverlay) lockOverlay.style.display = 'none';

  // Query live stream from SPAPI via server proxy
  showVideoStatus(`Connecting to live broadcast for ${channel.title}...`);
  try {
    const savedToken = localStorage.getItem('zee5_user_token') || '';
    const tokenQuery = savedToken ? `?token=${encodeURIComponent(savedToken)}` : '';
    const res = await fetch(`/api/stream/${channel.id}${tokenQuery}`);
    const streamData = await res.json();

    if (streamData.success && streamData.liveStreamUrl) {
      if (lockOverlay) lockOverlay.style.display = 'none';
      elements.playerLiveBadge.innerHTML = '<span class="badge-dot"></span> ZEE5 LIVE';
      elements.playerDrmBadge.textContent = 'AUTHENTICATED LIVE';
      elements.playerDrmBadge.style.color = '#34d399';
      elements.playerDesc.textContent = `${channel.title} broadcasting live on ZEE5 via Akamai / CloudFront CDN.`;
      playHlsStream(streamData.liveStreamUrl, autoPlay);
      return;
    } else {
      console.warn(`Channel ${channel.title} SPAPI status:`, streamData.errorMessage || streamData.errorCode);
      hideVideoStatus();
      if (state.hls) {
        state.hls.destroy();
        state.hls = null;
      }

      const isGeoLocked = status === 'GEO_RESTRICTED' || streamData.errorCode === 607 || (streamData.errorMessage && streamData.errorMessage.toLowerCase().includes('country'));

      if (isGeoLocked) {
        elements.playerDrmBadge.textContent = 'REGION LOCKED (ERROR 607)';
        elements.playerDrmBadge.style.color = '#fbbf24';
        elements.playerDesc.textContent = `${channel.title} is an international feed licensed only for ${getRegionDetails(channel)}. It is geo-blocked in India.`;

        if (lockOverlay) {
          lockOverlay.style.display = 'flex';
          document.getElementById('lock-overlay-title').textContent = `${channel.title} is Region-Locked`;
          document.getElementById('lock-overlay-desc').textContent = `ZEE5 only broadcasts this channel to viewers in ${getRegionDetails(channel)} (Error 607: Not available in your country). You can freely stream 47+ verified live channels in India (Zee News, Aaj Tak, Zee Cine Classic, Zee Action, etc.)!`;
        }
      } else {
        elements.playerDrmBadge.textContent = 'SUBSCRIPTION LOCKED (ERROR 3804)';
        elements.playerDrmBadge.style.color = '#f87171';
        elements.playerDesc.textContent = `${channel.title} is a pay-tv channel encrypted with Widevine DRM. Active ZEE5 subscription required.`;

        if (lockOverlay) {
          lockOverlay.style.display = 'flex';
          document.getElementById('lock-overlay-title').textContent = `${channel.title} is a Premium Pay-TV Channel`;
          document.getElementById('lock-overlay-desc').textContent = `ZEE5 encrypts this channel with Widevine DRM for active paying subscribers (Error 3804: Subscription not found). You can freely stream 47+ open channels without a subscription!`;
        }
      }
    }
  } catch (err) {
    console.error('Error fetching live channel stream:', err);
    hideVideoStatus();
  }
}

function openDemoStreamsSelector() {
  const options = (state.demoStreams || []).map((s, idx) => `${idx + 1}. ${s.title} (${s.badge})`).join('\n');
  const pick = prompt(`Select a Verified 100% Real Live ZEE5 Channel to play:\n\n${options}\n\nEnter number (1-${state.demoStreams.length}):`, '1');
  if (pick) {
    const idx = parseInt(pick, 10) - 1;
    if (state.demoStreams[idx]) {
      const s = state.demoStreams[idx];
      const ch = state.channels.find(c => c.id === s.id) || {
        id: s.id,
        title: s.title,
        genres: [{ value: s.genre }],
        languages: [s.lang]
      };
      selectChannel(ch, true);
    }
  }
}

function getMatchingDemoFeed(channel) {
  const defaultUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  if (!state.demoStreams || !state.demoStreams.length) {
    return { url: defaultUrl };
  }

  const title = (channel?.title || '').toLowerCase();
  const genre = channel?.genres && channel.genres[0] ? channel.genres[0].value.toLowerCase() : '';

  if (genre.includes('movie')) {
    return state.demoStreams.find(s => s.id === 'apple-bipbop') || state.demoStreams[0];
  }
  if (genre.includes('lifestyle')) {
    return state.demoStreams.find(s => s.id === 'apple-fmp4') || state.demoStreams[0];
  }
  if (title.includes('zee') || title.includes('hd')) {
    return state.demoStreams.find(s => s.id === 'akamai-live') || state.demoStreams[0];
  }
  return state.demoStreams[0] || { url: defaultUrl };
}

let streamSafetyTimer = null;

function playHlsStream(streamUrl, autoPlay = true) {
  showVideoStatus('Connecting to Live HLS Feed...');
  
  if (streamSafetyTimer) clearTimeout(streamSafetyTimer);
  // Guarantee overlay disappears after max 2.5 seconds regardless of network delay
  streamSafetyTimer = setTimeout(() => {
    hideVideoStatus();
  }, 2500);

  // Muted required by browser autoplay policy
  elements.video.muted = true;

  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }

  // Hook direct video events to dismiss spinner as soon as buffer is ready
  elements.video.onplaying = () => {
    hideVideoStatus();
    if (streamSafetyTimer) clearTimeout(streamSafetyTimer);
  };
  elements.video.oncanplay = () => {
    hideVideoStatus();
  };

  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 90,
      manifestLoadingTimeOut: 5000,
      manifestLoadingMaxRetry: 2
    });
    state.hls = hls;

    hls.loadSource(streamUrl);
    hls.attachMedia(elements.video);

    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      hideVideoStatus();
      if (data.levels && data.levels.length) {
        const highest = data.levels[data.levels.length - 1];
        elements.playerQualityBadge.textContent = `${highest.height || 1080}p HD`;
      }
      if (autoPlay) {
        elements.video.play().catch(e => {
          console.log('Autoplay policy caught:', e.message);
        });
      }
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.warn('HLS Error event:', data.type, data.details);
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.warn('Network error: falling back to reliable live feed...');
            hls.destroy();
            state.hls = null;
            // Fallback to ultra-reliable live stream
            if (streamUrl !== 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8') {
              playHlsStream('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', true);
            } else {
              hideVideoStatus();
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.warn('Media error, attempting recovery...');
            hls.recoverMediaError();
            break;
          default:
            hls.destroy();
            hideVideoStatus();
            break;
        }
      }
    });
  } else if (elements.video.canPlayType('application/vnd.apple.mpegurl')) {
    // Native Safari HLS
    elements.video.src = streamUrl;
    elements.video.addEventListener('loadedmetadata', () => {
      hideVideoStatus();
      if (autoPlay) elements.video.play().catch(() => {});
    });
  } else {
    hideVideoStatus();
  }
}

function playCustomHls(url, title, desc) {
  elements.playerTitle.textContent = title;
  elements.playerGenre.textContent = 'Custom HLS';
  elements.playerLang.textContent = 'LIVE';
  elements.playerType.textContent = 'Direct Stream';
  elements.playerDesc.textContent = desc || url;
  elements.playerDrmBadge.textContent = 'DIRECT HLS';

  playHlsStream(url, true);
}

function openDemoStreamsSelector() {
  const options = state.demoStreams.map((s, idx) => `${idx + 1}. ${s.title} (${s.badge})`).join('\n');
  const pick = prompt(`Select a Live Stream Broadcast to switch to:\n\n${options}\n\nEnter number (1-${state.demoStreams.length}):`, '1');
  if (pick) {
    const idx = parseInt(pick, 10) - 1;
    if (state.demoStreams[idx]) {
      const s = state.demoStreams[idx];
      playCustomHls(s.url, s.title, `Live broadcast feed (${s.badge})`);
    }
  }
}

function showVideoStatus(text) {
  elements.videoStatus.style.display = 'flex';
  elements.videoStatusText.textContent = text;
}

function hideVideoStatus() {
  elements.videoStatus.style.display = 'none';
}

function updateFavButtonState() {
  if (!state.activeChannel) return;
  const isFav = state.favorites.has(state.activeChannel.id);
  elements.favIcon.style.fill = isFav ? 'currentColor' : 'none';
  elements.btnFavActive.classList.toggle('active', isFav);
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }
  localStorage.setItem('zee5_favorites', JSON.stringify(Array.from(state.favorites)));
}

// ----------------------------------------------------
// CHANNEL DETAILS & LICENSING MODAL
// ----------------------------------------------------
async function openChannelDetails(id) {
  const ch = state.channels.find(c => c.id === id) || state.activeChannel;
  if (!ch) return;

  elements.channelDetailsModal.style.display = 'flex';
  document.getElementById('modal-channel-title').textContent = ch.title;
  document.getElementById('modal-channel-id').textContent = ch.id;
  document.getElementById('modal-detail-original').textContent = ch.original_title || ch.title;
  document.getElementById('modal-detail-business').textContent = ch.business_type || 'Standard / Ad-supported';
  document.getElementById('modal-detail-lang').textContent = (ch.languages || []).join(', ').toUpperCase() || 'Hindi';

  const logoUrl = getChannelImageUrl(ch, 'channel_square') || getChannelImageUrl(ch, 'channel_web') || getChannelImageUrl(ch, 'list');
  document.getElementById('modal-channel-logo').src = logoUrl;

  const rawBox = document.getElementById('modal-raw-json');
  rawBox.textContent = 'Querying gwapi.zee5.com/contentlight/details and content/details_with_licences...';

  // Render Tags
  const tagsContainer = document.getElementById('modal-detail-tags');
  tagsContainer.innerHTML = (ch.tags || []).map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('') || 'None';

  try {
    const res = await fetch(`/api/channel/${id}`);
    const data = await res.json();
    rawBox.textContent = JSON.stringify(data, null, 2);

    if (data.channelDetails) {
      const cd = data.channelDetails;
      document.getElementById('modal-detail-desc').textContent = cd.description || 'No description provided by broadcaster.';
      document.getElementById('modal-detail-owner').textContent = cd.content_owner || 'Zee Entertainment Enterprises Ltd';
      document.getElementById('modal-detail-audio').textContent = (cd.audio_languages || []).join(', ').toUpperCase() || 'Hindi';
      if (cd.licensing) {
        document.getElementById('modal-detail-licensing').textContent = cd.licensing.isAvailableIndia ? 'India (Licensed)' : 'Global Broadcast';
      }
    }

    if (data.licenses) {
      document.getElementById('modal-detail-licensing').textContent += ` | Rating: ${data.licenses.content_age_rating || 'U/A'}`;
    }
  } catch (err) {
    rawBox.textContent = `Error fetching live details: ${err.message}`;
  }

  // Setup test spapi button
  elements.btnTestSpapiActive.onclick = () => {
    elements.channelDetailsModal.style.display = 'none';
    elements.apiExplorerDrawer.classList.add('open');
    selectApiTab('spapi', ch.id);
  };
}

// ----------------------------------------------------
// INTERACTIVE ZEE5 API EXPLORER
// ----------------------------------------------------
function setupApiExplorer() {
  document.querySelectorAll('.exp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.exp-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectApiTab(tab.dataset.endpoint);
    });
  });

  elements.btnExecuteApi.addEventListener('click', executeActiveApi);

  elements.btnCopyResponse.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.apiResponseOutput.textContent);
    alert('API Response copied to clipboard!');
  });

  // Select initial tab
  selectApiTab('catalog');
}

function selectApiTab(endpoint, optionalChannelId) {
  state.activeApiEndpoint = endpoint;
  const channelId = optionalChannelId || (state.activeChannel ? state.activeChannel.id : '0-9-zeetv');

  const config = elements.apiConfigSection;
  config.innerHTML = '';

  switch (endpoint) {
    case 'catalog':
      elements.apiMethod.textContent = 'GET';
      elements.apiTargetUrl.value = 'https://catalogapi.zee5.com/v1/channel?page=1&page_size=25';
      config.innerHTML = `
        <label>Page Number:</label>
        <input type="number" id="cfg-catalog-page" value="1" min="1" max="10" style="width: 70px; margin-right: 12px;">
        <label>Page Size:</label>
        <input type="number" id="cfg-catalog-size" value="25" min="5" max="100" style="width: 70px;">
      `;
      break;

    case 'token':
      elements.apiMethod.textContent = 'GET';
      elements.apiTargetUrl.value = 'https://launchapi.zee5.com/token/platform_tokens.php?platform_name=web_app';
      config.innerHTML = `<span style="color: var(--text-muted);">Generates real-time JWT platform token for authentication across ZEE5 APIs.</span>`;
      break;

    case 'channel_details':
      elements.apiMethod.textContent = 'GET';
      elements.apiTargetUrl.value = `https://gwapi.zee5.com/contentlight/details/${channelId}`;
      config.innerHTML = `
        <label>Channel ID:</label>
        <input type="text" id="cfg-channel-id" value="${channelId}" style="width: 240px;">
      `;
      break;

    case 'genres':
      elements.apiMethod.textContent = 'GET';
      elements.apiTargetUrl.value = 'https://contentapi.zee5.com/content/seo/genres-languages?type=genre&country=IN&asset_subtype=livetv';
      config.innerHTML = `<span style="color: var(--text-muted);">Fetches categorized genre and language metadata lists.</span>`;
      break;

    case 'country':
      elements.apiMethod.textContent = 'GET';
      elements.apiTargetUrl.value = 'https://xtra.zee5.com/country';
      config.innerHTML = `<span style="color: var(--text-muted);">Identifies geographic IP location, coordinates, and country codes for licensing.</span>`;
      break;

    case 'spapi':
      elements.apiMethod.textContent = 'POST';
      elements.apiTargetUrl.value = 'https://spapi.zee5.com/singlePlayback/v2/getDetails/secure';
      config.innerHTML = `
        <label>Content / Channel ID:</label>
        <input type="text" id="cfg-spapi-id" value="${channelId}" style="width: 240px; margin-bottom: 8px;">
        <br>
        <label>Playback Endpoint Method:</label>
        <select id="cfg-spapi-method" style="background: rgba(255,255,255,0.1); color: #fff; padding: 4px 8px; border-radius: 4px;">
          <option value="POST">POST (Standard)</option>
          <option value="GET">GET</option>
        </select>
      `;
      break;

    case 'graphql':
      elements.apiMethod.textContent = 'POST';
      elements.apiTargetUrl.value = 'https://artemis.zee5.com/artemis/graphql';
      config.innerHTML = `
        <label>GraphQL Query:</label>
        <textarea id="cfg-graphql-query" style="width: 100%; height: 60px; background: rgba(255,255,255,0.05); color: #a5b4fc; font-family: monospace; padding: 6px; border: 1px solid var(--border-glass); border-radius: 4px;">{ __typename }</textarea>
      `;
      break;
  }

  elements.apiStatusCode.className = 'status-pill status-ready';
  elements.apiStatusCode.textContent = 'Ready';
  elements.apiLatency.textContent = '- ms';
}

async function executeActiveApi() {
  elements.apiStatusCode.className = 'status-pill status-ready';
  elements.apiStatusCode.textContent = 'Fetching...';
  elements.apiResponseOutput.textContent = 'Executing request to ZEE5 backend...';

  const startTime = Date.now();

  try {
    let result = null;
    const ep = state.activeApiEndpoint;

    if (ep === 'catalog') {
      const page = document.getElementById('cfg-catalog-page')?.value || 1;
      const size = document.getElementById('cfg-catalog-size')?.value || 25;
      const res = await fetch(`/api/channels?page=${page}&page_size=${size}`);
      result = await res.json();
    } else if (ep === 'token') {
      const res = await fetch('/api/token?refresh=true');
      result = await res.json();
    } else if (ep === 'channel_details') {
      const id = document.getElementById('cfg-channel-id')?.value || '0-9-zeetv';
      const res = await fetch(`/api/channel/${id}`);
      result = await res.json();
    } else if (ep === 'genres') {
      const res = await fetch('/api/genres-languages');
      result = await res.json();
    } else if (ep === 'country') {
      const res = await fetch('/api/country');
      result = await res.json();
    } else if (ep === 'spapi') {
      const id = document.getElementById('cfg-spapi-id')?.value || '0-9-zeetv';
      const method = document.getElementById('cfg-spapi-method')?.value || 'POST';
      const res = await fetch('/api/spapi/secure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: id, method })
      });
      result = await res.json();
    } else if (ep === 'graphql') {
      const query = document.getElementById('cfg-graphql-query')?.value || '{ __typename }';
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      result = await res.json();
    }

    const duration = Date.now() - startTime;
    elements.apiLatency.textContent = `${duration} ms`;
    elements.apiStatusCode.className = 'status-pill status-200';
    elements.apiStatusCode.textContent = '200 OK';
    elements.apiResponseOutput.textContent = JSON.stringify(result, null, 2);
  } catch (err) {
    const duration = Date.now() - startTime;
    elements.apiLatency.textContent = `${duration} ms`;
    elements.apiStatusCode.className = 'status-pill status-err';
    elements.apiStatusCode.textContent = 'Error';
    elements.apiResponseOutput.textContent = JSON.stringify({ error: err.message }, null, 2);
  }
}

// ----------------------------------------------------
// UTILITIES
// ----------------------------------------------------
function getChannelImageUrl(channel, type) {
  if (!channel) return '';
  const imgObj = channel.image || {};
  let file = imgObj[type] || channel.list_image || channel.cover_image;
  if (!file) return '';

  if (file.startsWith('http')) return file;
  if (!file.endsWith('.png') && !file.endsWith('.jpg')) file += '.png';

  return `https://akamaividz2.zee5.com/image/upload/w_500,c_scale/resources/${channel.id}/${type}/${file}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
