(function () {
  'use strict';
  if (window.__fssVidzyMemberInit) return;
  window.__fssVidzyMemberInit = true;

  var tokenState = (window.__fssVidzyTokenData && window.__fssVidzyTokenData.ok) ?
    window.__fssVidzyTokenData : { ok: false, fmt: 0, fms: '', exp: 0 };

  function isVidzyHost(host) {
    return /(^|\.)(vidzy|fsvid)\.(cc|to|live|org|com|net|lol)$/i.test(host);
  }

  function appendToken(url) {
    if (!tokenState.ok) return url;
    try {
      var u = new URL(url, location.href);
      if (!isVidzyHost(u.hostname)) return url;
      if (u.searchParams.has('fms')) return url;
      u.searchParams.set('fmt', String(tokenState.fmt));
      u.searchParams.set('fms', tokenState.fms);
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  var origSrcDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
  if (origSrcDesc && origSrcDesc.set) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
      configurable: true,
      enumerable: true,
      get: function () { return origSrcDesc.get.call(this); },
      set: function (v) {
        var newVal = v;
        try {
          if (typeof v === 'string' && v) {
            var u = new URL(v, location.href);
            if (isVidzyHost(u.hostname) && tokenState.ok && !u.searchParams.has('fms')) {
              newVal = appendToken(v);
            }
          }
        } catch (e) {}
        return origSrcDesc.set.call(this, newVal);
      }
    });
  }

  function processExisting() {
    if (!tokenState.ok) return;
    var iframes = document.getElementsByTagName('iframe');
    for (var i = 0; i < iframes.length; i++) {
      var ifr = iframes[i];
      var src = ifr.getAttribute('src') || '';
      if (!src) continue;
      try {
        var u = new URL(src, location.href);
        if (isVidzyHost(u.hostname) && !u.searchParams.has('fms')) {
          origSrcDesc.set.call(ifr, appendToken(src));
        }
      } catch (e) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processExisting);
  } else {
    processExisting();
  }
  setTimeout(processExisting, 500);
})();
