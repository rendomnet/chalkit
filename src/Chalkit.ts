import { cloneDeep, isPlainObject, merge } from "lodash";

export type Store = Record<string, any>;

interface ChalkitOptions {
  divider?: string;
  marker?: string;
  mutator?: (updater: (store: Store) => void) => void;
}

export class Chalkit {
  private store: Store;
  private divider: string;
  private marker: string;
  private mutator?: (updater: (store: Store) => void) => void;

  constructor(store: Store, options: ChalkitOptions = {}) {
    this.store = store;
    this.divider = options.divider || ".";
    this.marker = options.marker || "$";
    this.mutator = options.mutator;
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

  private applyChange(callback: (store: Store) => void): void {
    if (this.mutator) {
      this.mutator(callback);
    } else {
      callback(this.store);
    }
  }

  set(path: string, value: any): this {
    const { target, finalKey } = this.getTarget(path);
    this.applyChange(() => {
      target[finalKey] = this.smartCloneDeep(value);
    });
    return this;
  }

  remove(path: string): this {
    const { target, finalKey } = this.getTarget(path);
    this.applyChange(() => {
      delete target[finalKey];
    });
    return this;
  }

  merge(path: string, value: Record<string, any>): this {
    const { target, finalKey } = this.getTarget(path);
    this.applyChange(() => {
      this.ensurePlainObject(target, finalKey);
      target[finalKey] = {
        ...target[finalKey],
        ...this.smartCloneDeep(value),
      };
    });
    return this;
  }

  mergeDeep(path: string, value: Record<string, any>): this {
    const { target, finalKey } = this.getTarget(path);
    this.applyChange(() => {
      this.ensurePlainObject(target, finalKey);
      const existingData = target[finalKey];
      target[finalKey] = merge({}, existingData, this.smartCloneDeep(value));
    });
    return this;
  }

  // Object item operations
  itemSet(path: string, id: string, data: any): this {
    const { target, finalKey } = this.getTarget(path);
    this.applyChange(() => {
      this.ensurePlainObject(target, finalKey);
      this.ensurePlainObject(target[finalKey], id);
      target[finalKey][id] = this.smartCloneDeep(data);
    });
    return this;
  }

  itemMerge(path: string, id: string, data: Record<string, any>): this {
    const { target, finalKey } = this.getTarget(path);
    this.applyChange(() => {
      this.ensurePlainObject(target, finalKey);
      this.ensurePlainObject(target[finalKey], id);
      target[finalKey][id] = {
        ...target[finalKey][id],
        ...this.smartCloneDeep(data),
      };
    });
    return this;
  }

  itemMergeDeep(path: string, id: string, data: Record<string, any>): this {
    const { target, finalKey } = this.getTarget(path);
    this.applyChange(() => {
      this.ensurePlainObject(target, finalKey);
      this.ensurePlainObject(target[finalKey], id);
      const existingData = target[finalKey][id];
      target[finalKey][id] = merge({}, existingData, this.smartCloneDeep(data));
    });
    return this;
  }

  itemDelete(path: string, id: string): this {
    const { target, finalKey } = this.getTarget(path);
    this.applyChange(() => {
      if (isPlainObject(target[finalKey])) {
        delete target[finalKey][id];
      }
    });
    return this;
  }

  // Array operations
  arrayAppend(path: string, items: any[]): this {
    const { target, finalKey } = this.getTarget(path);
    this.applyChange(() => {
      this.ensureArray(target, finalKey);
      target[finalKey] = [...target[finalKey], ...this.smartCloneDeep(items)];
    });
    return this;
  }

  arrayToggle(path: string, item: any): this {
    const { target, finalKey } = this.getTarget(path);
    this.applyChange(() => {
      this.ensureArray(target, finalKey);
      const list = target[finalKey];
      target[finalKey] = list.includes(item)
        ? list.filter((i: any) => i !== item)
        : [...list, this.smartCloneDeep(item)];
    });
    return this;
  }

  arrayRemove(path: string, item: any): this {
    const { target, finalKey } = this.getTarget(path);
    this.applyChange(() => {
      this.ensureArray(target, finalKey);
      target[finalKey] = target[finalKey].filter((i: any) => i !== item);
    });
    return this;
  }

  arrayRemoveBy(path: string, property: string, value: any): this {
    const { target, finalKey } = this.getTarget(path);
    this.applyChange(() => {
      this.ensureArray(target, finalKey);
      target[finalKey] = target[finalKey].filter(
        (item: any) => item[property] !== value
      );
    });
    return this;
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

  setStore(store: Store): this {
    this.applyChange(() => {
      this.store = store;
    });
    return this;
  }

  // type path with command suffix
  // Value is the data to be set
  scribe(pathWithSuffix: string, value: any): this {
    const [path, suffix] = pathWithSuffix.split(this.marker);
    switch (suffix) {
      case "set":
        this.set(path, value);
        break;
      case "remove":
        this.remove(path);
        break;
      case "merge":
        this.merge(path, value);
        break;
      case "mergeDeep":
        this.mergeDeep(path, value);
        break;
      case "itemSet":
        this.itemSet(path, value.id, value.data);
        break;
      case "itemMerge":
        this.itemMerge(path, value.id, value.data);
        break;
      case "itemMergeDeep":
        this.itemMergeDeep(path, value.id, value.data);
        break;
      case "itemDelete":
        this.itemDelete(path, value);
        break;
      case "arrayAppend":
        this.arrayAppend(path, value);
        break;
      case "arrayToggle":
        this.arrayToggle(path, value);
        break;
      case "arrayRemove":
        this.arrayRemove(path, value);
        break;
      case "arrayRemoveBy":
        this.arrayRemoveBy(path, value.property, value.value);
        break;
      default:
        throw new Error(`Invalid suffix: ${suffix}`);
    }
    return this;
  }

  scribeBatch(operations: Array<{ path: string; value: any }>): this {
    try {
      // Get affected top-level keys
      const affectedKeys = new Set(
        operations.map(
          ({ path }) => path.split(this.divider)[0].split(this.marker)[0]
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
        // Execute each operation
        operations.forEach(({ path, value }) => {
          this.scribe(path, value);
        });
      } catch (error) {
        // Rollback only the affected parts
        for (const key of affectedKeys) {
          if (key in originalStore) {
            this.store[key] = originalStore[key];
          } else {
            delete this.store[key];
          }
        }
        throw error;
      }
    } catch (error) {
      throw new Error(
        `Batch execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return this;
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
