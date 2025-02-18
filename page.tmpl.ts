import type { Pill } from "./mod.ts";

function root(head: string, body: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <style>:root { color-scheme: light dark; }</style>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${head}
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

export function index(table: string) {
  const split = table.split("\n");
  const padded = split.map((v) => `  ${v}  `).reduce((acc, v) =>
    acc + "\n" + v
  );
  return root(
    "<style>body { margin: 0; }</style>",
    `<pre>${`\n${padded}\n`}</pre>`,
  );
}

export function admin(pills: Pill["name"][]) {
  const options = pills
    .map((pill) => `<option value="${pill}">${pill}</option>`)
    .reduce((
      a,
      v,
    ) => a + v);
  const body = `
    <form id="form" action="/restock" method="POST">
      <p><label for="name">pill</label>
      <select id="name" name="name">
        ${options}
      </select></p>
      <p><label for="count">count</label>
      <input id="count" name="count" type="text"></p>
      <p><label for="secret">secret</label>
      <input id="secret" name="secret" type="text"></p>
      <input type="submit" value="restock">
    </form>
    <p id="response"></p>
    <script>
      function main() {
        const form = document.querySelector("#form");
        const res = document.querySelector("#response");
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(form);
          const body = {
              secret: formData.get("secret"),
              count: parseFloat(formData.get("count")),
              name: formData.get("name"),
          };
          const response = await (await fetch("/restock", {
            method: "POST",
            body: JSON.stringify(body),
          })).text()
          res.innerText = response;
        })
      }
      main();
    </script>
  `;
  return root("", body);
}
