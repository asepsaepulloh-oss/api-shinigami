/* ===== ACCESS GATE ===== */
(function() {
  var ACCESS_CODE = 'KOMIKONLINE26';       // <-- change this to your code
  var STORAGE_KEY = 'shngm_access';

  var gate  = document.getElementById('gate');
  var form  = document.getElementById('gate-form');
  var input = document.getElementById('gate-input');
  var error = document.getElementById('gate-error');

  function unlock() {
    localStorage.setItem(STORAGE_KEY, '1');
    gate.classList.add('unlocked');
    setTimeout(function() { gate.style.display = 'none'; }, 380);
  }

  // Already unlocked — remove gate instantly, no flash
  if (localStorage.getItem(STORAGE_KEY) === '1') {
    gate.style.display = 'none';
    return;
  }

  // Show gate, focus input
  gate.style.display = 'flex';
  setTimeout(function() { if (input) input.focus(); }, 50);

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var val = (input.value || '').trim();
    if (val === ACCESS_CODE) {
      error.classList.add('hidden');
      unlock();
    } else {
      error.classList.remove('hidden');
      input.value = '';
      input.classList.remove('shake');
      void input.offsetWidth; // reflow to restart animation
      input.classList.add('shake');
      input.focus();
    }
  });
})();

/* ===== CONFIG ===== */
const API_BASE = window.location.origin + '/api';

/* ===== BASE URL DISPLAY ===== */
document.querySelectorAll('#base-url-display, #hero-base-url, #footer-base-url').forEach(function(el) {
  if (el.id === 'base-url-display') el.textContent = window.location.origin;
  else el.textContent = API_BASE;
});

/* ===== API STATUS CHECK ===== */
async function checkStatus() {
  var dot    = document.getElementById('status-dot');
  var label  = document.getElementById('api-status');
  var btn    = document.getElementById('btn-check-status');
  if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }
  try {
    var start = Date.now();
    var res   = await fetch(API_BASE + '/manga/popular?page=1');
    var ms    = Date.now() - start;
    if (res.ok) {
      if (dot)   { dot.className = 'status-dot online'; dot.title = 'Online'; }
      if (label) { label.className = 'api-status online'; label.textContent = 'Online (' + ms + 'ms)'; }
    } else { throw new Error('HTTP ' + res.status); }
  } catch(e) {
    if (dot)   { dot.className = 'status-dot offline'; dot.title = 'Offline'; }
    if (label) { label.className = 'api-status offline'; label.textContent = 'Offline'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Check Status'; }
  }
}
document.getElementById('btn-check-status').addEventListener('click', checkStatus);
checkStatus();

/* ===== COPY BUTTON ===== */
document.querySelectorAll('.copy-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var text = (btn.dataset.copy || '').replace(':mangaId','123').replace(':chapterId','456');
    var full = API_BASE + text;
    navigator.clipboard.writeText(full).then(function() {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800);
    });
  });
});

/* ===== SIDEBAR ACTIVE ON SCROLL ===== */
var sections = document.querySelectorAll('.doc-section[id], .endpoint-section[id]');
var sidebarLinks = document.querySelectorAll('.sidebar-link');

var observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      sidebarLinks.forEach(function(l) { l.classList.remove('active'); });
      var active = document.querySelector('.sidebar-link[href="#' + entry.target.id + '"]');
      if (active) active.classList.add('active');
    }
  });
}, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

sections.forEach(function(s) { observer.observe(s); });

/* ===== MOBILE SIDEBAR ===== */
var sidebarEl = document.getElementById('sidebar');
var overlayEl = document.getElementById('overlay');
var toggleBtn = document.getElementById('sidebar-toggle');

function openSidebar() {
  sidebarEl.classList.add('open');
  overlayEl.classList.remove('hidden');
  toggleBtn.classList.add('open');
}
function closeSidebar() {
  sidebarEl.classList.remove('open');
  overlayEl.classList.add('hidden');
  toggleBtn.classList.remove('open');
}
toggleBtn.addEventListener('click', function() {
  sidebarEl.classList.contains('open') ? closeSidebar() : openSidebar();
});
overlayEl.addEventListener('click', closeSidebar);
document.querySelectorAll('.sidebar-link').forEach(function(l) {
  l.addEventListener('click', function() {
    if (window.innerWidth <= 900) closeSidebar();
  });
});

