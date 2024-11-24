export type Pill = {
  name: string;
  perDay: number;
  count: number;
  daysLeft: number;
};

type PillTableLength = {
  [key in keyof Pill]: number;
};

type FilePill = Omit<Omit<Pill, "daysLeft">, "name">;

type Restock = {
  name: string;
  count: number;
};

type FileRestock = {
  count: number;
};

function isExample(name: string) {
  return name.includes("example.json");
}

function filePillToPill(name: string, pill: FilePill): Pill {
  return {
    perDay: pill.perDay,
    count: pill.count,
    daysLeft: calculatePillsLeft(pill),
    name,
  };
}

async function readAndParse<T>(path: string): Promise<T> {
  const data = await Deno.readTextFile(path);
  const content: T = JSON.parse(data);
  return content;
}

export type Result = {
  pills: Pill[];
  errors: string[];
};

async function pillRestock(
  name: string,
): Promise<FileRestock | null> {
  try {
    const restock: FileRestock = await readAndParse(`restock/${name}`);
    await Deno.remove(`restock/${name}`);
    return restock;
  } catch {
    /* no restocking available */
    return null;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const file = await Deno.open(path);
    file.close();

    return true;
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
    return false;
  }
}

export async function status(): Promise<Result> {
  return await runTask(false);
}

export async function update(): Promise<Result> {
  return await runTask(true);
}

export async function restock(restock: Restock) {
  const existing = await pillRestock(restock.name) ?? { count: 0 };
  existing.count += restock.count;
  Deno.writeTextFile(`restock/${restock.name}`, JSON.stringify(existing));
}

async function runTask(update: boolean = true): Promise<Result> {
  const pills: Pill[] = [];
  const errors = [];

  for await (const dirEntry of Deno.readDir("pills")) {
    if (isExample(dirEntry.name)) {
      continue;
    }
    const pill: FilePill = await readAndParse(
      `pills/${dirEntry.name}`,
    );
    if (update) {
      const restock = await pillRestock(dirEntry.name).then((restock) =>
        restock?.count ?? 0
      );
      const diff = restock - pill.perDay;
      pill.count += diff;
      await Deno.writeTextFile(`pills/${dirEntry.name}`, JSON.stringify(pill));
    }
    pills.push(filePillToPill(dirEntry.name, pill));
  }

  for await (const dirEntry of Deno.readDir("restock")) {
    if (isExample(dirEntry.name)) {
      continue;
    }
    if (await fileExists(`pills/${dirEntry.name}`)) {
      continue;
    }
    errors.push(
      `found file ${dirEntry.name} which was not relevant to any pill`,
    );
  }
  return { pills, errors };
}

function calculatePillsLeft({ count, perDay }: FilePill): number {
  return Math.max(Math.floor(count / perDay), 0);
}

export function render({ pills, errors }: Result): string {
  const defaultLength = {
    name: 0,
    perDay: 0,
    count: 0,
    daysLeft: 0,
  };

  const count = (lengths: PillTableLength, pill: Pill, key: keyof Pill) =>
    Math.max(key.length, lengths[key], pill[key].toString().length);

  const columnLength = pills.reduce(
    (acc, pill) => ({
      name: count(acc, pill, "name"),
      perDay: count(acc, pill, "perDay"),
      count: count(acc, pill, "count"),
      daysLeft: count(acc, pill, "daysLeft"),
    }),
    defaultLength,
  );

  const paddedFromKey = (
    pill: Pill,
    length: PillTableLength,
    key: keyof Pill,
  ) => {
    if (key === "name") {
      return pill[key].toString().padEnd(length[key], " ");
    }
    return pill[key].toString().padStart(length[key], " ");
  };

  const divider = "+" + "-".repeat(columnLength.name + 2) + "+" +
    "-".repeat(columnLength.count + 2) + "+" +
    "-".repeat(columnLength.perDay + 2) + "+" +
    "-".repeat(columnLength.daysLeft + 2) + "+";

  const rows = pills.map(
    (pill) =>
      `| ${paddedFromKey(pill, columnLength, "name")} | ${
        paddedFromKey(pill, columnLength, "count")
      } | ${paddedFromKey(pill, columnLength, "perDay")} | ${
        paddedFromKey(pill, columnLength, "daysLeft")
      } |`,
  );

  const paddedLegend = (length: PillTableLength, key: keyof Pill) =>
    key.padEnd(length[key], " ");

  const legend = `| ${paddedLegend(columnLength, "name")} | ${
    paddedLegend(columnLength, "count")
  } | ${paddedLegend(columnLength, "perDay")} | ${
    paddedLegend(columnLength, "daysLeft")
  } |`;

  rows.unshift(legend);

  let result = rows.reduce(
    (acc, row) => acc + "\n" + row + "\n" + divider,
    divider,
  );

  if (errors.length > 0) {
    result += "\n\n";

    result += errors.reduce(
      (acc, row) => acc + "\n" + row,
      `encountered ${errors.length} error${errors.length !== 1 ? "s" : ""}${
        errors.length > 0 ? ":" : ""
      }`,
    );
  }

  return result;
}
