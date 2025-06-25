import { treaty } from "@elysiajs/eden";
import type { App } from "../../api";
import type {
  CodeOriginRecord,
  CodeOriginRecordWithCode,
} from "../../types/type";
import { execSync } from "child_process";
import { CodeSignature } from "@cor-matrix/utils/signature";

/**
 * Configuration options for {@link CorMatrix} SDK.
 *
 * @property {string} appName - Name of your application.
 * @property {string} appVersion - Version of your application.
 * @property {string} baseURL - Base URL of the CorMatrix API server.
 * @property {string} token - Authentication token for API requests.
 * @property {string} workspaceId - Workspace identifier for associating Code Origin Records (CORs).
 * @property {number} [batchSize=20] - Number of code origin records to send in each batch (default: 20).
 * @property {number} [flushIntervalMs=5000] - Interval (ms) to auto-flush code origin records (default: 5000).
 * @property {number} [maxQueueSize=1000] - Maximum number of code origin records to buffer (default: 1000).
 * @property {"error"|"warn"|"info"|"debug"} [logLevel="error"] - Logging verbosity (default: "error").
 * @property {number} [maxRetries=3] - Maximum number of retries for failed flushes (default: 3).
 */
export interface CorMatrixConfig {
  appName: string;
  appVersion?: string;
  baseURL?: string;
  token?: string;
  workspaceId?: string;
  batchSize?: number; // default: 20
  flushIntervalMs?: number; // default: 5000
  maxQueueSize?: number; // default: 1000
  logLevel?: "error" | "warn" | "info" | "debug"; // default: "error"
  maxRetries?: number; // default: 3
  enabled?: boolean; // default: true
}

class CorMatrixBuffer {
  private buffer: CodeOriginRecord[];
  private head = 0;
  private tail = 0;
  private count = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  enqueue(codeOriginRecord: CodeOriginRecord): boolean {
    if (this.count === this.capacity) return false;
    this.buffer[this.tail] = codeOriginRecord;
    this.tail = (this.tail + 1) % this.capacity;
    this.count++;
    return true;
  }

  dequeue(count: number): CodeOriginRecord[] {
    const dequeued: CodeOriginRecord[] = [];
    const dequeueCount = Math.min(count, this.count);

    for (let i = 0; i < dequeueCount; i++) {
      const codeOriginRecord = this.buffer[this.head];
      if (codeOriginRecord) {
        dequeued.push(codeOriginRecord);
      }
      this.head = (this.head + 1) % this.capacity;
      this.count--;
    }

    return dequeued;
  }

  size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  isFull(): boolean {
    return this.count === this.capacity;
  }

  getBuffer(): (CodeOriginRecord | undefined)[] {
    return [...this.buffer];
  }
}

/**
 * CorMatrix SDK for Node.js
 *
 * Collects, buffers, and sends code origin ratio (COR) records to a remote server.
 * Supports batching, auto-flushing, retry logic.
 *
 * @example
 * ```js
 * import { CorMatrix } from '@presidio-dev/cor-matrix';
 *
 * const ci = new CorMatrix({
 *   appName: 'MyApp',
 *   appVersion: '1.0.0',
 *   baseURL: 'https://api.cor-matrix.dev',
 *   token: 'YOUR_TOKEN',
 *   workspaceId: 'workspace-123',
 *   batchSize: 10, // optional, default 20
 *   flushIntervalMs: 3000, // optional, default 5000
 *   maxQueueSize: 500, // optional, default 1000
 *   logLevel: 'info', // optional, default 'error'
 *   maxRetries: 5 // optional, default 3
 * });
 *
 * ci.addCodeOriginRecord({
 *   code: 'console.log("Hello World")',
 *   path: '/src/index.js',
 *   language: 'javascript',
 *   timestamp: Date.now(),
 *   generatedBy: 'user'
 * });
 *
 * // Manually flush (optional)
 * await ci.flush();
 * ```
 *
 * @see CorMatrixConfig
 */
export class CorMatrix {
  #codeOriginRecord: CorMatrixBuffer = new CorMatrixBuffer(1000);
  #client = treaty<App>("");
  #timer: NodeJS.Timeout | null = null;
  #isFlushing = false;
  #retries = 0;
  #gitUserName: string = "Unknown";
  #enabled = false;
  #initializing = false;
  #exitHandlers: Map<string, () => Promise<void>> = new Map();