/* ===== TRY-IT ENGINE ===== */
function showResult(containerId, status, ms, body, isImage) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.classList.remove('hidden');

  var ok   = status >= 200 && status < 300;
  var cls  = ok ? 'ok' : 'err';

  var barHtml = '<div class="tryit-result-bar">'
    + '<span class="tryit-status ' + cls + '">' + status + ' ' + (ok ? 'OK' : 'Error') + '</span>'
    + '<span class="tryit-time">' + ms + 'ms</span>'
    + (isImage ? '' : '<button class="tryit-copy" data-copy-result="' + containerId + '">Copy JSON</button>')
    + '</div>';

  var bodyHtml = '';
  if (isImage) {
    bodyHtml = '<div class="tryit-img"><img src="' + body + '" /><span style="font-size:12px;color:var(--text3)">Image rendered via proxy</span></div>';
  } else {
    bodyHtml = '<pre class="tryit-body" id="' + containerId + '-body">' + escHtml(body) + '</pre>';
  }

  container.innerHTML = barHtml + bodyHtml;

  var copyBtn = container.querySelector('.tryit-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      var pre = document.getElementById(containerId + '-body');
      if (pre) navigator.clipboard.writeText(pre.textContent).then(function() {
        copyBtn.textContent = 'Copied!';
        setTimeout(function() { copyBtn.textContent = 'Copy JSON'; }, 1600);
      });
    });
  }
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function prettyJson(data) {
  try { return JSON.stringify(data, null, 2); } catch(e) { return String(data); }
}

async function runRequest(url, resultId, isImage) {
  var btn = document.querySelector('[data-endpoint]');
  var start = Date.now();
  try {
    var res  = await fetch(url);
    var ms   = Date.now() - start;
    if (isImage) {
      showResult(resultId, res.status, ms, url, true);
    } else {
      var json = await res.json();
      showResult(resultId, res.status, ms, prettyJson(json), false);
    }
  } catch(e) {
    showResult(resultId, 0, Date.now() - start, '{ "error": "' + e.message + '" }', false);
  }
}

/* ===== TRY-IT BINDINGS ===== */
document.querySelectorAll('.tryit-btn').forEach(function(btn) {
  btn.addEventListener('click', async function() {
    btn.disabled = true;
    btn.textContent = 'Loading...';
    var ep = btn.dataset.endpoint;
    var url, resultId, isImage = false;

    try {
      if (ep === 'popular') {
        var page = document.getElementById('try-popular-page').value || 1;
        url = API_BASE + '/manga/popular?page=' + page;
        resultId = 'try-popular-result';

      } else if (ep === 'latest') {
        var page = document.getElementById('try-latest-page').value || 1;
        url = API_BASE + '/manga/latest?page=' + page;
        resultId = 'try-latest-result';

      } else if (ep === 'search') {
        var q    = document.getElementById('try-search-q').value.trim();
        var page = document.getElementById('try-search-page').value || 1;
        if (!q) { showResult('try-search-result', 400, 0, '{ "error": "q is required" }', false); return; }
        url = API_BASE + '/manga/search?q=' + encodeURIComponent(q) + '&page=' + page;
        resultId = 'try-search-result';

      } else if (ep === 'detail') {
        var id = document.getElementById('try-detail-id').value.trim();
        if (!id) { showResult('try-detail-result', 400, 0, '{ "error": "mangaId is required" }', false); return; }
        url = API_BASE + '/manga/' + encodeURIComponent(id);
        resultId = 'try-detail-result';

      } else if (ep === 'chapters') {
        var id = document.getElementById('try-chapters-id').value.trim();
        if (!id) { showResult('try-chapters-result', 400, 0, '{ "error": "mangaId is required" }', false); return; }
        var chPage  = (document.getElementById('try-chapters-page')?.value || '').trim();
        var chLimit = (document.getElementById('try-chapters-limit')?.value || '').trim();
        var qs = [];
        if (chPage)  qs.push('page=' + encodeURIComponent(chPage));
        if (chLimit) qs.push('limit=' + encodeURIComponent(chLimit));
        url = API_BASE + '/manga/' + encodeURIComponent(id) + '/chapters' + (qs.length ? '?' + qs.join('&') : '');
        resultId = 'try-chapters-result';

      } else if (ep === 'pages') {
        var id = document.getElementById('try-pages-id').value.trim();
        if (!id) { showResult('try-pages-result', 400, 0, '{ "error": "chapterId is required" }', false); return; }
        url = API_BASE + '/manga/chapter/' + encodeURIComponent(id) + '/pages';
        resultId = 'try-pages-result';

      } else if (ep === 'image') {
        var imgUrl = document.getElementById('try-image-url').value.trim();
        if (!imgUrl) { showResult('try-image-result', 400, 0, '{ "error": "url is required" }', false); return; }
        url = API_BASE + '/manga/image?url=' + encodeURIComponent(imgUrl);
        resultId = 'try-image-result';
        isImage = true;
      }

      if (url && resultId) await runRequest(url, resultId, isImage);

    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Request';
    }
  });
});
