export type Span = {
  code: string;
  path: string;
  language: string;
  timestamp: number;
  generatedBy: string;
};

export type SpanWithId = Span & {
  id: string;
};

export type SpanLine = {
  id: string;
  instrumentId: string;
  order: number;
  code: string;
  signature: string;
  createdAt: number;
};

export type MakeOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

export type CodeOriginRecord = {
  path: string;
  language: string;
  timestamp: number;
  generatedBy: string;
  cors: CodeOriginRatio[];
};

export type CodeOriginRecordWithCode = Omit<
  MakeOptional<CodeOriginRecord, "generatedBy" | "timestamp" | "language">,
  "cors"
> & {
  code: string;
};

export type CodeOriginRatio = {
  signature: string;
  order: number;
};
