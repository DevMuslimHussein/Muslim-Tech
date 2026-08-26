import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const PG_CTL = "C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe";
const PG_DATA = "C:/Users/DevMu/pgdata-muslimtech";

function ensurePostgres() {
  if (!existsSync(PG_CTL)) {
    console.log("⚠ لم يُعثر على PostgreSQL في المسار المتوقع — تجاهل تشغيله تلقائيًا.");
    return;
  }

  const status = spawnSync(PG_CTL, ["-D", PG_DATA, "status"]);
  if (status.status === 0) {
    console.log("✓ قاعدة البيانات تعمل بالفعل");
    return;
  }

  console.log("▶ تشغيل قاعدة البيانات...");
  const start = spawnSync(PG_CTL, [
    "-D",
    PG_DATA,
    "-l",
    `${PG_DATA}/server.log`,
    "-o",
    "-p 5433",
    "start",
  ]);

  if (start.status !== 0) {
    console.error("✗ تعذّر تشغيل قاعدة البيانات. راجع", `${PG_DATA}/server.log`);
    process.exit(1);
  }
  console.log("✓ قاعدة البيانات جاهزة");
}

ensurePostgres();

// With shell:true, an args array is joined into one flat string with no
// quoting — that scrambles three separate "pnpm ... dev" sub-commands into
// one. Building the full command line ourselves keeps each one intact.
const command = [
  "npx concurrently",
  '--kill-others --names "api,admin,student" --prefix-colors "green,cyan,magenta"',
  '"pnpm --filter @muslim-tech/api dev"',
  '"pnpm --filter @muslim-tech/admin dev"',
  '"pnpm --filter @muslim-tech/student dev"',
].join(" ");

const child = spawn(command, { stdio: "inherit", shell: true });

child.on("exit", (code) => process.exit(code ?? 0));
