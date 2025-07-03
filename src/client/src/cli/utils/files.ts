import path from "node:path";
import ignoreWalk from "ignore-walk";
import { isBinaryFile } from "isbinaryfile";

export async function listFilesRecursive(dir: string): Promise<string[]> {
  const files = await ignoreWalk({
    path: dir,
    ignoreFiles: [".gitignore"],
    includeEmpty: false,
    follow: false,
  });
  return files.map((f) => path.join(dir, f));
}

export async function excludeBinaryFiles(files: string[]): Promise<string[]> {
  const fileChecks = await Promise.all(
    files.map(async (file) => {
      try {
        const isBinary = await isBinaryFile(file);
        return { file, isBinary };
      } catch {
        // If isbinaryfile throws, treat it as a file to exclude
        return { file, isBinary: true };
      }
    }),
  );

  return fileChecks.filter(({ isBinary }) => !isBinary).map(({ file }) => file);
}
