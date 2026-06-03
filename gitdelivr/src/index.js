const CONFIG = {
  routes: {
    chat: '/api/chat',
    proxy: '/proxy',
    status: '/status.json',
    cdn: /^\/(gh|gl|bb|npm|wp)\/(.+)$/,
  },
  cors: {
    allowedOrigins: [
      'https://gitdelivr.in',
      'https://gitdelivr.github.io',
      'http://localhost:3000',
      'http://127.0.0.1:5500',
      'https://pakshi.in',
    ],
    methods: 'GET, HEAD, POST, OPTIONS',
    headers: 'Content-Type, Range',
    expose: 'Accept-Ranges, Cache-Control, Content-Length, Content-Range, Content-Type, ETag, Last-Modified',
    maxAge: '86400',
  },
  cache: {
    cdn: 86400,
    static: 31536000,
  },
  chat: {
    model: 'gemini-1.5-flash',
    system:
      'You are the official support assistant for GitDelivr V3.5. GitDelivr is a Native Edge CDN that allows developers to generate production-ready CDN links directly from GitHub, GitLab, and Bitbucket raw files. You must answer user queries politely, concisely, and only related to web development, CDN, or GitDelivr features. Do not write code unless asked.',
  },
  proxy: {
    allowedDomains: [
      'drive.google.com',
      'github.com',
      'raw.githubusercontent.com',
      'gitlab.com',
      'bitbucket.org',
      'youtube.com',
      'youtu.be',
      'pakshi.in',
    ],
    redirectDomains: [
      'drive.usercontent.google.com',
      'googleusercontent.com',
      'githubusercontent.com',
      'objects.githubusercontent.com',
      'googlevideo.com',
    ],
    redirects: new Set([301, 302, 303, 307, 308]),
    maxRedirects: 8,
    userAgent: 'Mozilla/5.0',
  },
  cdn: {
    defaultBranch: 'main',
    userAgent: 'GitDelivr-Worker',
  },
  status: {
    kvKey: 'network-health/latest',
    sampleCount: 2,
    timeoutMs: 8000,
    staleAfterMs: 2 * 60 * 1000,
    endpoints: [
      {
        id: 'cdn-jquery',
        name: 'GitHub Edge JS',
        group: 'Core CDN',
        icon: 'fa-code-branch',
        description: 'GitHub-hosted JavaScript asset through GitDelivr.',
        url: 'https://cdn.gitdelivr.in/gh/jquery/jquery@3.6.0/dist/jquery.min.js',
        slowMs: 1400,
      },
      {
        id: 'cdn-bootstrap',
        name: 'GitHub Edge CSS',
        group: 'Core CDN',
        icon: 'fa-layer-group',
        description: 'Bootstrap CSS route through the GitDelivr CDN path.',
        url: 'https://cdn.gitdelivr.in/gh/twbs/bootstrap@v5.3.3/dist/css/bootstrap.min.css',
        slowMs: 1400,
      },
      {
        id: 'npm-react',
        name: 'NPM React',
        group: 'Package CDN',
        icon: 'fa-cubes',
        description: 'NPM package delivery check for a production React build.',
        url: 'https://cdn.gitdelivr.in/npm/react@18.2.0/umd/react.production.min.js',
        slowMs: 1600,
      },
      {
        id: 'npm-lodash',
        name: 'NPM Lodash',
        group: 'Package CDN',
        icon: 'fa-box-open',
        description: 'Secondary package route for NPM asset availability.',
        url: 'https://cdn.gitdelivr.in/npm/lodash@4.17.21/lodash.min.js',
        slowMs: 1600,
      },
      {
        id: 'wp-akismet',
        name: 'WordPress SVN',
        group: 'Source Providers',
        icon: 'fa-brands fa-wordpress-simple',
        description: 'WordPress plugin readme route through GitDelivr.',
        url: 'https://cdn.gitdelivr.in/wp/plugins/akismet@trunk/readme.txt',
        slowMs: 1800,
      },
      {
        id: 'gitlab-readme',
        name: 'GitLab Route',
        group: 'Source Providers',
        icon: 'fa-brands fa-gitlab',
        description: 'GitLab raw file route for upstream provider coverage.',
        url: 'https://cdn.gitdelivr.in/gl/gitlab-org/gitlab-foss@master/README.md',
        slowMs: 2200,
      },
      {
        id: 'bitbucket-readme',
        name: 'Bitbucket Route',
        group: 'Source Providers',
        icon: 'fa-brands fa-bitbucket',
        description: 'Bitbucket raw file route for upstream provider coverage.',
        url: 'https://cdn.gitdelivr.in/bb/atlassian/git-lfs@master/README.md',
        slowMs: 2200,
      },
      {
        id: 'proxy-gdrive',
        name: 'Google Drive Proxy',
        group: 'Proxy Routing',
        icon: 'fa-brands fa-google-drive',
        description: 'Google Drive stream proxy route for media and large file delivery.',
        url: 'https://cdn.gitdelivr.in/proxy?url=https%3A%2F%2Fdrive.google.com%2Fuc%3Fexport%3Ddownload%26id%3D1q4DmJ_tKgqJ2U5w6B6Q8kT9f-jdqCwoj',
        slowMs: 2500,
      },
      {
        id: 'origin-rawgithub',
        name: 'Raw GitHub Origin',
        group: 'Origin Baseline',
        icon: 'fa-brands fa-github',
        description: 'Direct origin check used as a comparison baseline.',
        url: 'https://raw.githubusercontent.com/jquery/jquery/3.6.0/dist/jquery.min.js',
        slowMs: 2200,
      },
      {
        id: 'github-api',
        name: 'GitHub API',
        group: 'Origin Baseline',
        icon: 'fa-code',
        description: 'Public GitHub API reachability for upstream visibility.',
        url: 'https://api.github.com/rate_limit',
        method: 'GET',
        slowMs: 2200,
      },
      {
        id: 'site-favicon',
        name: 'GitDelivr Site',
        group: 'Public Site',
        icon: 'fa-globe',
        description: 'Public website asset route and TLS availability check.',
        url: 'https://gitdelivr.in/favicon.png',
        slowMs: 1800,
      },
    ],
  },
  mime: {
    js: 'application/javascript; charset=utf-8',
    mjs: 'application/javascript; charset=utf-8',
    css: 'text/css; charset=utf-8',
    json: 'application/json; charset=utf-8',
    map: 'application/json; charset=utf-8',
    wasm: 'application/wasm',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    ico: 'image/x-icon',
    html: 'text/plain; charset=utf-8',
    htm: 'text/plain; charset=utf-8',
    txt: 'text/plain; charset=utf-8',
    xml: 'application/xml; charset=utf-8',
    mp4: 'video/mp4',
    m4v: 'video/x-m4v',
    mov: 'video/quicktime',
    webm: 'video/webm',
    ogv: 'video/ogg',
    m3u8: 'application/vnd.apple.mpegurl',
    ts: 'video/mp2t',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
    eot: 'application/vnd.ms-fontobject',
  },
  longCache: new Set(
    'mp4 m4v mov webm ogv m3u8 ts mp3 wav aac ogg m4a flac png jpg jpeg gif webp avif svg ico woff woff2 ttf otf eot'.split(
      ' '
    )
  ),
};

