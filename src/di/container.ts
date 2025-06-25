type Constructor<T = any> = new (...args: any[]) => T;

type Factory<T = any> = (...deps: any[]) => T;

type Token<T = any> = string | symbol | Constructor<T>;

type TokenType<T> = T extends Constructor<infer U> ? U : T;

type Scope = "singleton" | "transient" | "scoped";

type Lifecycle = {
  onInit?: (instance: any) => void;

  onDispose?: (instance: any) => void;
};

interface FactoryRegistration<T = any> {
  factory: Factory<T>;

  dependencies: Token[];

  scope: Scope;

  lifecycle?: Lifecycle;
}
export class DI {
  private parent?: DI;

  private context = new Map<Token, unknown>();

  private factories = new Map<Token, FactoryRegistration<any>>();

  private resolving = new Set<Token>();

  private multiBindings = new Map<Token, FactoryRegistration<any>[]>();

  private scopedContext = new Map<Token, unknown>();

  static global = new DI();

  static registerValue<T>(
    token: Token<T>,
    value: TokenType<T>,
    lifecycle?: Lifecycle,
  ): void {
    DI.global.registerValue(token, value, lifecycle);
  }
  static registerFactory<T>(
    token: Token<T>,
    dependencies: Token[],
    factory: Factory<TokenType<T>>,
    scope: Scope = "singleton",
    lifecycle?: Lifecycle,
  ): void {
    DI.global.registerFactory(token, dependencies, factory, scope, lifecycle);
  }

  static registerMulti<T>(
    token: Token<T>,
    dependencies: Token[],
    factory: Factory<T>,
    scope: Scope = "singleton",
    lifecycle?: Lifecycle,
  ): void {
    DI.global.registerMulti(token, dependencies, factory, scope, lifecycle);
  }

  static resolve<T>(token: Token<T>): TokenType<T> {
    return DI.global.resolve(token);
  }

  static resolveAll<T>(token: Token<T>): TokenType<T>[] {
    return DI.global.resolveAll(token);
  }

  static resolveLazy<T>(token: Token<T>): () => TokenType<T> {
    return DI.global.resolveLazy(token);
  }

  static overrideFactory<T>(
    token: Token<T>,
    factory: Factory<T>,
    dependencies: Token[] = [],
    scope: Scope = "singleton",
    lifecycle?: Lifecycle,
  ): void {
    DI.global.overrideFactory(token, factory, dependencies, scope, lifecycle);
  }

  static unregister(token: Token): void {
    DI.global.unregister(token);
  }

  static reset(): void {
    DI.global.reset();
  }

  constructor(parent?: DI) {
    this.parent = parent;
  }

  registerValue<T>(
    token: Token<T>,
    value: TokenType<T>,
    lifecycle?: Lifecycle,
  ): void {
    this.context.set(token, value as unknown);
    if (lifecycle?.onInit) lifecycle.onInit(value);
  }

  registerFactory<T>(
    token: Token<T>,
    dependencies: Token[],
    factory: Factory<TokenType<T>>,
    scope: Scope = "singleton",
    lifecycle?: Lifecycle,
  ): void {
    this.factories.set(token, {
      factory: factory as Factory<any>,
      dependencies,
      scope,
      lifecycle,
    });
  }

  registerMulti<T>(
    token: Token<T>,
    dependencies: Token[],
    factory: Factory<T>,
    scope: Scope = "singleton",
    lifecycle?: Lifecycle,
  ): void {
    if (!this.multiBindings.has(token)) this.multiBindings.set(token, []);
    this.multiBindings
      .get(token)!
      .push({ factory, dependencies, scope, lifecycle });
  }

  resolve<T>(token: Token<T>): TokenType<T> {
    return this._resolve(token) as TokenType<T>;
  }

  resolveAll<T>(token: Token<T>): TokenType<T>[] {
    const regs = this.multiBindings.get(token);
    if (!regs) return [];
    return regs.map((reg) => {
      const deps = reg.dependencies.map((dep) => this._resolve(dep));
      const value = reg.factory(...deps);
      if (reg.lifecycle?.onInit) reg.lifecycle.onInit(value);
      return value as TokenType<T>;
    });
  }

  resolveLazy<T>(token: Token<T>): () => TokenType<T> {
    return () => this.resolve(token);
  }

  overrideFactory<T>(
    token: Token<T>,
    factory: Factory<T>,
    dependencies: Token[] = [],
    scope: Scope = "singleton",
    lifecycle?: Lifecycle,
  ): void {
    this.factories.set(token, { factory, dependencies, scope, lifecycle });
    this.context.delete(token);
  }

  createScope(): DI {
    const scoped = new DI(this);
    scoped.scopedContext.clear();
    return scoped;
  }

  dispose(): void {
    for (const [token, value] of this.scopedContext.entries()) {
      const reg = this.factories.get(token);
      if (reg?.lifecycle?.onDispose) reg.lifecycle.onDispose(value);
    }
    this.scopedContext.clear();
  }

  private _resolve<T>(token: Token<T>): TokenType<T> {
    if (this.scopedContext.has(token)) {
      return this.scopedContext.get(token) as TokenType<T>;
    }

    if (this.context.has(token)) {
      return this.context.get(token) as TokenType<T>;
    }

    if (this.parent) {
      try {
        return this.parent.resolve(token);
      } catch {}
    }

    const reg = this.factories.get(token);
    if (reg) {
      if (this.resolving.has(token)) {
        throw new Error(
          `Circular dependency detected for token: ${String(token)}`,
        );
      }
      this.resolving.add(token);
      const deps = reg.dependencies.map((dep) => this._resolve(dep));
      const value = reg.factory(...deps);
      if (reg.lifecycle?.onInit) reg.lifecycle.onInit(value);
      if (reg.scope === "singleton") {
        this.context.set(token, value as unknown);
      } else if (reg.scope === "scoped") {
        this.scopedContext.set(token, value as unknown);
      }
      this.resolving.delete(token);
      return value as TokenType<T>;
    }

    throw new Error(`No dependency found for token: ${String(token)}`);
  }

  unregister(token: Token): void {
    const value = this.context.get(token);
    const reg = this.factories.get(token);
    if (reg?.lifecycle?.onDispose && value) reg.lifecycle.onDispose(value);
    this.context.delete(token);
    this.factories.delete(token);
    this.multiBindings.delete(token);
    this.scopedContext.delete(token);
  }

  reset(): void {
    for (const [token, value] of this.context.entries()) {
      const reg = this.factories.get(token);
      if (reg?.lifecycle?.onDispose) reg.lifecycle.onDispose(value);
    }
    this.context.clear();
    this.factories.clear();
    this.resolving.clear();
    this.multiBindings.clear();
    this.scopedContext.clear();
  }

  createChildContainer(): DI {
    return new DI(this);
  }
}
