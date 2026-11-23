import * as asar from "file:///C:/Users/Ali/AppData/Local/npm-cache/_npx/4b0e2640fe917ac8/node_modules/@electron/asar/lib/asar.js";
const html = asar
  .extractFile("C:/Users/Ali/AppData/Local/Programs/deepai-code-desktop/resources/server.asar", "apps\\server\\dist\\client\\index.html")
  .toString("utf8");
for (const f of ["setInterval(() => {", "isPlainLeaf", "workspace-message-surface", "root.setAttribute", "RTL patch"]) {
  console.log(JSON.stringify(f), "->", html.includes(f));
}
console.log("patch blocks:", (html.match(/RTL patch/g) || []).length);
