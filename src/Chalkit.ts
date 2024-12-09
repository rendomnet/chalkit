import { cloneDeep, isPlainObject } from "lodash";

export type Store = Record<string, any>;

export type Operation =
  | "set"
  | "clear"
  | "merge"
  | "deepSet"
  | "deepMerge"
  | "itemSet"
  | "itemMerge"
  | "itemDelete"
  | "arrayAppend"
  | "arrayToggle"
  | "arrayRemove";

interface ChalkeOptions {
  commandChar?: string; // Character separating path and operation (default: "$")
  pathDivider?: string; // Character separating path keys (default: "_")
}

interface BatchCommand {
  command: string;
  payload: any;
}

export class Chalkit {
  private store: Store;
  private commandChar: string;
  private pathDivider: string;

  constructor(store: Store, options: ChalkeOptions = {}) {
    this.store = store;
    this.commandChar = options.commandChar || "$";
    this.pathDivider = options.pathDivider || "_";
  }

  apply(command: string, payload?: any): void {
    if (!command.includes(this.commandChar)) {
      throw new Error(
        `Invalid command format. Expected "path${this.commandChar}operation"`
      );
    }

    const [path, op] = command.split(this.commandChar);

    if (!this.isValidOperation(op)) {
      throw new Error(`Invalid operation: ${op}`);
    }

    const operation = op as Operation;
    const keys = path.split(this.pathDivider);

    try {
      this.updateStore(keys, operation, payload);
    } catch (error) {
      console.error(`Failed to execute command "${command}":`, error);
      throw error;
    }
  }

  batch(commands: BatchCommand[]): void {
    // Determine the affected top-level keys
    const affectedKeys = new Set(
      commands.map(
        ({ command }) =>
          command.split(this.commandChar)[0].split(this.pathDivider)[0]
      )
    );

    // Clone only the affected parts of the store for rollback
    const originalStore: Partial<Store> = {};
    for (const key of affectedKeys) {
      if (key in this.store) {
        originalStore[key] = cloneDeep(this.store[key]);
      }
    }

    try {
      // Execute each command
      commands.forEach(({ command, payload }) => {
        this.apply(command, payload);
      });
    } catch (error) {
      console.error("Batch execution failed. Rolling back changes...", error);

      // Rollback only the affected parts
      for (const key of affectedKeys) {
        if (key in originalStore) {
          this.store[key] = originalStore[key]; // Restore original value
        } else {
          delete this.store[key]; // Remove keys that were added during batch
        }
      }

      throw new Error(
        `Batch execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private isValidOperation(op: string): op is Operation {
    return [
      "set",
      "clear",
      "merge",
      "deepSet",
      "deepMerge",
      "itemSet",
      "itemMerge",
      "itemDelete",
      "arrayAppend",
      "arrayToggle",
      "arrayRemove",
    ].includes(op);
  }

  private ensurePlainObject(target: any, key: string): void {
    if (!isPlainObject(target[key])) {
      target[key] = {};
    }
  }

  private ensureArray(target: any, key: string): void {
    if (!Array.isArray(target[key])) {
      target[key] = [];
    }
  }

  private smartCloneDeep(value: any): any {
    if (isPlainObject(value) || Array.isArray(value)) {
      return cloneDeep(value);
    }
    return value;
  }

  private updateStore(
    path: string[],
    operation: Operation,
    payload: any
  ): void {
    const finalKey = path.pop();
    if (!finalKey) throw new Error("Invalid command: Missing target key");

    let target = this.store;
    for (const key of path) {
      this.ensurePlainObject(target, key);
      target = target[key];
    }

    switch (operation) {
      case "set":
        target[finalKey] = this.smartCloneDeep(payload);
        break;

      case "clear":
        delete target[finalKey];
        break;

      case "merge":
        this.ensurePlainObject(target, finalKey);
        target[finalKey] = {
          ...target[finalKey],
          ...this.smartCloneDeep(payload),
        };
        break;

      case "deepSet":
        target[finalKey] = this.smartCloneDeep(payload.data);
        break;

      case "deepMerge":
        this.ensurePlainObject(target, finalKey);
        target[finalKey] = {
          ...target[finalKey],
          ...this.smartCloneDeep(payload.data || payload),
        };
        break;

      case "itemSet":
        this.ensurePlainObject(target[finalKey], payload.id);
        target[finalKey][payload.id] = this.smartCloneDeep(payload.data);
        break;

      case "itemMerge":
        this.ensurePlainObject(target[finalKey], payload.id);
        target[finalKey][payload.id] = {
          ...target[finalKey][payload.id],
          ...this.smartCloneDeep(payload.data),
        };
        break;

      case "itemDelete":
        if (isPlainObject(target[finalKey])) {
          delete target[finalKey][payload];
        }
        break;

      case "arrayAppend":
        this.ensureArray(target, finalKey);
        target[finalKey] = [
          ...target[finalKey],
          ...this.smartCloneDeep(payload.data),
        ];
        break;

      case "arrayToggle": {
        this.ensureArray(target, finalKey);
        const list = target[finalKey];
        target[finalKey] = list.includes(payload)
          ? list.filter((item: any) => item !== payload)
          : [...list, this.smartCloneDeep(payload)];
        break;
      }

      case "arrayRemove":
        this.ensureArray(target, finalKey);
        if (payload.item) {
          target[finalKey] = target[finalKey].filter(
            (item: any) => item !== payload.item
          );
        }
        break;

      default:
        throw new Error(`Unsupported operation '${operation}'`);
    }
  }
}
