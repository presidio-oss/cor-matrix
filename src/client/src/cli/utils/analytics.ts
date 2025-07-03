import fs from "node:fs/promises";
import { normalizeCode } from "@cor-matrix/utils/code";
import { Signature } from "@cor-matrix/utils/signature";

export async function generateHashes(
  files: string[],
): Promise<{ file: string; hashes: string[] }[]> {
  const hashes: { file: string; hashes: string[] }[] = [];
  for (const file of files) {
    try {
      const fileContent = await fs.readFile(file, "utf-8");
      const fileLineHashes = fileContent
        .split("\n")
        .map(normalizeCode)
        .map(Signature);
      hashes.push({ file, hashes: fileLineHashes });
    } catch (e) {
      continue;
    }
  }
  return hashes;
}
