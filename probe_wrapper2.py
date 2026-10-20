h = open("wrapper_page.html", encoding="utf-8").read()
i = h.find('addEventListener("message"')
print(h[i - 100 : i + 900] if i >= 0 else "NO message listener")
print("=====")
for key in ("timeupdate", "videoEnded", "window.parent", "parent.postMessage"):
    j = h.find(key)
    print(key, "->", j)
    if j >= 0:
        print(h[max(0, j - 300) : j + 300])
        print("-----")
