import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { render, restock, status, update } from "./mod.ts";
import vento from "jsr:@vento/vento";

type RestockBody = {
  name: string;
  count: number;
  secret: string;
};

export type Config = {
  port: number;
  hostname: string;
  secret: string;
};

export async function listen({ port, hostname, secret }: Config) {
  const env = vento();

  const routes = new Router();
  routes.get("/", async (ctx) => {
    const page = await status().then(render).then((table) =>
      env.run("tmpl/index.vto", { table })
    );
    ctx.response.body = page.content;
  });

  routes.get("/admin", async (ctx) => {
    const page = await status().then((result) =>
      result.pills.map((v) => v.name)
    ).then((pills) => env.run("tmpl/admin.vto", { pills }));
    ctx.response.body = page.content;
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

  app.addEventListener("listen", ({ port, hostname }) => {
    console.log(`listening on ${hostname},`, port);
  });

  await app.listen({ port, hostname });
}

Deno.cron("update at 20 00", "0 20 * * *", () => {
  update();
});
