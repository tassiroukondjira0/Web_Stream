import io, sys, re, json, urllib.request, urllib.error
sys.stdout.reconfigure(encoding="utf-8")

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
BASE = "https://french-stream.net"


def get(url, referer=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*", **({"Referer": referer} if referer else {})})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def show(label, code, body, n=600):
    print(f"--- {label} [{code}] len={len(body)}")
    print(body[:n].replace("\n", " ")[:n])
    print()


# 1. catalogue
code, body = get(f"{BASE}/films/")
show("films index", code, body, 400)
ids = re.findall(r"index\.php\?newsid=(\d+)", body)
print("newsids:", list(dict.fromkeys(ids))[:8])
print()

if not ids:
    sys.exit("no ids")

nid = ids[0]
code, detail = get(f"{BASE}/index.php?newsid={nid}")
show("detail", code, detail, 300)

print("=== iframes in detail ===")
for m in re.finditer(r"<iframe[^>]*>", detail, re.I):
    print(m.group(0)[:300])
print()

print("=== data-url ===")
for m in re.finditer(r"data-url\s*=\s*[\"']([^\"']+)", detail, re.I):
    print(m.group(1)[:200])
print()

print("=== host keywords anywhere in detail ===")
for kw in ["uqload", "voe", "luluvido", "netu", "vidzy", "embed", "player", "stream"]:
    hits = re.findall(r"[^\"'\s]*" + kw + r"[^\"'\s]*", detail, re.I)
    print(kw, "->", list(dict.fromkeys(hits))[:8])
print()

# 2. ep-data
code, ep = get(f"{BASE}/ep-data.php?id={nid}&format=js", referer=f"{BASE}/index.php?newsid={nid}")
show("ep-data", code, ep, 800)
