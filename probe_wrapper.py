import re
import urllib.request

req = urllib.request.Request(
    "https://vidzy.org/movie/27205", headers={"User-Agent": "Mozilla/5.0"}
)
h = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
open("wrapper_page.html", "w", encoding="utf-8").write(h)
print("len", len(h))
print("embed urls:", re.findall(r'https?://[^"\'\s]+embed[^"\'\s]*', h)[:5])
idx = [m.start() for m in re.finditer("postMessage", h)]
print("postMessage occurrences:", len(idx))
for i in idx[:8]:
    print(repr(h[max(0, i - 250) : i + 250]))
    print("---")