class HttpError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env, ctx) {
    let url;

    try {
      url = new URL(request.url);
    } catch {
      return withCors(json({ error: 'Malformed request URL' }, 400), corsHeaders(request));
    }

    const cors = corsHeaders(request, url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }), cors);
    }

    try {
      return withCors(await route(url, request, env, ctx), cors);
    } catch (error) {
      return withCors(errorResponse(error), cors);
    }
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      refreshHealthStatus(env, {
        trigger: 'cron',
        cron: controller.cron,
        scheduledTime: controller.scheduledTime,
      })
    );
  },
};

async function route(url, request, env, ctx) {
  if (url.pathname === CONFIG.routes.chat) {
    return request.method === 'POST'
      ? handleChat(request, env)
      : text('Method Not Allowed', 405, { Allow: 'POST, OPTIONS' });
  }

  if (url.pathname === CONFIG.routes.status) return handleStatus(url, request, env, ctx);
  if (CONFIG.routes.cdn.test(url.pathname)) return handleCdn(url);
  if (url.pathname === CONFIG.routes.proxy) return handleProxy(url, request);
  return fetch(request);
}

async function handleStatus(url, request, env, ctx) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return text('Method Not Allowed', 405, { Allow: 'GET, HEAD, OPTIONS' });
  }

  const forceRefresh = url.searchParams.get('refresh') === '1';
  let snapshot = forceRefresh ? null : await readHealthSnapshot(env);
  const snapshotAge = snapshot?.generatedAt ? Date.now() - Date.parse(snapshot.generatedAt) : Number.POSITIVE_INFINITY;
  const stale = !Number.isFinite(snapshotAge) || snapshotAge > CONFIG.status.staleAfterMs;

  if (!snapshot || forceRefresh) {
    snapshot = await refreshHealthStatus(env, { trigger: forceRefresh ? 'manual' : 'request' });
  } else if (stale && ctx?.waitUntil) {
    ctx.waitUntil(refreshHealthStatus(env, { trigger: 'stale-revalidate' }));
  }

  const headers = {
    'Cache-Control': forceRefresh ? 'no-store' : 'public, max-age=30, stale-while-revalidate=300',
  };

  if (request.method === 'HEAD') {
    return response(null, 200, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  }

  return json(snapshot, 200, headers);
}

