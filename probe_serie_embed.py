import re
import urllib.request


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")


# Series wrapper template: does it also embed vidzy.cc/embed-*.html?
for url in (
    "https://vidzy.org/serie/1396/1/1",
    "https://vidzy.org/serie/1396/1/1/vf",
    "https://vidzy.org/serie/1396/1/1?color=7c3aed",
):
    try:
        h = get(url)
        print(url, "->", set(re.findall(r'https?://[^"\']+embed[^"\']*', h)), "len", len(h))
    except Exception as ex:
        print(url, "-> ERROR", ex)

# Is embed id stable across repeated serie fetches?
ids = set()
for _ in range(3):
    try:
        h = get("https://vidzy.org/serie/1396/1/1")
        ids.update(re.findall(r"embed-([a-zA-Z0-9]+)\.html", h))
    except Exception as ex:
        print("serie fetch error", ex)
print("serie 1396 S1E1 embed ids:", ids)
