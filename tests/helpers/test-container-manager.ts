import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import path from "path";
import { EnvSchema, SecretString } from "../../src/utils/envSchema";
import z from "zod";

const ContainerConfigSchema = EnvSchema.extend({
  WAIT_TIMEOUT: z.coerce.number().default(30000),
  CONTAINER_PORT: z.coerce.number().default(3000),
  DOCKERFILE_PATH: z.string(),
  HEALTH_CHECK_PATH: z.string(),
});

export type ContainerConfig = z.infer<typeof ContainerConfigSchema>;

export interface ContainerInfo extends ContainerConfig {
  BASE_URL: string;
}

class ContainerError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "ContainerError";
  }
}

export class TestContainerManager {
  private container: StartedTestContainer | null = null;
  private readonly config: ContainerConfig;

  constructor(config: ContainerConfig) {
    const result = ContainerConfigSchema.safeParse(config);
    if (!result.success) {
      throw new ContainerError(`Invalid config: ${result.error.message}`);
    }
    this.config = result.data;
  }

  private getEnvironment(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.config).map(([key, value]) => [
        key,
        value instanceof SecretString ? value.unwrap() : String(value),
      ]),
    );
  }

  private async buildContainer(): Promise<StartedTestContainer> {
    const dockerfilePath = path.resolve(__dirname, "../..");
    const genericContainer = await GenericContainer.fromDockerfile(
      dockerfilePath,
      this.config.DOCKERFILE_PATH,
    ).build();

    return genericContainer
      .withEnvironment(this.getEnvironment())
      .withExposedPorts(this.config.CONTAINER_PORT)
      .withWaitStrategy(
        Wait.forHttp(this.config.HEALTH_CHECK_PATH, this.config.CONTAINER_PORT)
          .forStatusCode(200)
          .withStartupTimeout(this.config.WAIT_TIMEOUT),
      )
      .start();
  }

  async startContainer(): Promise<ContainerInfo> {
    if (this.container) {
      throw new ContainerError("Container already running");
    }

    try {
      this.container = await this.buildContainer();
      return this.getContainerInfo();
    } catch (error) {
      this.cleanup();
      throw this.wrapError("Failed to start container", error);
    }
  }

  async stopContainer(): Promise<void> {
    if (!this.container) return;

    try {
      await this.container.stop({ remove: false });
    } catch (error) {
      throw this.wrapError("Failed to stop container", error);
    } finally {
      this.cleanup();
    }
  }

  isRunning(): boolean {
    return this.container !== null;
  }

  getContainerInfo(): ContainerInfo {
    if (!this.container) {
      throw new ContainerError("Container not running");
    }

    const host = this.container.getHost();
    const port = this.container.getMappedPort(this.config.CONTAINER_PORT);

    return {
      ...this.config,
      BASE_URL: `http://${host}:${port}`,
    };
  }

  private cleanup(): void {
    this.container = null;
  }

  private wrapError(message: string, error: unknown): ContainerError {
    return error instanceof ContainerError
      ? error
      : new ContainerError(
          message,
          error instanceof Error ? error : new Error(String(error)),
        );
  }
}

const RANDOM_PORT = Math.floor(Math.random() * (50000 - 40000 + 1)) + 40000;

const DEFAULT_CONFIG = {
  NODE_ENV: "test" as const,
  LOG_LEVEL: "warn" as const,
  DB_FILE_NAME: "/tmp/test.db",
  API_PORT: RANDOM_PORT,
  CONTAINER_PORT: RANDOM_PORT,
  DOCKERFILE_PATH: "src/api/Dockerfile",
  HEALTH_CHECK_PATH: "/healthz",
  WAIT_TIMEOUT: 30000,
  API_KEY: SecretString.from("test-key-32-characters-long-enough"),
  JWT_SECRET: SecretString.from("test-jwt-secret-32-characters-long-enough"),
} as const;

export function createTestContainer(
  config?: Partial<ContainerConfig>,
): TestContainerManager {
  return new TestContainerManager({ ...DEFAULT_CONFIG, ...config });
}

export class ContainerRegistry {
  private containers = new Map<string, TestContainerManager>();

  constructor() {
    this.setupCleanupHandlers();
  }

  async getContainer(
    name: string,
    factory: () => TestContainerManager,
  ): Promise<ContainerInfo> {
    let container = this.containers.get(name);

    if (!container) {
      container = factory();
      this.containers.set(name, container);
    }

    if (!container.isRunning()) {
      try {
        return await container.startContainer();
      } catch (error) {
        this.containers.delete(name);
        throw error;
      }
    }

    return container.getContainerInfo();
  }

  async stopContainer(name: string): Promise<void> {
    const container = this.containers.get(name);
    if (!container) return;

    await container.stopContainer();
    this.containers.delete(name);
  }

  async stopAllContainers(): Promise<void> {
    if (this.containers.size === 0) return;

    await Promise.allSettled(
      Array.from(this.containers.values()).map((container) =>
        container.stopContainer(),
      ),
    );
    this.containers.clear();
  }

  private setupCleanupHandlers(): void {
    const cleanup = async () => {
      try {
        await this.stopAllContainers();
      } catch {
        process.exit(1);
      }
    };

    ["SIGINT", "SIGTERM", "beforeExit"].forEach((event) => {
      process.once(event, cleanup);
    });
  }
}

export const containerRegistry = new ContainerRegistry();