async function refreshHealthStatus(env, meta = {}) {
  const startedAt = Date.now();
  const results = await Promise.all(CONFIG.status.endpoints.map((endpoint) => auditEndpoint(endpoint)));
  const payload = {
    generatedAt: new Date().toISOString(),
    checkedFrom: 'cloudflare-worker',
    trigger: meta.trigger || 'request',
    cron: meta.cron || null,
    scheduledTime: Number.isFinite(meta.scheduledTime) ? new Date(meta.scheduledTime).toISOString() : null,
    durationMs: Date.now() - startedAt,
    sampleCount: CONFIG.status.sampleCount,
    timeoutMs: CONFIG.status.timeoutMs,
    staleAfterMs: CONFIG.status.staleAfterMs,
    summary: summarizeHealth(results),
    results,
  };

  await writeHealthSnapshot(env, payload);
  return payload;
}

async function auditEndpoint(endpoint) {
  const samples = [];

  for (let count = 0; count < CONFIG.status.sampleCount; count += 1) {
    samples.push(await probeEndpoint(endpoint));
  }

  const reachableSamples = samples.filter((sample) => sample.reachable);
  const failedSamples = samples.filter((sample) => !sample.reachable);
  const latencies = reachableSamples.map((sample) => sample.latency).filter(Number.isFinite);
  const averageLatency = latencies.length
    ? Math.round(latencies.reduce((total, latency) => total + latency, 0) / latencies.length)
    : null;
  const hasHttpError = reachableSamples.some((sample) => sample.httpStatus >= 400);
  const hasServerError = reachableSamples.some((sample) => sample.httpStatus >= 500);
  const isSlow = Number.isFinite(averageLatency) && averageLatency > endpoint.slowMs;
  const isPartial = failedSamples.length > 0 && reachableSamples.length > 0;
  let status = 'healthy';

  if (!reachableSamples.length || hasServerError) {
    status = 'down';
  } else if (hasHttpError || isSlow || isPartial) {
    status = 'degraded';
  }

  const latestReachable = reachableSamples[reachableSamples.length - 1] || null;
  const latestFailed = failedSamples[failedSamples.length - 1] || null;

  return {
    ...endpoint,
    status,
    averageLatency,
    successfulSamples: reachableSamples.length,
    failedSamples: failedSamples.length,
    lastChecked: new Date().toISOString(),
    contentLength: latestReachable?.contentLength || null,
    contentType: latestReachable?.contentType || null,
    httpStatus: latestReachable?.httpStatus || null,
    reason: healthReason({ status, hasHttpError, hasServerError, isSlow, isPartial, latestReachable, latestFailed }),
    samples,
  };
}

