import { readFile } from "node:fs/promises";
import { actOnLogisticsText } from "./logistics_transcription.js";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: npm start -- transcript.txt");
  process.exit(1);
}

const transcript = await readFile(inputPath, "utf8");
const action = await actOnLogisticsText(transcript);
console.log(JSON.stringify(action, null, 2));
