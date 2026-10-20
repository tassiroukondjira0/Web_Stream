import base64, json, re, sys, urllib.request, urllib.error, urllib.parse

sys.stdout.reconfigure(encoding="utf-8")
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


# 1. gate.php tel que l'embed l'appelle (meme parametres fingerprint)
gate = "https://v6.vidzy.cc/gate.php?v=p1&cw=1234.56&cw2=1234.56&wg=1&dpr=1&sw=1920&hw=8&ft=TOP&rf="
s, b, h = get(gate, {"Referer": "https://vidzy.org/", "Origin": "https://vidzy.org"})
print("=== gate.php ===")
print("status:", s)
print("acao:", h.get("Access-Control-Allow-Origin") or h.get("access-control-allow-origin"))
print("body:", b[:300])
try:
    gk = json.loads(b).get("gk")
except Exception:
    gk = None
print("gk:", (gk[:40] + "...") if gk else None)
print()

# 2. recupere un embed recent + decode le m3u8 obfusque
TID = sys.argv[1] if len(sys.argv) > 1 else "27205"
s, page, _ = get(f"https://vidzy.org/movie/{TID}", {"Referer": "https://vidzy.org/"})
m = re.search(r"<iframe[^>]+src=[\"']([^\"']+)[\"']", page.decode("utf-8", "replace"))
if not m:
    print("no embed iframe")
    sys.exit(1)
emb = m.group(1)
print("embed:", emb)
eh = urllib.parse.urlparse(emb).hostname
s, ehtml, _ = get(emb, {"Referer": "https://vidzy.org/"})
ehtml = ehtml.decode("utf-8", "replace")
print("embed page:", s, len(ehtml))

mm = re.search(r"sources:\s*\[\{src:.*?\}\)\(\"([A-Za-z0-9+/=]+)\"\)", ehtml, re.S)
if not mm:
    print("no obfuscated source found")
    sys.exit(1)


def decode_candidates(blob, hostname):
    # BC est mesure dans le DOM : plusieurs valeurs peuvent produire une chaine
    # "http...", on teste chaque candidat contre le CDN.
    H = 0
    for ch in hostname:
        H = (H + ord(ch)) & 255
    a = base64.b64decode(blob)[::-1]
    out = []
    for BC in range(256):
        r = "".join(chr(c ^ ((0x3D + i * 89 + H + BC) & 255)) for i, c in enumerate(a))
        if r.startswith("http"):
            out.append((BC, r))
    return out


cands = decode_candidates(mm.group(1), eh)
print("candidate BC:", [bc for bc, _ in cands])
ref = {"Referer": emb, "Origin": "https://" + eh}
master, bc, need_gk = "", None, False
for bcv, url in cands:
    for with_gk in (False, True):
        u = url
        if with_gk:
            sep = "&" if "?" in u else "?"
            u = u + sep + "gk=" + urllib.parse.quote(gk or "")
        s, body, _ = get(u, ref)
        print(f"  BC={bcv} master {'avec' if with_gk else 'sans'} gk -> {s}")
        if s == 200:
            master, bc, need_gk = url, bcv, with_gk
            break
    if master:
        break
print("master:", master, "need_gk:", need_gk)
if not master.startswith("http"):
    print("decode failed (troll path)")
    sys.exit(1)

mu = master
if need_gk:
    mu = mu + ("&" if "?" in mu else "?") + "gk=" + urllib.parse.quote(gk)
s, body, _ = get(mu, ref)
print("master m3u8 ->", s, len(body))
print(body[:400].decode("utf-8", "replace"))
variants = re.findall(r"^https?://\S+\.m3u8.*$", body.decode("utf-8", "replace"), re.M)
print("variants:", variants[:3])

media = variants[0] if variants else mu
if need_gk and "/hls2/" in media:
    media = media + ("&" if "?" in media else "?") + "gk=" + urllib.parse.quote(gk)
s, pl, _ = get(media, ref)
print("media playlist ->", s, len(pl))
print(pl[:400].decode("utf-8", "replace"))
segs = re.findall(r"^https?://\S+$", pl.decode("utf-8", "replace"), re.M)
hls = [u for u in segs if "/hls2/" in u or "/v/" in u]
print("segments:", len(segs), "hls2/v:", len(hls))
print("first:", hls[:2] or segs[:2])
print()

# 3. test segment SANS gk puis AVEC gk
targets = (hls or segs)[:2]
if targets:
    u = targets[0]
    s0, b0, h0 = get(u, ref)
    print("segment sans gk ->", s0, len(b0), b0[:120])
    if gk:
        sep = "&" if "?" in u else "?"
        s1, b1, h1 = get(u + sep + "gk=" + urllib.parse.quote(gk), ref)
        print("segment avec gk ->", s1, len(b1), b1[:120])