async function probeEndpoint(endpoint) {
  const start = Date.now();

  try {
    const response = await fetchWithTimeout(cacheBustedUrl(endpoint.url), {
      method: endpoint.method || 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': CONFIG.cdn.userAgent,
        Accept: '*/*',
      },
    });

    return {
      reachable: true,
      latency: Date.now() - start,
      httpStatus: response.status,
      httpOk: response.ok,
      contentLength: response.headers.get('Content-Length'),
      contentType: response.headers.get('Content-Type'),
      message: response.ok ? `${response.status} OK` : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      reachable: false,
      latency: null,
      httpStatus: null,
      httpOk: false,
      contentLength: null,
      contentType: null,
      message: error?.name === 'AbortError' ? 'Timeout' : error?.message || 'Connection failed',
    };
  }
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.status.timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeHealth(results) {
  const healthy = results.filter((result) => result.status === 'healthy').length;
  const degraded = results.filter((result) => result.status === 'degraded').length;
  const down = results.filter((result) => result.status === 'down').length;
  const latencies = results.map((result) => result.averageLatency).filter(Number.isFinite);
  const averageLatency = latencies.length
    ? Math.round(latencies.reduce((total, latency) => total + latency, 0) / latencies.length)
    : null;
  const slowest = results
    .filter((result) => Number.isFinite(result.averageLatency))
    .sort((left, right) => right.averageLatency - left.averageLatency)[0];

  return {
    overall: down > 0 ? 'down' : degraded > 0 ? 'degraded' : 'healthy',
    total: results.length,
    healthy,
    degraded,
    down,
    averageLatency,
    slowest: slowest
      ? {
          id: slowest.id,
          name: slowest.name,
          latency: slowest.averageLatency,
        }
      : null,
  };
}

function healthReason(details) {
  if (details.status === 'healthy') return 'All samples completed from the Worker edge';
  if (details.hasServerError) return 'Server error response detected';
  if (details.hasHttpError && details.latestReachable?.httpStatus) return `HTTP ${details.latestReachable.httpStatus} response detected`;
  if (details.isPartial) return 'Some samples failed';
  if (details.isSlow) return 'Latency crossed the route threshold';
  return details.latestFailed?.message || 'Route did not complete normally';
}

function cacheBustedUrl(value) {
  const url = new URL(value);
  url.searchParams.set('health_probe', `${Date.now()}_${Math.random().toString(16).slice(2)}`);
  return url.toString();
}

async function readHealthSnapshot(env) {
  if (!env?.HEALTH_STATUS_KV?.get) return null;
  try {
    return await env.HEALTH_STATUS_KV.get(CONFIG.status.kvKey, 'json');
  } catch {
    return null;
  }
}

async function writeHealthSnapshot(env, payload) {
  if (!env?.HEALTH_STATUS_KV?.put) return;
  await env.HEALTH_STATUS_KV.put(CONFIG.status.kvKey, JSON.stringify(payload));
}

