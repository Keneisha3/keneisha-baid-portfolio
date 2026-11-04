import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = process.env.JHA_DATA_DIR || path.join(ROOT, "data");
export const CONFIG_DIR = path.join(ROOT, "config");
export const BROWSER_PROFILE_DIR = path.join(ROOT, "browser-profile");
