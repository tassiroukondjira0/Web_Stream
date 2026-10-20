import re
import urllib.request


def get(url, headers=None):
    h = {"User-Agent": "Mozilla/5.0"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")


# 1. gate.php: does it accept OUR domain as referrer (rf) / top (ft)?
base = (
    "https://v6.vidzy.cc/gate.php?v=p1&cw=1&cw2=0&wg=1&dpr=1&sw=1920&hw=8"
    "&ft={ft}&rf={rf}"
)
for ft, rf in (
    ("https://vidzy.org", "vidzy.org"),
    ("https://web-stream-mncx.onrender.com", "web-stream-mncx.onrender.com"),
    ("https://web-stream-mncx.onrender.com", "vidzy.org"),
    ("X", "localhost"),
):
    try:
        out = get(base.format(ft=ft, rf=rf), headers={"Referer": "https://vidzy.org/"})
        print(f"ft={ft} rf={rf} -> {out[:120]}")
    except Exception as ex:
        print(f"ft={ft} rf={rf} -> ERROR {ex}")

# 2. What do the referrer-whitelist checks gate? Full context.
e = open("embed_inner.html", encoding="utf-8").read()
print()
for needle in (
    "ok=/(french-stream|fstream|fsurl",
    'return /(french-stream|fstream|fsurl',
):
    i = e.find(needle)
    if i >= 0:
        print("=== context for", needle[:30], "===")
        print(e[max(0, i - 1200) : i + 600])
        print("\n\n")
