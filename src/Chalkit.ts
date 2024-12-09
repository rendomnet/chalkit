import { cloneDeep, isPlainObject, merge } from "lodash";

export type Store = Record<string, any>;

interface ChalkitOptions {
  divider?: string;
}

export class Chalkit {
  private store: Store;
  private divider: string;

  constructor(store: Store, options: ChalkitOptions = {}) {
    this.store = store;
    this.divider = options.divider || ".";
  }

  private getTarget(path: string): { target: any; finalKey: string } {
    const keys = path.split(this.divider);
    const finalKey = keys.pop();
    if (!finalKey) throw new Error("Invalid path: Missing target key");

    let target = this.store;
    for (const key of keys) {
      this.ensurePlainObject(target, key);
      target = target[key];
    }

    return { target, finalKey };
  }

  set(path: string, value: any): void {
    const { target, finalKey } = this.getTarget(path);
    target[finalKey] = this.smartCloneDeep(value);
  }

  remove(path: string): void {
    const { target, finalKey } = this.getTarget(path);
    delete target[finalKey];
  }

  merge(path: string, value: Record<string, any>): void {
    const { target, finalKey } = this.getTarget(path);
    this.ensurePlainObject(target, finalKey);
    target[finalKey] = {
      ...target[finalKey],
      ...this.smartCloneDeep(value),
    };
  }

  mergeDeep(path: string, value: Record<string, any>): void {
    const { target, finalKey } = this.getTarget(path);
    this.ensurePlainObject(target, finalKey);
    const existingData = target[finalKey];
    target[finalKey] = merge({}, existingData, this.smartCloneDeep(value));
  }

  // Object item operations
  itemSet(path: string, id: string, data: any): void {
    const { target, finalKey } = this.getTarget(path);
    this.ensurePlainObject(target, finalKey);
    this.ensurePlainObject(target[finalKey], id);
    target[finalKey][id] = this.smartCloneDeep(data);
  }

  itemMerge(path: string, id: string, data: Record<string, any>): void {
    const { target, finalKey } = this.getTarget(path);
    this.ensurePlainObject(target, finalKey);
    this.ensurePlainObject(target[finalKey], id);
    target[finalKey][id] = {
      ...target[finalKey][id],
      ...this.smartCloneDeep(data),
    };
  }

  itemMergeDeep(path: string, id: string, data: Record<string, any>): void {
    const { target, finalKey } = this.getTarget(path);
    this.ensurePlainObject(target, finalKey);
    this.ensurePlainObject(target[finalKey], id);
    const existingData = target[finalKey][id];
    target[finalKey][id] = merge({}, existingData, this.smartCloneDeep(data));
  }

  itemDelete(path: string, id: string): void {
    const { target, finalKey } = this.getTarget(path);
    if (isPlainObject(target[finalKey])) {
      delete target[finalKey][id];
    }
  }

  // Array operations
  arrayAppend(path: string, items: any[]): void {
    const { target, finalKey } = this.getTarget(path);
    this.ensureArray(target, finalKey);
    target[finalKey] = [...target[finalKey], ...this.smartCloneDeep(items)];
  }

  arrayToggle(path: string, item: any): void {
    const { target, finalKey } = this.getTarget(path);
    this.ensureArray(target, finalKey);
    const list = target[finalKey];
    target[finalKey] = list.includes(item)
      ? list.filter((i: any) => i !== item)
      : [...list, this.smartCloneDeep(item)];
  }

  arrayRemove(path: string, item: any): void {
    const { target, finalKey } = this.getTarget(path);
    this.ensureArray(target, finalKey);
    target[finalKey] = target[finalKey].filter((i: any) => i !== item);
  }

  arrayRemoveBy(path: string, property: string, value: any): void {
    const { target, finalKey } = this.getTarget(path);
    this.ensureArray(target, finalKey);
    target[finalKey] = target[finalKey].filter(
      (item: any) => item[property] !== value
    );
  }

  // Batch operations
  batch(operations: Array<{ method: keyof Chalkit; args: any[] }>): void {
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
}
