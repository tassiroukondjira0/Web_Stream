import base64, re, sys, json, http.cookiejar, urllib.request, urllib.error, urllib.parse

sys.stdout.reconfigure(encoding="utf-8")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

CJ = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CJ))


def get(url, headers=None):
    r = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*", **(headers or {})})
    try:
        with OPENER.open(r, timeout=30) as f:
            return f.status, f.read(), dict(f.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)
    except Exception as e:
        return 0, str(e).encode(), {}


TID = sys.argv[1] if len(sys.argv) > 1 else "27205"
s, page, _ = get(f"https://vidzy.org/movie/{TID}", {"Referer": "https://vidzy.org/"})
m = re.search(r"<iframe[^>]+src=[\"']([^\"']+)[\"']", page.decode("utf-8", "replace"))
emb = m.group(1)
eh = urllib.parse.urlparse(emb).hostname
print("embed:", emb)

s, ehtml, _ = get(emb, {"Referer": "https://vidzy.org/"})
ehtml = ehtml.decode("utf-8", "replace")

i = ehtml.find("sources:")
chunk = ehtml[i : i + 1800]
bm = re.search(r"\}\)\(\"([A-Za-z0-9+/=]+)\"\)", chunk)
blob = bm.group(1)
print("blob:", blob[:40], "... len", len(blob))

# meme DOM que la page : parent width = 1in+80px (=176), child = 100%-32px (=144)
host = eh
H = 0
for ch in host:
    H = (H + ord(ch)) & 255
a = base64.b64decode(blob)[::-1]

urls = []
for BC in range(256):
    r = "".join(chr(c ^ ((0x3D + i2 * 89 + H + BC) & 255)) for i2, c in enumerate(a))
    if r.startswith("http"):
        urls.append((BC, r))
print("candidates:", len(urls))
for bc, u in urls:
    print(f"  BC={bc}: {u[:120]}")

ref = {
    "Referer": emb + "/",
    "Origin": "https://" + eh,
    "Accept": "*/*",
    "Accept-Language": "fr-FR,fr;q=0.9",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
}

# gk (meme appel que l'embed : fingerprint complet)
gate = "https://v6.vidzy.cc/gate.php?v=p1&cw=1234.56&cw2=1234.56&wg=1&dpr=1&sw=1920&hw=8&ft=TOP&rf="
sg, bg, hg = get(gate, {"Referer": "https://vidzy.org/", "Origin": "https://vidzy.org"})
print("gate:", sg, bg[:200])
import json
gk = json.loads(bg).get("gk")
print("gk:", (gk[:30] + "...") if gk else None)

for bc, u in urls:
    tries = [("sans", u)]
    if gk:
        tries.append(("avec", u + ("&" if "?" in u else "?") + "gk=" + urllib.parse.quote(gk)))
    for label, uu in tries:
        s2, b2, h2 = get(uu, ref)
        print(f"BC={bc} {label} gk -> {s2}")
        if s2 == 200:
            print(b2[:300].decode("utf-8", "replace"))
            sys.exit(0)
print("all 403")
