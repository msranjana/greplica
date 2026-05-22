import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { migrate } from "./migrate.js";

export function defaultDatabasePath(): string {
  const home = process.env.ENGINEERING_CONTEXT_HOME ?? join(homedir(), ".engineering-context");
  return join(home, "graph.db");
}

export function openDatabase(path = defaultDatabasePath()): Database.Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}
