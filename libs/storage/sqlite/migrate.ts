import type Database from "better-sqlite3";
import { schemaSql } from "./schema.js";

export function migrate(db: Database.Database): void {
  db.exec(schemaSql);
}
