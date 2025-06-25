import { normalizeCode } from "@cor-matrix/utils/code";
import { createHash } from "node:crypto";
export const Signature = (code: string) => {
  const hash = createHash("sha256");
  hash.update(code);
  return hash.digest("hex");
};

export const CodeSignature = (code: string) => {
  return Signature(normalizeCode(code));
};
