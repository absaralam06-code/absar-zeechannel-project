const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let cachedToken = null;
let tokenExpiresAt = 0;

async function getPlatformToken(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  try {
    const res = await fetch('https://launchapi.zee5.com/token/platform_tokens.php?platform_name=web_app', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Token fetch failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data?.token) {
      cachedToken = data.token;
      tokenExpiresAt = now + 12 * 60 * 60 * 1000;
      return cachedToken;
    }
    throw new Error('Token not found in response');
  } catch (err) {
    console.error('Platform token error:', err.message);
    if (cachedToken) return cachedToken;
    throw err;
  }
}

function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    return {
      header: JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8')),
      payload: JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
    };
  } catch {
    return null;
  }
}

function generateDDToken() {
  return Buffer.from(JSON.stringify({
    schema_version: '1',
    os_name: 'N/A',
    os_version: 'N/A',
    platform_name: 'Chrome',
    platform_version: '120',
    device_name: '',
    app_name: 'Web',
    app_version: '2.52.31',
    player_capabilities: {
      audio_channel: ['STEREO'],
      video_codec: ['H264'],
      container: ['MP4', 'TS'],
      package: ['DASH', 'HLS'],
      resolution: ['240p', 'SD', 'HD', 'FHD'],
      dynamic_range: ['SDR']
    },
    security_capabilities: {
      encryption: ['WIDEVINE_AES_CTR'],
      widevine_security_level: ['L3'],
      hdcp_version: ['HDCP_V1', 'HDCP_V2', 'HDCP_V2_1', 'HDCP_V2_2']
    }
  })).toString('base64');
}

function generateGuestToken() {
  const hex = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function fetchZee5LiveStream(channelId, userToken = null) {
  const platformToken = await getPlatformToken();
  const guestToken = generateGuestToken();
  const ddToken = generateDDToken();
  const userType = userToken ? 'registered' : 'guest';

  const url = `https://spapi.zee5.com/singlePlayback/getDetails/secure?channel_id=${channelId}&device_id=${guestToken}&platform_name=desktop_web&translation=en&user_language=en,hi&country=IN&state=&app_version=4.24.0&user_type=${userType}&check_parental_control=false`;

  const requestBody = {
    'x-access-token': platformToken,
    'X-Z5-Guest-Token': guestToken,
    'x-dd-token': ddToken
  };

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Origin': 'https://www.zee5.com',
    'Referer': 'https://www.zee5.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  if (userToken) {
    headers['Authorization'] = `Bearer ${userToken}`;
    headers['X-Z5-AuthToken'] = userToken;
    requestBody['user_token'] = userToken;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  });

  const data = await res.json();
  const liveUrl = data.keyOsDetails?.video_token || null;
  const isDrm = data.keyOsDetails?.drm || false;

  return {
    success: !!liveUrl,
    channelId,
    title: data.assetDetails?.title || '',
    liveStreamUrl: liveUrl,
    isDrm,
    businessType: data.assetDetails?.business_type || '',
    errorCode: data.error_code || null,
    errorMessage: data.error_msg || null,
    rawKeyOs: data.keyOsDetails || null
  };
}

