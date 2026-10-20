import io, re, sys, urllib.request

sys.stdout.reconfigure(encoding="utf-8")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
BASE = "https://french-stream.net"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")


idx = get(f"{BASE}/films/")
ids = re.findall(r"index\.php\?newsid=(\d+)", idx)
print("ids found:", len(ids), ids[:5])

for nid in ids[:4]:
    try:
        html = get(f"{BASE}/index.php?newsid={nid}")
    except Exception as e:
        print(nid, "ERR", e)
        continue
    iframes = re.findall(r"<iframe[^>]*>", html)
    print(f"\n=== newsid={nid} len={len(html)} iframes={len(iframes)}")
    for tag in iframes[:6]:
        print("   ", tag[:220])
    for pat in ["vidzy_token", "ep-data", "data-url", "player/"]:
        print(f"   has {pat}: {pat in html}")
