import { readConfig, requireRoot, writeConfig } from "../store.js";
import type { OutputOptions } from "../utils/output.js";
import { bold, dim, error, output, success } from "../utils/output.js";

export async function configStages(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const config = readConfig(root);

  // No args = show current stages
  if (args.length === 0) {
    output(options, {
      json: () => ({ success: true, stages: config.stages }),
      human: () => {
        console.log();
        console.log(`  ${bold("Pipeline Stages")}`);
        console.log();
        for (let i = 0; i < config.stages.length; i++) {
          console.log(`  ${dim(`${i + 1}.`)} ${config.stages[i]}`);
        }
        console.log();
      },
    });
    return;
  }

  // --set stage1,stage2,stage3
  if (args[0] === "--set" && args[1]) {
    const stages = args[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (stages.length < 2) {
      output(options, {
        json: () => ({ success: false, error: "too_few_stages" }),
        human: () => error("At least 2 stages required"),
      });
      process.exit(1);
    }
    config.stages = stages;
    writeConfig(root, config);
    output(options, {
      json: () => ({ success: true, stages: config.stages }),
      human: () => success(`Stages updated: ${stages.join(" → ")}`),
    });
    return;
  }

  output(options, {
    json: () => ({ success: false, error: "unknown_args" }),
    human: () => {
      error("Usage: fu config stages [--set stage1,stage2,...]");
    },
  });
  process.exit(1);
}
