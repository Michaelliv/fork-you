import { buildDb } from "../db";
import { readConfig, requireRoot } from "../store";
import type { OutputOptions } from "../utils/output";
import { bold, dim, info, output } from "../utils/output";

export async function pipeline(
  _args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const config = readConfig(root);
  const db = await buildDb(root);

  const stmt = db.prepare(
    "SELECT stage, COUNT(*) as count, COALESCE(SUM(value), 0) as total, COALESCE(SUM(value * probability / 100.0), 0) as weighted FROM deals GROUP BY stage",
  );

  const stageData = new Map<
    string,
    { count: number; total: number; weighted: number }
  >();
  while (stmt.step()) {
    const row = stmt.getAsObject() as {
      stage: string;
      count: number;
      total: number;
      weighted: number;
    };
    stageData.set(row.stage, {
      count: row.count,
      total: row.total,
      weighted: row.weighted,
    });
  }
  stmt.free();
  db.close();

  const stages = config.stages.map((stage) => ({
    stage,
    ...(stageData.get(stage) || { count: 0, total: 0, weighted: 0 }),
  }));

  const totalDeals = stages.reduce((sum, s) => sum + s.count, 0);
  const totalValue = stages.reduce((sum, s) => sum + s.total, 0);
  const totalWeighted = stages.reduce((sum, s) => sum + s.weighted, 0);

  output(options, {
    json: () => ({
      success: true,
      stages,
      totalDeals,
      totalValue,
      totalWeighted,
      currency: config.currency,
    }),
    human: () => {
      if (totalDeals === 0) {
        info("No deals in pipeline");
        return;
      }
      console.log();
      console.log(`  ${bold("Pipeline")}`);
      console.log();
      for (const s of stages) {
        if (s.count === 0) {
          console.log(`  ${dim(s.stage.padEnd(16))}  ${dim("—")}`);
        } else {
          const bar = "█".repeat(Math.max(1, Math.round(s.count * 2)));
          console.log(
            `  ${s.stage.padEnd(16)}  ${bar} ${s.count} deal(s)  $${s.total.toLocaleString()}${s.weighted > 0 ? dim(`  weighted: $${Math.round(s.weighted).toLocaleString()}`) : ""}`,
          );
        }
      }
      console.log();
      console.log(
        `  ${bold("Total:")} ${totalDeals} deal(s)  $${totalValue.toLocaleString()}${totalWeighted > 0 ? dim(`  weighted: $${Math.round(totalWeighted).toLocaleString()}`) : ""}`,
      );
      console.log();
    },
  });
}