async function handleChat(request, env) {
  if (!env?.GEMINI_API_KEY) throw new HttpError('GEMINI_API_KEY is not configured', 500);

  const { message, history = [] } = await readJson(request);
  if (typeof message !== 'string' || !message.trim()) throw new HttpError('Message is required', 400);

  const contents = Array.isArray(history)
    ? history
        .filter(({ role, text }) => ['user', 'model'].includes(role) && typeof text === 'string')
        .map(({ role, text }) => ({ role, parts: [{ text }] }))
    : [];

  contents.push({ role: 'user', parts: [{ text: message }] });

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.chat.model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const geminiRes = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: CONFIG.chat.system }] },
      contents,
    }),
  });

  if (!geminiRes.ok) {
    throw new HttpError(`Gemini API Error (${geminiRes.status}): ${await geminiRes.text()}`, 502);
  }

  const data = await geminiRes.json();
  return json({ reply: data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that." });
}

async function handleProxy(url, request) {
  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) throw new HttpError('Missing url parameter', 400);

  const target = httpUrl(targetUrl, 'Invalid URL format');
  assertAllowedDomain(target, CONFIG.proxy.allowedDomains);

  const headers = proxyHeaders(request);
  let { response, finalUrl } = await fetchWithRedirects(target.toString(), headers);

  if (isAllowedHost(target.hostname, ['drive.google.com']) && isHtml(response)) {
    const html = await response.text();
    const confirm = driveConfirmToken(html);

    if (confirm) {
      ({ response, finalUrl } = await fetchWithRedirects(addConfirmToken(finalUrl, confirm), headers));
    } else {
      response = new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
  }

  if ([403, 404].includes(response.status)) {
    return json(
      { error: true, status: response.status, message: `Upstream Source returned HTTP ${response.status}` },
      response.status
    );
  }

  const responseHeaders = new Headers(response.headers);
  const contentType = mimeFromUrl(finalUrl) || mimeFromUrl(targetUrl);
  if (contentType) responseHeaders.set('Content-Type', contentType);

  responseHeaders.set('Cache-Control', `public, max-age=${CONFIG.cache.static}`);
  responseHeaders.delete('Content-Security-Policy');
  responseHeaders.delete('X-Frame-Options');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

async function handleCdn(url) {
  const match = url.pathname.match(CONFIG.routes.cdn);
  if (!match) throw new HttpError('Invalid CDN URL prefix.', 400);

  const source = parseCdnSource(match[1], match[2]);
  const rawUrl = rawCdnUrl(source);
  const cacheTtl = cdnCacheTtl(source.prefix, source.ext);
  const originRes = await fetch(rawUrl, {
    headers: { 'User-Agent': CONFIG.cdn.userAgent },
    cf: { cacheEverything: true, cacheTtl },
  });

  if (!originRes.ok) {
    return text(
      `File Not Found\n\nWe could not find the requested file.\nPlease check the username, repository, branch, and file path.\n\nAttempted to fetch: ${rawUrl}`,
      404
    );
  }

  const headers = new Headers(originRes.headers);
  headers.set('Content-Type', mimeFromPath(source.filePath) || originRes.headers.get('Content-Type') || 'text/plain');
  headers.set('Cache-Control', `public, max-age=${cacheTtl}`);
  headers.delete('Content-Security-Policy');
  headers.delete('X-Content-Type-Options');

  return new Response(originRes.body, { status: 200, statusText: 'OK', headers });
}
function parseCdnSource(prefix, path) {
  if (prefix === 'npm') return parseNpmSource(path);

  const parts = path.split('/');
  // Kam se kam 3 parts chahiye (user, repo, file)
  if (parts.length < 3) {
    throw new HttpError('Invalid CDN URL format. Use /gh/user/repo@branch/file or /gh/user/repo/branch/file', 400);
  }

  const user = parts[0];
  let repo, branch, filePath;

  // Case 1: Purana format (e.g., gitdelivr/demo@main/photo.jpg)
  if (parts[1].includes('@')) {
    const split = parts[1].split('@');
    repo = split[0];
    branch = split.slice(1).join('@') || CONFIG.cdn.defaultBranch;
    filePath = parts.slice(2).join('/');
  } 
  // Case 2: Naya explicit format (e.g., gitdelivr/demo/main/photo.jpg)
  else if (parts.length >= 4) {
    repo = parts[1];
    branch = parts[2];
    filePath = parts.slice(3).join('/');
  } 
  // Case 3: Short fallback format agar branch mention na ho (e.g., gitdelivr/demo/photo.jpg)
  else {
    repo = parts[1];
    branch = CONFIG.cdn.defaultBranch; // defaults to 'main'
    filePath = parts.slice(2).join('/');
  }

  if (!filePath) {
    throw new HttpError('Missing file path in CDN URL.', 400);
  }

  return {
    prefix,
    user,
    repo,
    branch,
    filePath,
    ext: extension(filePath),
  };
}
function parseNpmSource(path) {
  const parts = path.split('/');
  let packageName;
  let version;
  let filePath;

  if (parts[0]?.startsWith('@')) {
    if (!parts[1]) throw new HttpError('Invalid scoped npm URL format.', 400);

    if (parts[1].includes('@')) {
      const parsed = splitNpmNameVersion(parts[1]);
      packageName = `${parts[0]}/${parsed.name}`;
      version = parsed.version;
      filePath = parts.slice(2).join('/');
    } else {
      packageName = `${parts[0]}/${parts[1]}`;
      version = parts[2] || 'latest';
      filePath = parts.slice(3).join('/');
    }
  } else if (parts[0]?.includes('@')) {
    const parsed = splitNpmNameVersion(parts[0]);
    packageName = parsed.name;
    version = parsed.version;
    filePath = parts.slice(1).join('/');
  } else {
    packageName = parts[0];
    version = parts[1] || 'latest';
    filePath = parts.slice(2).join('/');
  }

  if (!packageName || !version) throw new HttpError('Invalid npm URL format.', 400);
  return {
    prefix: 'npm',
    user: packageName,
    repoAndBranch: version,
    repo: packageName,
    branch: version,
    filePath,
    ext: extension(filePath),
  };
}

function splitRepoAndBranch(value) {
  if (!value.includes('@')) return { repo: value, branch: CONFIG.cdn.defaultBranch };

  const [repo, ...branchParts] = value.split('@');
  if (!repo) throw new HttpError('Invalid repository format.', 400);
  return { repo, branch: branchParts.join('@') || CONFIG.cdn.defaultBranch };
}

function splitNpmNameVersion(value) {
  const index = value.lastIndexOf('@');
  const name = value.slice(0, index);
  if (!name) throw new HttpError('Invalid npm URL format.', 400);
  return { name, version: value.slice(index + 1) || 'latest' };
}

function rawCdnUrl(source) {
  const { prefix, user, repoAndBranch, repo, branch, filePath } = source;

  if (prefix === 'gh') return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
  if (prefix === 'gl') return `https://gitlab.com/${user}/${repo}/-/raw/${branch}/${filePath}`;
  if (prefix === 'bb') return `https://bitbucket.org/${user}/${repo}/raw/${branch}/${filePath}`;
  if (prefix === 'npm') return `https://unpkg.com/${user}@${repoAndBranch}/${filePath}`;
  if (prefix === 'wp') return `https://${user}.svn.wordpress.org/${repo}/${branch}/${filePath}`;

  throw new HttpError('Unsupported CDN provider.', 400);
}

async function fetchWithRedirects(initialUrl, headers) {
  const domains = [...CONFIG.proxy.allowedDomains, ...CONFIG.proxy.redirectDomains];
  let currentUrl = initialUrl;

  for (let count = 0; count <= CONFIG.proxy.maxRedirects; count += 1) {
    const parsed = httpUrl(currentUrl, 'Invalid redirect URL', 502);
    assertAllowedDomain(parsed, domains);

    const response = await fetch(parsed.toString(), { headers, redirect: 'manual' });
    if (!CONFIG.proxy.redirects.has(response.status)) return { response, finalUrl: parsed.toString() };

    const location = response.headers.get('Location');
    if (!location) return { response, finalUrl: parsed.toString() };
    if (count === CONFIG.proxy.maxRedirects) throw new HttpError('Too many redirects', 502);

    currentUrl = resolveRedirect(location, parsed);
  }

  throw new HttpError('Too many redirects', 502);
}

function proxyHeaders(request) {
  const headers = new Headers({ 'User-Agent': request.headers.get('User-Agent') || CONFIG.proxy.userAgent });
  const range = request.headers.get('Range');
  if (range) headers.set('Range', range);
  return headers;
}

function httpUrl(value, message, status = 400) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new HttpError(message, status);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) throw new HttpError('Only http and https URLs are allowed', status);
  return parsed;
}