  private readonly batchSize!: number;
  private readonly flushIntervalMs!: number;
  private readonly maxQueueSize!: number;
  private readonly logLevel!: string;
  private readonly maxRetries!: number;

  /**
   * Create a new CorMatrix instance.
   *
   * @param {CorMatrixConfig} config - Configuration options for the SDK.
   * @see CorMatrixConfig for option details and defaults.
   */
  constructor(private config: CorMatrixConfig) {
    this.batchSize = config.batchSize ?? 20;
    this.flushIntervalMs = config.flushIntervalMs ?? 5000;
    this.maxQueueSize = config.maxQueueSize ?? 1000;
    this.logLevel = config.logLevel ?? "error";
    this.maxRetries = config.maxRetries ?? 3;
    this.#init();
  }

  #init() {
    if (this.#enabled) {
      this.#log("info", "CorMatrix already initialized");
      return;
    } else {
      try {
        if (this.#initializing) {
          this.#log("info", "CorMatrix already initializing");
          return;
        }
        this.#initializing = true;
        const [baseURL, token, workspaceId] = [
          this.config.baseURL || process.env.COR_MATRIX_BASE_URL,
          this.config.token || process.env.COR_MATRIX_TOKEN,
          this.config.workspaceId || process.env.COR_MATRIX_WORKSPACE_ID,
        ];
        if (!baseURL || !token || !workspaceId) {
          this.#log("error", "Missing required configuration");
          return;
        }
        this.config.baseURL = baseURL;
        this.config.token = token;
        this.config.workspaceId = workspaceId;
        this.#client = treaty<App>(this.config.baseURL!, {
          headers: {
            "app-name": this.config.appName,
            "app-version": this.config.appVersion || "None",
          },
        });
        this.#gitUserName = this.#getGitUserName();
        this.#codeOriginRecord = new CorMatrixBuffer(this.maxQueueSize ?? 1000);
        this.#startAutoFlush();
        this.#setupExitHandlers();
        this.#enabled = true;
        this.#log("info", "CorMatrix initialized");
      } catch (error) {
        this.#enabled = false;
        this.#log("error", "Failed to initialize CorMatrix", error);
      } finally {
        this.#initializing = false;
      }
    }
  }

  async #cleanup() {
    if (this.#enabled && this.#codeOriginRecord.size() > 0) {
      await this.flush();
    }
    this.#stopAutoFlush();
    this.#enabled = false;
  }

  #stopAutoFlush() {
    this.#removeExitHandlers();
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
  }

  /**
   * Add a code origin record to the buffer.
   * Will trigger auto-flush if batch size is reached.
   *
   * @param {CodeOriginRecord} codeOriginRecord - The code origin record object to add.
   * @example
   * ci.addCodeOriginRecord({
   *   code: 'console.log("Hello World")',
   *   path: '/src/index.js',
   *   language: 'javascript',
   *   timestamp: Date.now(),
   *   generatedBy: 'user'
   * });
   */
  public addCodeOriginRecord(codeOriginRecord: CodeOriginRecordWithCode) {
    try {
      if (!this.#enabled) {
        this.#init();
      }
      if (!this.#validateCodeOriginRecord(codeOriginRecord)) {
        this.#log(
          "warn",
          "Invalid code origin record, ignoring",
          codeOriginRecord,
        );
        return;
      }
      if (this.#codeOriginRecord.isFull()) {
        this.#log(
          "error",
          "Code origin record queue is full, dropping code origin record",
        );
        return;
      }
      const success = this.#codeOriginRecord.enqueue({
        cors: codeOriginRecord.code.split("\n").map((line, index) => ({
          order: index,
          signature: CodeSignature(line),
        })),
        path: codeOriginRecord.path,
        timestamp: codeOriginRecord.timestamp ?? Date.now(),
        generatedBy: codeOriginRecord.generatedBy ?? this.#gitUserName,
        language:
          codeOriginRecord.language ??
          this.#extractLanguage(codeOriginRecord.path),
      });
      if (!success) {
        this.#log("error", "Failed to add code origin record to buffer");
      }
      if (this.#codeOriginRecord.size() >= this.batchSize) {
        this.flush();
      }
    } catch (error) {
      this.#log("error", "Failed to add code origin record", error);
    }
  }

  /**
   * Check if the SDK is enabled and operational
   * @returns {boolean} True if SDK is ready to accept code origin records
   */
  public isEnabled(): boolean {
    return this.#enabled;
  }

  #extractLanguage = (path: string) => path.split(".").pop() ?? "unknown";

  #getGitUserName = () => {
    try {
      const userName = execSync("git config user.name").toString().trim();
      return userName;
    } catch (error) {
      return "Unknown";
    }
  };

  /**
   * Manually flush all buffered code origin records to the server.
   * This is called automatically in batch mode and on process exit.
   *
   * @returns {Promise<void>} Resolves when flush is complete.
   */
  public async flush(): Promise<void> {
    if (this.#isFlushing || this.#codeOriginRecord.isEmpty()) return;
    this.#isFlushing = true;
    const codeOriginRecordsToSend = this.#codeOriginRecord.dequeue(
      this.batchSize,
    );
    try {
      await this.#sendCodeOriginRecords(codeOriginRecordsToSend);
      this.#retries = 0;
    } catch (err) {
      this.#log("error", "Failed to send code origin records", err);
      if (this.#retries < this.maxRetries) {
        codeOriginRecordsToSend.forEach((codeOriginRecord) =>
          this.#codeOriginRecord.enqueue(codeOriginRecord),
        );
        this.#retries++;
        setTimeout(() => this.flush(), 500 * this.#retries);
      } else {
        this.#log("error", "Max retries reached, dropping code origin records");
      }
    } finally {
      this.#isFlushing = false;
    }
  }

  /**
   * Internal: Send code origin records to the server
   */
  async #sendCodeOriginRecords(
    codeOriginRecords: CodeOriginRecord[],
  ): Promise<void> {
    if (!codeOriginRecords.length) return;
    await this.#client.v1
      .cors({ workspaceId: this.config.workspaceId! })
      .post(
        {
          entries: codeOriginRecords,
        },
        {
          headers: {
            Authorization: this.config.token!,
          },
        },
      )
      .then(() => {
        this.#log(
          "info",
          `Flushed ${codeOriginRecords.length} code origin records`,
        );
      })
      .catch((err: unknown) => {
        this.#log("error", "Failed to send code origin records", err);
      });
  }

  /**
   * Internal: Start the auto-flush timer
   */
  #startAutoFlush(): void {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = setInterval(() => {
      if (this.#codeOriginRecord.size() > 0) {
        this.flush();
      }
    }, this.flushIntervalMs);
  }

  /**
   * Internal: Setup process exit handlers to flush on exit
   */
  #setupExitHandlers(): void {
    this.#removeExitHandlers();

    const flushAndExit = async () => {
      await this.#cleanup();
      process.exit(0);
    };

    this.#exitHandlers.set("SIGINT", flushAndExit);
    this.#exitHandlers.set("SIGTERM", flushAndExit);
    this.#exitHandlers.set("beforeExit", async () => await this.#cleanup());

    this.#exitHandlers.forEach((handler, event) => {
      process.on(event, handler);
    });
  }

  #removeExitHandlers(): void {
    this.#exitHandlers.forEach((handler, event) => {
      process.removeListener(event, handler);
    });
    this.#exitHandlers.clear();
  }

  /**
   * Internal: Validate a code origin record object
   */
  #validateCodeOriginRecord(
    codeOriginRecord: CodeOriginRecordWithCode,
  ): boolean {
    return (
      typeof codeOriginRecord === "object" &&
      typeof codeOriginRecord.code === "string" &&
      typeof codeOriginRecord.path === "string"
    );
  }

  /**
   * Internal: Logging utility
   */
  #log(level: string, ...args: any[]): void {
    const levels = ["error", "warn", "info", "debug"];
    const levelIdx = levels.indexOf(level);
    const configIdx = levels.indexOf(this.logLevel);
    if (levelIdx <= configIdx) {
      // Use explicit console method
      switch (level) {
        case "error":
          // eslint-disable-next-line no-console
          console.error("[CorMatrix]", ...args);
          break;
        case "warn":
          // eslint-disable-next-line no-console
          console.warn("[CorMatrix]", ...args);
          break;
        case "info":
          // eslint-disable-next-line no-console
          console.info("[CorMatrix]", ...args);
          break;
        case "debug":
          // eslint-disable-next-line no-console
          console.debug("[CorMatrix]", ...args);
          break;
      }
    }
  }
}
export default CorMatrix;
