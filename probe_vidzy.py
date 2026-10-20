import io, sys, re, urllib.request, urllib.error, json

sys.stdout.reconfigure(encoding="utf-8")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"


def get(url, ref=None, origin=None, ua=UA):
    r = urllib.request.Request(url)
    r.add_header("User-Agent", ua)
    r.add_header("Accept", "*/*")
    if ref:
        r.add_header("Referer", ref)
    if origin:
        r.add_header("Origin", origin)
    try:
        with urllib.request.urlopen(r, timeout=30) as f:
            return f.status, f.read(), dict(f.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)
    except Exception as e:
        return 0, str(e).encode(), {}


def probe(tid):
    s, b, _ = get(f"https://vidzy.org/api/{tid}")
    print(f"api/{tid} ->", s, b[:300])
    s, b, _ = get(f"https://vidzy.org/movie/{tid}")
    html = b.decode("utf-8", "replace")
    print(f"movie/{tid} ->", s, len(html))
    m = re.search(r"<iframe[^>]+src=[\"']([^\"']+)[\"']", html)
    if not m:
        print("  no iframe; head:", html[:300])
        return
    emb = m.group(1)
    print("  embed:", emb)
    s2, b2, h2 = get(emb, ref="https://vidzy.org/")
    e2 = b2.decode("utf-8", "replace")
    print("  embed page:", s2, len(e2))
    scripts = re.findall(r"<script(?![^>]*src=)[^>]*>(.*?)</script>", e2, re.S)
    blob = "\n".join(scripts)
    mm = re.findall(r"https?://[^\"'\s\\)]+?\.m3u8[^\"'\s\\)]*", e2 + blob)
    print("  m3u8:", mm[:4])
    for pat in ["gate.php", "hls2", "seg-", "u14", "vidzy.cc", "referer"]:
        if pat in (e2 + blob).lower():
            print("  has:", pat)
    return emb, e2, blob, mm


for tid in ["1161", "tt0111161"]:
    try:
        probe(tid)
    except Exception as ex:
        print("ERR", tid, ex)
    print("=" * 50)
