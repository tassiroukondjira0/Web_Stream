import re
import urllib.request

w = open("wrapper_page.html", encoding="utf-8").read()
print("=== wrapper AUTOPLAY ===")
for m in re.finditer("AUTOPLAY", w):
    print(repr(w[max(0, m.start() - 120) : m.start() + 160]))
    print("---")

e = open("embed_inner.html", encoding="utf-8").read()
print("=== embed: play action handling ===")
for pat in [r"action==='play'", r'action==="play"', r"d\.action==='play'",
            r"\[.play.\]", r"===.play.", r"cmd.?==.play."]:
    for m in re.finditer(pat, e):
        print(pat, "@", m.start(), ":", repr(e[max(0, m.start() - 150) : m.start() + 200]))
        print("---")

print("=== embed id stability with params ===")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")


for url in (
    "https://vidzy.org/movie/27205?color=7c3aed",
    "https://vidzy.org/movie/27205/vf?color=7c3aed",
    "https://vidzy.org/movie/27205?autoplay=1&color=7c3aed",
):
    try:
        h = get(url)
        print(url, "->", set(re.findall(r"embed-([a-zA-Z0-9]+)\.html", h)), "AUTOPLAY snippet:", re.search(r"AUTOPLAY=\d+", h).group(0) if re.search(r"AUTOPLAY=\d+", h) else None)
    except Exception as ex:
        print(url, "-> ERROR", ex)
