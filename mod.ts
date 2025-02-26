export type Pill = {
  name: string;
  perDay: number;
  count: number;
  daysLeft: number;
  leftOver: number;
};

type PillTableLength = {
  [key in keyof Pill]: number;
};

type FilePill = {
  perDay: Pill["perDay"];
  count: Pill["count"];
};

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
  const daysLeft = pill.perDay !== 0
    ? Math.max(0, Math.floor(pill.count / pill.perDay))
    : 0;
  return {
    perDay: pill.perDay,
    count: pill.count,
    daysLeft,
    leftOver: pill.perDay !== 0
      ? Math.max(0, pill.count % pill.perDay)
      : pill.count,
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
      await Deno.writeTextFile(`last_update`, (new Date()).toString());
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

export function render({ pills: unsortedPills, errors }: Result): string {
  const pills = unsortedPills.toSorted((a, b) => a.name.localeCompare(b.name));

  const defaultLength = {
    name: "name".length,
    perDay: "perDay".length,
    count: "count".length,
    daysLeft: "daysLeft".length,
    leftOver: "leftOver".length,
  };

  const count = (lengths: PillTableLength, pill: Pill, key: keyof Pill) =>
    Math.max(key.length, lengths[key], pill[key].toString().length);

  const columnLength = pills.reduce(
    (acc, pill) => ({
      name: count(acc, pill, "name"),
      perDay: count(acc, pill, "perDay"),
      count: count(acc, pill, "count"),
      daysLeft: count(acc, pill, "daysLeft"),
      leftOver: count(acc, pill, "leftOver"),
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
    "-".repeat(columnLength.daysLeft + 2) + "+" +
    "-".repeat(columnLength.leftOver + 2) + "+";

  const rows = pills.map(
    (pill) =>
      `| ${paddedFromKey(pill, columnLength, "name")} | ${
        paddedFromKey(pill, columnLength, "count")
      } | ${paddedFromKey(pill, columnLength, "perDay")} | ${
        paddedFromKey(pill, columnLength, "daysLeft")
      } | ${paddedFromKey(pill, columnLength, "leftOver")} |`,
  );

  const paddedLegend = (length: PillTableLength, key: keyof Pill) =>
    key.padEnd(length[key], " ");

  const legend = `| ${paddedLegend(columnLength, "name")} | ${
    paddedLegend(columnLength, "count")
  } | ${paddedLegend(columnLength, "perDay")} | ${
    paddedLegend(columnLength, "daysLeft")
  } | ${paddedLegend(columnLength, "leftOver")} |`;

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
