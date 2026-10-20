import re

e = open("embed_inner.html", encoding="utf-8").read()
for pat in ("window.parent.postMessage", "parent.postMessage", "window.top.postMessage", "top.postMessage"):
    print(pat, "->", e.count(pat))

i = e.find("window.addEventListener('message'")
seg = e[i : i + 4000]
print("=== handler actions ===")
print(re.findall(r"a==='([a-z_]+)'", seg))
print("=== contains play handling ===")
print(re.findall(r"'play'", seg)[:10])

# Where does timeupdate get posted and to whom?
j = e.find("timeupdate")
while j != -1 and j < len(e):
    print("timeupdate ctx:", repr(e[max(0, j - 160) : j + 120]))
    j = e.find("timeupdate", j + 1)
