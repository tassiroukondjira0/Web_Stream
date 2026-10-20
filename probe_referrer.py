import json
import re
import urllib.request


def get(url, headers=None):
    h = {"User-Agent": "Mozilla/5.0"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")


# 1. Does the public API expose the embed URL directly?
try:
    raw = get("https://vidzy.org/api/27205")
    data = json.loads(raw)
    print("api keys:", list(data.keys()))
    print(json.dumps(data, indent=1)[:1200])
except Exception as ex:
    print("api error:", ex)

# 2. Referrer / top checks in the live embed
e = open("embed_inner.html", encoding="utf-8").read()
print()
print("=== document.referrer mentions ===")
for m in re.finditer(r"document\.referrer", e):
    print(repr(e[max(0, m.start() - 150) : m.start() + 150]))
    print("---")

print("=== window.top checks ===")
for m in re.finditer(r"window\.top", e):
    print(repr(e[max(0, m.start() - 120) : m.start() + 160]))
    print("---")

print("=== gate.php fetch context ===")
i = e.find("gate.php")
while i != -1:
    print(repr(e[max(0, i - 350) : i + 250]))
    print("---")
    i = e.find("gate.php", i + 1)
    if i > 60000 and i > 0:
        pass
