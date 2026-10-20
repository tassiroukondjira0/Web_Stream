import json
import re
import urllib.request
import urllib.error

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"


def get(url, headers=None):
    r = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*", **(headers or {})})
    try:
        with urllib.request.urlopen(r, timeout=30) as f:
            return f.status, f.read(), dict(f.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)
    except Exception as e:
        return 0, str(e).encode(), {}


print("############ GATE MATRIX ############")
BASE = "https://v6.vidzy.cc/gate.php?v=p1&cw=1234.56&cw2=1234.56&wg=1&dpr=1&sw=1920&hw=8&ft={ft}&rf={rf}"

cases = [
    # (label, ft, rf, extra headers)
    ("baseline probe_gk (origin+referer vidzy.org)", "TOP", "", {"Referer": "https://vidzy.org/", "Origin": "https://vidzy.org"}),
    ("rf=vidzy.org", "TOP", "vidzy.org", {"Referer": "https://vidzy.org/", "Origin": "https://vidzy.org"}),
    ("rf=our-domain", "TOP", "web-stream-mncx.onrender.com", {"Referer": "https://vidzy.org/", "Origin": "https://vidzy.org"}),
    ("rf=localhost:3000", "TOP", "localhost:3000", {"Referer": "https://vidzy.org/", "Origin": "https://vidzy.org"}),
    ("origin vidzy.cc + rf=vidzy.org", "TOP", "vidzy.org", {"Referer": "https://vidzy.cc/", "Origin": "https://vidzy.cc"}),
    ("origin vidzy.cc + rf=our-domain", "TOP", "web-stream-mncx.onrender.com", {"Referer": "https://vidzy.cc/", "Origin": "https://vidzy.cc"}),
    ("NO origin hdr + rf=our-domain", "TOP", "web-stream-mncx.onrender.com", {"Referer": "https://vidzy.org/"}),
    ("NO origin hdr + rf=empty", "TOP", "", {"Referer": "https://vidzy.org/"}),
    ("NO headers at all, rf=empty", "TOP", "", None),
    ("ft=our-origin + rf=vidzy.org", "https://web-stream-mncx.onrender.com", "vidzy.org", {"Referer": "https://vidzy.cc/", "Origin": "https://vidzy.cc"}),
    ("ft=our-origin + rf=our-domain", "https://web-stream-mncx.onrender.com", "web-stream-mncx.onrender.com", {"Referer": "https://vidzy.cc/", "Origin": "https://vidzy.cc"}),
]
for label, ft, rf, hdrs in cases:
    s, b, _ = get(BASE.format(ft=ft, rf=rf), hdrs)
    print(f"{label:55s} -> {s} {b[:80]!r}")

print()
print("############ WRAPPER PARAM FORWARDING ############")
for q in ("", "?autoplay=1", "?mute=1", "?muted=1", "?t=89", "?start=89", "?pos=89", "?seek=89", "?autonext=1"):
    url = "https://vidzy.org/movie/27205" + q
    s, b, _ = get(url, {"Referer": "https://web-stream-mncx.onrender.com/"})
    h = b.decode("utf-8", "replace")
    autoplay = re.search(r"AUTOPLAY=\d", h)
    embed_src = re.search(r'<iframe[^>]+src="([^"]+)"', h)
    cfg = re.search(r'var CFG=(\{.*?\});', h)
    print(f"{q or '(none)':14s} -> {s} {autoplay.group(0) if autoplay else '?'} embed={embed_src.group(1) if embed_src else '?'}")
    if q in ("?mute=1", "?t=89", "?start=89", "?autonext=1") and cfg:
        print("      CFG:", cfg.group(1)[:200])