app.get('/api/token', async (req, res) => {
  try {
    const force = req.query.refresh === 'true';
    const token = await getPlatformToken(force);
    const decoded = decodeJwt(token);
    res.json({
      success: true,
      token,
      decoded,
      expiresAt: new Date(tokenExpiresAt).toISOString(),
      cached: !force
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/channels', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const pageSize = req.query.page_size || 100;
    const catalogUrl = `https://catalogapi.zee5.com/v1/channel?page=${page}&page_size=${pageSize}`;

    const catalogRes = await fetch(catalogUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    if (!catalogRes.ok) {
      return res.status(catalogRes.status).json({
        success: false,
        error: `Catalog API returned HTTP ${catalogRes.status}`
      });
    }

    const data = await catalogRes.json();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/channel/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = await getPlatformToken();

    const headers = {
      'Accept': 'application/json',
      'X-Access-Token': token,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    };

    const [detailsRes, licenseRes] = await Promise.allSettled([
      fetch(`https://gwapi.zee5.com/contentlight/details/${id}`, { headers }),
      fetch(`https://gwapi.zee5.com/content/details_with_licences/${id}`, { headers })
    ]);

    let channelDetails = null;
    let licenses = null;

    if (detailsRes.status === 'fulfilled' && detailsRes.value.ok) {
      const d = await detailsRes.value.json();
      channelDetails = d.channelDetails || d;
    }

    if (licenseRes.status === 'fulfilled' && licenseRes.value.ok) {
      licenses = await licenseRes.value.json();
    }

    res.json({
      success: true,
      id,
      channelDetails,
      licenses
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/genres-languages', async (req, res) => {
  try {
    const token = await getPlatformToken();
    const headers = {
      'Accept': 'application/json',
      'X-Access-Token': token,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    };

    const [genresRes, languagesRes] = await Promise.allSettled([
      fetch('https://contentapi.zee5.com/content/seo/genres-languages?type=genre&country=IN&asset_subtype=livetv', { headers }),
      fetch('https://contentapi.zee5.com/content/seo/genres-languages?type=language&country=IN&asset_subtype=livetv', { headers })
    ]);

    const genres = genresRes.status === 'fulfilled' && genresRes.value.ok ? await genresRes.value.json() : { genres: [] };
    const languages = languagesRes.status === 'fulfilled' && languagesRes.value.ok ? await languagesRes.value.json() : { languages: [] };

    res.json({
      success: true,
      genres: genres.genres || [],
      languages: languages.languages || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/appconfig', async (req, res) => {
  try {
    const country = req.query.country || 'IN';
    const configRes = await fetch(`https://launchapi.zee5.com/appconfig?country=${country}&platform_name=web_app`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    const data = await configRes.json();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/country', async (req, res) => {
  try {
    const r = await fetch('https://xtra.zee5.com/country');
    const data = await r.json();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/countrylist', async (req, res) => {
  try {
    const r = await fetch('https://launchapi.zee5.com/countrylist');
    const data = await r.json();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/spapi/secure', async (req, res) => {
  try {
    const token = await getPlatformToken();
    const targetUrl = req.body.url || 'https://spapi.zee5.com/singlePlayback/v2/getDetails/secure';
    const customHeaders = req.body.headers || {};
    const payload = req.body.payload || { content_id: req.body.content_id || '0-9-zeetv' };

    const startTime = Date.now();
    const spRes = await fetch(targetUrl, {
      method: req.body.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': token,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Origin': 'https://www.zee5.com',
        'Referer': 'https://www.zee5.com/',
        ...customHeaders
      },
      body: req.body.method === 'GET' ? undefined : JSON.stringify(payload)
    });

    const duration = Date.now() - startTime;
    const text = await spRes.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    res.json({
      success: spRes.ok,
      status: spRes.status,
      durationMs: duration,
      targetUrl,
      response: parsed
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/graphql', async (req, res) => {
  try {
    const token = await getPlatformToken();
    const startTime = Date.now();
    const gRes = await fetch('https://artemis.zee5.com/artemis/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': token,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: JSON.stringify(req.body)
    });

    const duration = Date.now() - startTime;
    const data = await gRes.json();
    res.json({
      success: gRes.ok,
      status: gRes.status,
      durationMs: duration,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/stream/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const userToken = req.headers['x-user-token'] || req.query.token || null;
    const streamInfo = await fetchZee5LiveStream(channelId, userToken);
    res.json(streamInfo);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/live-channels', (req, res) => {
  res.json({
    success: true,
    channels: [
      { id: '0-9-zeenews', title: 'Zee News Live HD', genre: 'News', lang: 'hi', badge: 'LIVE 24x7' },
      { id: '0-9-aajtak', title: 'Aaj Tak Live HD', genre: 'News', lang: 'hi', badge: 'LIVE 24x7' },
      { id: '0-9-indiatoday', title: 'India Today Live HD', genre: 'News', lang: 'en', badge: 'LIVE 24x7' },
      { id: '0-9-zeerajasthannews', title: 'Zee Rajasthan News', genre: 'News', lang: 'hi', badge: 'LIVE 24x7' },
      { id: '0-9-9z583538', title: 'Zee News Telugu', genre: 'News', lang: 'te', badge: 'LIVE 24x7' },
      { id: '0-9-9z51072553', title: 'Zee Cine Classic', genre: 'Movie', lang: 'hi', badge: 'MOVIES LIVE' },
      { id: '0-9-9z51072556', title: 'Zee Comedy Nation', genre: 'Comedy', lang: 'hi', badge: 'COMEDY LIVE' },
      { id: '0-9-9z51072894', title: 'Zee South Flix', genre: 'Entertainment', lang: 'hi', badge: 'ACTION LIVE' },
      { id: '0-9-9z51072892', title: 'Zee Dil Se', genre: 'Entertainment', lang: 'hi', badge: 'ROMANCE LIVE' },
      { id: '0-9-9z51072893', title: 'Zee Horror Nights', genre: 'Entertainment', lang: 'hi', badge: 'HORROR LIVE' }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
