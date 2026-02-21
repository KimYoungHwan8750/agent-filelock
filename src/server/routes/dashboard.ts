import type { FastifyInstance } from 'fastify';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/', async (_req, reply) => {
    reply.type('text/html').send(HTML);
  });
}

const HTML = /* html */ `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>File Lock Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }

  .header { background: #1e293b; border-bottom: 1px solid #334155; padding: 20px 32px; display: flex; align-items: center; justify-content: space-between; }
  .header h1 { font-size: 20px; font-weight: 600; color: #f1f5f9; }
  .header h1 span { color: #64748b; font-weight: 400; font-size: 14px; margin-left: 8px; }

  .stats { display: flex; gap: 24px; }
  .stat { text-align: center; }
  .stat-value { font-size: 24px; font-weight: 700; color: #38bdf8; }
  .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

  .container { max-width: 1200px; margin: 0 auto; padding: 24px 32px; }

  .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .toolbar .info { font-size: 13px; color: #64748b; }
  .pulse { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-right: 6px; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 10px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; background: #1e293b; border-bottom: 1px solid #334155; }
  td { padding: 12px 16px; border-bottom: 1px solid #1e293b; font-size: 14px; }
  tr:hover td { background: #1e293b; }

  .filepath { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; color: #f1f5f9; max-width: 450px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .owner-name { font-weight: 500; }
  .dev-uuid { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; color: #94a3b8; }

  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
  .badge-claude { background: #1e3a5f; color: #38bdf8; }
  .badge-human { background: #14532d; color: #4ade80; }
  .badge-working { background: #854d0e; color: #fbbf24; }
  .badge-done { background: #1e3a5f; color: #38bdf8; }

  .time { font-size: 13px; color: #94a3b8; font-variant-numeric: tabular-nums; }
  .expires { font-weight: 600; font-variant-numeric: tabular-nums; }
  .expires-warn { color: #f87171; }
  .expires-ok { color: #4ade80; }

  .empty { text-align: center; padding: 64px 0; color: #475569; }
  .empty-icon { font-size: 48px; margin-bottom: 12px; }
  .empty-text { font-size: 16px; }
</style>
</head>
<body>
  <div class="header">
    <h1>File Lock Dashboard <span id="version"></span></h1>
    <div class="stats">
      <div class="stat">
        <div class="stat-value" id="lockCount">-</div>
        <div class="stat-label">Active Locks</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="uptime">-</div>
        <div class="stat-label">Uptime</div>
      </div>
    </div>
  </div>

  <div class="container">
    <div class="toolbar">
      <div class="info"><span class="pulse"></span>Auto-refreshing every 5s</div>
      <div class="info" id="lastUpdated"></div>
    </div>
    <div id="content"></div>
  </div>

<script>
const API = '/api/v1';

async function refresh() {
  try {
    const [healthRes, locksRes, changesRes] = await Promise.all([
      fetch(API + '/health'),
      fetch(API + '/locks'),
      fetch(API + '/changes'),
    ]);
    const health = await healthRes.json();
    const locksData = await locksRes.json();
    const changesData = await changesRes.json();

    document.getElementById('lockCount').textContent = health.activeLocks;
    document.getElementById('uptime').textContent = formatUptime(health.uptime);
    document.getElementById('version').textContent = 'v' + health.version;
    document.getElementById('lastUpdated').textContent = 'Updated ' + new Date().toLocaleTimeString();

    renderTable(locksData.locks, changesData.changes);
  } catch (e) {
    document.getElementById('content').innerHTML = '<div class="empty"><div class="empty-icon">&#x26A0;</div><div class="empty-text">Cannot connect to server</div></div>';
  }
}

function renderTable(locks, changes) {
  const el = document.getElementById('content');

  // Build unified rows
  const rows = [];
  const lockedPaths = new Set();

  for (const lock of (locks || [])) {
    const devUuid = lock.metadata && lock.metadata.developerUuid ? lock.metadata.developerUuid : '-';
    lockedPaths.add(lock.normalizedPath);
    rows.push({
      status: 'working',
      filePath: lock.filePath,
      ownerName: lock.ownerName,
      devUuid,
      ownerType: lock.owner.startsWith('claude:') ? 'claude' : 'human',
      time: lock.acquiredAt,
      expiresAt: lock.expiresAt,
    });
  }

  for (const change of (changes || [])) {
    if (lockedPaths.has(change.normalizedPath)) continue;
    rows.push({
      status: 'done',
      filePath: change.normalizedPath,
      ownerName: change.developerName,
      devUuid: change.developerUuid,
      ownerType: '-',
      time: change.changedAt,
      expiresAt: null,
    });
  }

  if (rows.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">&#x2705;</div><div class="empty-text">No active locks or recent changes</div></div>';
    return;
  }

  let html = '<table><thead><tr><th>Status</th><th>File</th><th>Owner</th><th>Dev UUID</th><th>Type</th><th>Time</th><th>Expires In</th></tr></thead><tbody>';

  for (const row of rows) {
    const statusLabel = row.status === 'working' ? 'Working' : 'Done';
    const remaining = row.expiresAt ? formatRemaining(row.expiresAt) : '-';
    const isWarn = row.expiresAt && (new Date(row.expiresAt).getTime() - Date.now()) < 600000;

    html += '<tr>'
      + '<td><span class="badge badge-' + row.status + '">' + statusLabel + '</span></td>'
      + '<td class="filepath" title="' + escHtml(row.filePath) + '">' + escHtml(row.filePath) + '</td>'
      + '<td class="owner-name">' + escHtml(row.ownerName) + '</td>'
      + '<td class="dev-uuid">' + escHtml(row.devUuid) + '</td>'
      + '<td>' + (row.ownerType !== '-' ? '<span class="badge badge-' + row.ownerType + '">' + row.ownerType + '</span>' : '-') + '</td>'
      + '<td class="time">' + new Date(row.time).toLocaleTimeString() + '</td>'
      + '<td class="expires ' + (row.expiresAt ? (isWarn ? 'expires-warn' : 'expires-ok') : '') + '">' + remaining + '</td>'
      + '</tr>';
  }

  html += '</tbody></table>';
  el.innerHTML = html;
}

function formatUptime(seconds) {
  if (seconds < 60) return seconds + 's';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h + 'h ' + m + 'm';
}

function formatRemaining(expiresAt) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'EXPIRED';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'm';
  return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

refresh();
setInterval(refresh, 5000);
</script>
</body>
</html>`;
