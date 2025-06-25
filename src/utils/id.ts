import { ulid } from "ulid";

class BaseID {
  #id: string;

  constructor(private prefix?: string) {
    this.#id = ulid();
  }

  toString() {
    return this.prefix ? `${this.prefix}:${this.#id}` : this.#id;
  }
}

export class ID extends BaseID {}
export class WorkspaceID extends BaseID {
  constructor() {
    super("ws");
  }
}
export class TokenID extends BaseID {
  constructor() {
    super("tk");
  }
}
export class CodeOriginRecordID extends BaseID {
  constructor() {
    super("co");
  }
}
export class CodeOriginRatioID extends BaseID {
  constructor() {
    super("cr");
  }
}
