import { cloneDeep, isPlainObject, merge } from "lodash";

export type Store = Record<string, any>;

interface ChalkitOptions {
  divider?: string; // Character separating path keys (default: ".")
}

export class Chalkit {
  private store: Store;
  private divider: string;

  constructor(store: Store, options: ChalkitOptions = {}) {
    this.store = store;
    this.divider = options.divider || ".";
  }

  // Direct operation methods
  set(path: string, value: any): void {
    this.executeOperation(path, "set", value);
  }

  clear(path: string): void {
    this.executeOperation(path, "clear", undefined);
  }

  merge(path: string, value: Record<string, any>): void {
    this.executeOperation(path, "merge", value);
  }

  deepSet(path: string, value: any): void {
    this.executeOperation(path, "deepSet", { data: value });
  }

  deepMerge(path: string, value: Record<string, any>): void {
    this.executeOperation(path, "deepMerge", value);
  }

  itemSet(path: string, id: string, data: any): void {
    this.executeOperation(path, "itemSet", { id, data });
  }

  itemMerge(path: string, id: string, data: Record<string, any>): void {
    this.executeOperation(path, "itemMerge", { id, data });
  }

  itemDelete(path: string, id: string): void {
    this.executeOperation(path, "itemDelete", id);
  }

  arrayAppend(path: string, items: any[]): void {
    this.executeOperation(path, "arrayAppend", { data: items });
  }

  arrayToggle(path: string, item: any): void {
    this.executeOperation(path, "arrayToggle", item);
  }

  arrayRemove(path: string, item: any): void {
    this.executeOperation(path, "arrayRemove", { item });
  }

  // Batch operations with new interface
  batch(
    operations: Array<{
      method: keyof Chalkit;
      args: any[];
    }>
  ): void {
    // Determine the affected top-level keys
    const affectedKeys = new Set(
      operations.map(({ args }) => args[0].split(this.divider)[0])
    );

    // Clone only the affected parts of the store for rollback
    const originalStore: Partial<Store> = {};
    for (const key of affectedKeys) {
      if (key in this.store) {
        originalStore[key] = cloneDeep(this.store[key]);
      }
    }

    try {
      // Execute each operation
      operations.forEach(({ method, args }) => {
        if (typeof this[method] === "function") {
          const fn = this[method] as (...args: any[]) => void;
          fn.apply(this, args);
        } else {
          throw new Error(`Invalid method: ${String(method)}`);
        }
      });
    } catch (error) {
      console.error("Batch execution failed. Rolling back changes...", error);

      // Rollback only the affected parts
      for (const key of affectedKeys) {
        if (key in originalStore) {
          this.store[key] = originalStore[key];
        } else {
          delete this.store[key];
        }
      }

      throw new Error(
        `Batch execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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

  private executeOperation(
    path: string,
    operation: string,
    payload: any
  ): void {
    const keys = path.split(this.divider);
    const finalKey = keys.pop();
    if (!finalKey) throw new Error("Invalid path: Missing target key");

    let target = this.store;
    for (const key of keys) {
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

      case "deepMerge": {
        this.ensurePlainObject(target, finalKey);
        const existingData = target[finalKey];
        const newData = payload.data || payload;
        target[finalKey] = merge(
          {},
          existingData,
          this.smartCloneDeep(newData)
        );
        break;
      }

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