function resolveRedirect(location, baseUrl) {
  try {
    return new URL(location, baseUrl).toString();
  } catch {
    throw new HttpError('Invalid redirect URL', 502);
  }
}

function assertAllowedDomain(url, domains) {
  if (!isAllowedHost(url.hostname, domains)) {
    throw new HttpError('Proxying this domain is not allowed for security reasons', 403);
  }
}

function isAllowedHost(hostname, domains) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return domains.some((domain) => {
    const allowed = domain.toLowerCase();
    return host === allowed || host.endsWith(`.${allowed}`);
  });
}

function isHtml(response) {
  return response.headers.get('Content-Type')?.toLowerCase().includes('text/html') || false;
}

function driveConfirmToken(html) {
  return html.match(/confirm=([0-9A-Za-z_-]+)/)?.[1] || html.match(/name=["']confirm["']\s+value=["']([^"']+)/i)?.[1];
}

function addConfirmToken(sourceUrl, token) {
  const url = httpUrl(sourceUrl, 'Invalid Google Drive confirmation URL', 502);
  url.searchParams.set('confirm', token);
  return url.toString();
}

function cdnCacheTtl(prefix, ext) {
  return prefix === 'wp' || CONFIG.longCache.has(ext) ? CONFIG.cache.static : CONFIG.cache.cdn;
}

function mimeFromUrl(value) {
  try {
    return mimeFromPath(new URL(value).pathname);
  } catch {
    return mimeFromPath(value);
  }
}

function mimeFromPath(path) {
  return CONFIG.mime[extension(path)] || '';
}

function extension(path = '') {
  const fileName = path.split('?')[0].split('#')[0].split('/').pop() || '';
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError('Invalid JSON payload', 400);
  }
}

function corsHeaders(request, url = null) {
  const origin = request.headers.get('Origin');
  const restricted = url?.pathname === CONFIG.routes.chat;
  const allowedOrigin = restricted
    ? CONFIG.cors.allowedOrigins.includes(origin)
      ? origin
      : CONFIG.cors.allowedOrigins[0]
    : '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': CONFIG.cors.methods,
    'Access-Control-Allow-Headers': CONFIG.cors.headers,
    'Access-Control-Expose-Headers': CONFIG.cors.expose,
    'Access-Control-Max-Age': CONFIG.cors.maxAge,
  };
}

function withCors(response, headers) {
  const next = new Response(response.body, response);
  Object.entries(headers).forEach(([key, value]) => next.headers.set(key, value));
  if (headers['Access-Control-Allow-Origin'] !== '*') appendVary(next.headers, 'Origin');
  return next;
}

function appendVary(headers, value) {
  const current = headers.get('Vary');
  if (!current) return headers.set('Vary', value);
  if (current !== '*' && !current.toLowerCase().split(',').map((item) => item.trim()).includes(value.toLowerCase())) {
    headers.set('Vary', `${current}, ${value}`);
  }
}

function json(body, status = 200, headers = {}) {
  return response(JSON.stringify(body), status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
}

function text(body, status = 200, headers = {}) {
  return response(body, status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
}

function response(body, status, headers) {
  return new Response(body, { status, headers });
}

function errorResponse(error) {
  return json({ error: error?.message || 'Worker Error' }, Number.isInteger(error?.status) ? error.status : 500);
}
