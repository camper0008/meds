import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { type Pill, render, restock, status, update } from "./mod.ts";
import * as tmpl from "./oak_ext.tmpl.ts";

type RestockBody = {
  name: string;
  count: number;
  secret: string;
};

function indexPageHtml(table: string) {
  return tmpl.index(table);
}

function adminPageHtml(pills: Pill["name"][]) {
  return tmpl.admin(pills);
}

export async function listen(port: number) {
  const secret = prompt("enter secret:");

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
