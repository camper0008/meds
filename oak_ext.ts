import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { render, restock, status, update } from "./lib.ts";

type RestockBody = {
  name: string;
  count: number;
  secret: string;
};

function adminPageHtml(pills: string[]) {
  return `
<!DOCTYPE html>
<html>
  <head><style>:root { color-scheme: light dark; }</style></head>
  <body>
    <form id="form" action="/restock" method="POST">
      <p><label for="name">pill</label>
      <select id="name" name="name">
        ${pills.map((pill) => `<option value="${pill}">${pill}</option>`)}
      </select></p>
      <p><label for="count">count</label>
      <input id="count" name="count" type="number"></p>
      <p><label for="secret">secret</label>
      <input id="secret" name="secret" type="text"></p>
      <input type="submit" value="restock">
    </form>
    <p id="response"></p>
  </body>
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
</html>
  `;
}

export async function listen(port: number) {
  const secret = prompt("enter secret");

  const routes = new Router();
  routes.get("/", async (ctx) => {
    const result = await status();
    const rendered = render(result);
    ctx.response.body = rendered;
  });

  routes.get("/admin", async (ctx) => {
    const pills = await status().then((result) =>
      result.pills.map((v) => v.name)
    );
    ctx.response.body = adminPageHtml(pills);
  });

  routes.post("/restock", async (ctx) => {
    const body: RestockBody = await ctx.request.body.json();
    if (body.secret !== secret) {
      ctx.response.body = { msg: "bad secret" };
      return;
    }
    const result = await status();
    if (!(result.pills.some((v) => v.name === body.name))) {
      ctx.response.body = { msg: "pill not found" };
      return;
    }
    await restock({ name: body.name, count: body.count });
    ctx.response.body = { msg: "restocked" };
  });

  const app = new Application();
  app.use(routes.routes());
  app.use(routes.allowedMethods());

  console.log("listening on", port);
  await app.listen({ port });
}

Deno.cron("update at 20 00", "0 20 * * *", () => {
  update();
});
