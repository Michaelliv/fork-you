import { existsSync } from "node:fs";
import { join } from "node:path";
import { initStore } from "../store.js";
import type { OutputOptions } from "../utils/output.js";
import { output, success, warn } from "../utils/output.js";

export async function init(
  _args: string[],
  options: OutputOptions,
): Promise<void> {
  const dir = join(process.cwd(), ".forkyou");
  if (existsSync(dir)) {
    output(options, {
      json: () => ({
        success: true,
        message: "already initialized",
        path: dir,
      }),
      human: () => warn("Already initialized"),
    });
    return;
  }

  const root = initStore();
  output(options, {
    json: () => ({ success: true, path: root }),
    human: () => success(`Initialized fu in ${root}`),
  });
}
