import("node:fs").then((fs) => {
  const p = "src/app/api/embed/ext/route.ts";
  let s = fs.readFileSync(p, "utf8");
  const m = s.match(
    /try\{\s*Object\.defineProperty\(window,"parent"[\s\S]+?catch\(e\)\{\}\s*try\{\s*Object\.defineProperty\(window,"top"[\s\S]+?catch\(e\)\{\}/,
  );
  if (!m) {
    console.log("nf");
    process.exitCode = 1;
    return;
  }
  s = s.replace(
    m[0],
    "try{window.parent=window;}catch(e){}\ntry{window.top=window;}catch(e){}\ntry{window.self=window;}catch(e){}",
  );
  fs.writeFileSync(p, s);
  console.log("ok");
});
