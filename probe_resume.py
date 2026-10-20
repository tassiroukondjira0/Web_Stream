import re
import urllib.request


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")


# 1. The embed id stable across wrapper fetches?
ids = set()
for _ in range(3):
    h = get("https://vidzy.org/movie/27205")
    ids.update(re.findall(r'embed-([a-zA-Z0-9]+)\.html', h))
print("movie 27205 embed ids:", ids)

# 2. Same for a serie URL
h = get("https://vidzy.org/serie/27205/1/1")
print("serie embed ids:", set(re.findall(r'embed-([a-zA-Z0-9]+)\.html', h)))

# 3. Where does the embed post messages?
e = open("embed_inner.html", encoding="utf-8").read()
for pat in ("window.parent.postMessage", "parent.postMessage", "window.top.postMessage", "top.postMessage"):
    print(pat, "->", e.count(pat))

# 4. Which actions the embed handles from parent
m = re.search(r"window\.addEventListener\('message',function\(ev\)\{.*?\n\s*\}catch\(_e\)\{\}\s*\}", e, re.S)
if not m:
    m = re.search(r"window\.addEventListener\('message',function\(ev\)\{.{0,3000}", e, re.S)
seg = m.group(0) if m else ""
print("=== message handler actions ===")
print(re.findall(r"a==='([a-z_]+)'", seg))
print("=== play handling? ===")
print("action==='play'" in seg, "'play'" in seg)
