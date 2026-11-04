import fs from "node:fs";
import path from "node:path";
import { CONFIG_DIR } from "./paths.js";

function load(name) {
  const real = path.join(CONFIG_DIR, `${name}.json`);
  const example = path.join(CONFIG_DIR, `${name}.example.json`);
  const file = fs.existsSync(real) ? real : example;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  data._source = path.basename(file);
  return data;
}

export const loadProfile = () => load("profile");
export const loadTargets = () => load("targets");
