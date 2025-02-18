import { render, status, update } from "./mod.ts";
import { Config, listen } from "./service.ts";

async function configFromFile(path: string): Promise<Config | null> {
  try {
    return JSON.parse(await Deno.readTextFile(path));
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
    return null;
  }
}

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
    case "service": {
      const configPath = "conf.json";
      const config = await configFromFile(configPath);
      if (!config) {
        console.error(`error: could not find config at '${configPath}'`);
        Deno.exit(1);
      }
      await listen(config);
      break;
    }
    default: {
      console.error(
        `unrecognized action '${action}', expected 'service' | 'status' | 'update'`,
      );
      Deno.exit(1);
    }
  }
  Deno.exit(0);
}

if (import.meta.main) {
  main();
}
