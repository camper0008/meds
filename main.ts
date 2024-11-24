import { render, status, update } from "./lib.ts";
import { listen } from "./oak_ext.ts";

async function main() {
  const action = Deno.args[0];
  switch (action) {
    case "status": {
      console.log(await status().then(render));
      break;
    }
    case "update": {
      console.log(await update().then(render));
      break;
    }
    case "ext-serve": {
      const port = Deno.args[1];
      try {
        const parsed = parseInt(port);
        listen(parsed);
      } catch {
        console.error(`invalid port '${port}', expected int`);
        Deno.exit(1);
      }
      break;
    }
    default: {
      console.error(
        `unrecognized action '${action}', expected 'ext-serve' | 'status' | 'update'`,
      );
      Deno.exit(1);
    }
  }
  Deno.exit(0);
}

if (import.meta.main) {
  main();
}
