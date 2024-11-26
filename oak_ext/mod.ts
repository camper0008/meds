import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { join } from "jsr:@std/path/join";
import { render, restock, status, update } from "../mod.ts";

type RestockBody = {
  name: string;
  count: number;
  secret: string;
};

async function indexPageHtml(table: string) {
  const path = join(import.meta.dirname ?? "", "index.tmpl.html");
  const template = await Deno.readTextFile(path);
  return template.replace(
    "${#0}",
    table,
  );
}

async function adminPageHtml(pills: string[]) {
  const path = join(import.meta.dirname ?? "", "admin.tmpl.html");
  const template = await Deno.readTextFile(path);
  const options = pills.map((pill) =>
    `<option value="${pill}">${pill}</option>`
  ).reduce((
    a,
    v,
  ) => a + v);
  return template.replace(
    "${#0}",
    options,
  );
}

export async function listen(port: number) {
  const secret = prompt("enter secret");

  const routes = new Router();
  routes.get("/", async (ctx) => {
    const page = await status().then(render).then(indexPageHtml);
    ctx.response.body = page;
  });

  routes.get("/admin", async (ctx) => {
    const page = await status().then((result) =>
      result.pills.map((v) => v.name)
    ).then((pills) => adminPageHtml(pills));
    ctx.response.body = page;
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
