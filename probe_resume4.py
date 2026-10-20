import re

e = open("embed_inner.html", encoding="utf-8").read()

print("=== handleParentMessage definition ===")
i = e.find("function handleParentMessage")
print(e[i : i + 2500] if i >= 0 else "not found")

print()
print("=== 'play' string contexts (msg-like) ===")
for m in re.finditer(r"'play'", e):
    ctx = e[max(0, m.start() - 200) : m.start() + 200]
    if "message" in ctx.lower() or "d.action" in ctx or "cmd" in ctx or "=== " in ctx:
        print(repr(ctx))
        print("---")
