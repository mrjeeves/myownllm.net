/* MyOwnLLM site — pull the latest GitHub release on load,
   then point every download button at the correct asset URL. */

(() => {
  const REPO = 'mrjeeves/MyOwnLLM';
  const API = `https://api.github.com/repos/${REPO}/releases/latest`;
  const LATEST_PAGE = `https://github.com/${REPO}/releases/latest`;

  // ---------- platform detection (best effort) ----------
  // Used only to suggest a sensible primary button. Not load-bearing.
  function detectPlatform() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const isMac = /Mac/i.test(platform) || /Mac OS X/i.test(ua);
    const isWin = /Win/i.test(platform) || /Windows/i.test(ua);
    const isLinux = /Linux/i.test(platform) || /Linux/i.test(ua);
    const isArm = /arm|aarch64/i.test(ua) || /arm|aarch64/i.test(platform);

    // Apple Silicon detection is unreliable; UA strings still say "Intel".
    // navigator.userAgentData.getHighEntropyValues() is more reliable.
    let archHint = isArm ? 'arm' : 'x64';
    if (isMac && !isArm && typeof navigator.userAgentData !== 'undefined') {
      // Promise-based; we'll resolve later. Default to Apple Silicon for
      // modern Macs since most new Macs since 2020 are M-series.
      archHint = 'unknown-mac';
    }

    if (isMac) return { os: 'mac', archHint, label: 'a Mac' };
    if (isWin) return { os: 'windows', archHint: 'x64', label: 'Windows' };
    if (isLinux) {
      // Heuristic: aarch64 Linux is probably a Pi.
      if (isArm) return { os: 'pi', archHint: 'arm64', label: 'a Raspberry Pi or arm64 Linux' };
      return { os: 'linux', archHint: 'x64', label: 'Linux' };
    }
    return { os: 'unknown', archHint: 'x64', label: 'your computer' };
  }

  // ---------- release fetch ----------
  async function fetchLatest() {
    try {
      const res = await fetch(API, {
        headers: { 'Accept': 'application/vnd.github+json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const r = await res.json();
      const assets = {};
      for (const a of r.assets || []) {
        assets[a.name] = a.browser_download_url;
      }
      return {
        tag: r.tag_name,
        name: r.name,
        published: r.published_at,
        assets,
        htmlUrl: r.html_url
      };
    } catch (err) {
      // Network failure, rate limit, etc. Buttons fall back to the
      // /releases/latest landing page on GitHub.
      console.warn('[myownllm.net] could not load latest release:', err);
      return null;
    }
  }

  function matchAsset(assets, pattern) {
    let re;
    try { re = new RegExp(pattern); }
    catch { return null; }
    for (const name of Object.keys(assets)) {
      if (re.test(name)) return { name, url: assets[name] };
    }
    return null;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch { return ''; }
  }

  // ---------- wire buttons ----------
  function wireButtons(release) {
    const buttons = document.querySelectorAll('[data-asset-pattern]');
    buttons.forEach((btn) => {
      const pattern = btn.getAttribute('data-asset-pattern');
      const match = release && matchAsset(release.assets, pattern);
      if (match) {
        btn.setAttribute('href', match.url);
        btn.setAttribute('data-asset-name', match.name);
        btn.removeAttribute('data-asset-missing');
      } else {
        btn.setAttribute('href', LATEST_PAGE);
        btn.setAttribute('data-asset-missing', 'true');
      }
    });
  }

  function showReleaseInfo(release) {
    const el = document.getElementById('release-info');
    if (!el) return;
    if (!release) {
      el.textContent = `Couldn't reach the GitHub releases API. The buttons below will take you to the releases page instead.`;
      return;
    }
    const tag = release.tag.startsWith('v') ? release.tag : `v${release.tag}`;
    const date = fmtDate(release.published);
    el.innerHTML = `Latest release: <a href="${release.htmlUrl}">${tag}</a>${date ? ` · released ${date}` : ''}`;
  }

  function showHeroMeta(release) {
    const el = document.getElementById('hero-meta');
    if (!el || !release) return;
    const tag = release.tag.startsWith('v') ? release.tag : `v${release.tag}`;
    el.innerHTML = `Free and open source · Works on Mac, Windows, Linux &amp; Raspberry Pi · <a href="${release.htmlUrl}">${tag}</a>`;
  }

  // ---------- suggested-download box ----------
  function setSuggested(release) {
    const box = document.getElementById('suggested');
    const label = document.getElementById('suggested-os');
    const btn = document.getElementById('suggested-btn');
    if (!box || !label || !btn || !release) return;

    const plat = detectPlatform();
    label.textContent = plat.label;

    let pattern = null;
    let title = 'Download MyOwnLLM';

    if (plat.os === 'mac') {
      // Default to Apple Silicon for unknown Mac (most modern Macs).
      if (plat.archHint === 'arm' || plat.archHint === 'unknown-mac') {
        pattern = /MyOwnLLM_[0-9.]+_(aarch64|arm64)\.dmg$/;
        title = 'Download for Mac (Apple Silicon)';
      } else {
        pattern = /MyOwnLLM_[0-9.]+_x64\.dmg$/;
        title = 'Download for Mac (Intel)';
      }
    } else if (plat.os === 'windows') {
      pattern = /MyOwnLLM_[0-9.]+_x64-setup\.exe$/;
      title = 'Download for Windows';
    } else if (plat.os === 'pi') {
      pattern = /MyOwnLLM_[0-9.]+_arm64\.deb$/;
      title = 'Download for Raspberry Pi (.deb)';
    } else if (plat.os === 'linux') {
      pattern = /MyOwnLLM_[0-9.]+_amd64\.deb$/;
      title = 'Download for Linux (.deb)';
    }

    let url = LATEST_PAGE;
    if (pattern) {
      const match = matchAsset(release.assets, pattern.source);
      if (match) url = match.url;
    }

    btn.textContent = '';
    const arrow = document.createElement('span');
    arrow.className = 'btn-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↓';
    btn.appendChild(arrow);
    btn.appendChild(document.createTextNode(' ' + title));
    btn.setAttribute('href', url);
    box.hidden = false;
  }

  // ---------- boot ----------
  fetchLatest().then((release) => {
    wireButtons(release);
    showReleaseInfo(release);
    showHeroMeta(release);
    setSuggested(release);
  });
})();
