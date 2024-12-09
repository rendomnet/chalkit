import { Chalkit } from "../src/Chalkit";

describe("Chalkit", () => {
  let store: Record<string, any>;
  let chalkit: Chalkit;

  beforeEach(() => {
    store = {};
    chalkit = new Chalkit(store);
  });

  test("should set a value", () => {
    chalkit.set("user", { name: "John" });
    expect(store.user).toEqual({ name: "John" });
  });

  test("should merge values", () => {
    chalkit.set("user", { name: "John" });
    chalkit.merge("user", { age: 30 });
    expect(store.user).toEqual({ name: "John", age: 30 });
  });

  test("should handle batch operations", () => {
    chalkit.batch([
      { method: "set", args: ["user", { name: "John" }] },
      { method: "set", args: ["settings", { theme: "dark" }] },
    ]);

    expect(store).toEqual({
      user: { name: "John" },
      settings: { theme: "dark" },
    });
  });

  test("should handle batch operations with existing data", () => {
    // Set initial data
    chalkit.set("user", { email: "john@example.com" });

    // Perform batch operations
    chalkit.batch([
      { method: "merge", args: ["user", { name: "John" }] },
      { method: "set", args: ["settings", { theme: "dark" }] },
    ]);

    expect(store).toEqual({
      user: {
        email: "john@example.com",
        name: "John",
      },
      settings: { theme: "dark" },
    });
  });

  test("should rollback on batch operation failure", () => {
    // Set initial data
    chalkit.set("user", { name: "Initial" });

    // Attempt batch with invalid operation
    expect(() => {
      chalkit.batch([
        { method: "merge", args: ["user", { name: "John" }] },
        { method: "invalid" as any, args: ["settings", { theme: "dark" }] },
      ]);
    }).toThrow();

    // Check if store was rolled back to initial state
    expect(store).toEqual({
      user: { name: "Initial" },
    });
  });

  test("should set deeply nested values", () => {
    chalkit.set("user", {
      profile: {
        personal: {
          name: "John",
          contact: {
            email: "john@example.com",
            phone: "123-456-7890",
          },
        },
      },
    });

    expect(store.user).toEqual({
      profile: {
        personal: {
          name: "John",
          contact: {
            email: "john@example.com",
            phone: "123-456-7890",
          },
        },
      },
    });
  });

  test("should merge deeply nested values", () => {
    // Set initial nested data
    chalkit.set("user", {
      profile: {
        personal: {
          name: "John",
          contact: { email: "john@example.com" },
        },
        preferences: { theme: "light" },
      },
    });

    // Merge with new nested data
    chalkit.mergeDeep("user.profile.personal.contact", {
      phone: "123-456-7890",
    });
    chalkit.mergeDeep("user.profile.preferences", {
      notifications: true,
    });

    expect(store.user).toEqual({
      profile: {
        personal: {
          name: "John",
          contact: {
            email: "john@example.com",
            phone: "123-456-7890",
          },
        },
        preferences: {
          theme: "light",
          notifications: true,
        },
      },
    });
  });

  test("should handle batch operations with deeply nested values", () => {
    chalkit.batch([
      {
        method: "set",
        args: ["user", { profile: { personal: { name: "John" } } }],
      },
      {
        method: "set",
        args: ["user.profile.personal.contact", { email: "john@example.com" }],
      },
      {
        method: "set",
        args: [
          "settings",
          {
            appearance: {
              theme: {
                mode: "dark",
                color: "blue",
              },
            },
          },
        ],
      },
    ]);

    expect(store).toEqual({
      user: {
        profile: {
          personal: {
            name: "John",
            contact: {
              email: "john@example.com",
            },
          },
        },
      },
      settings: {
        appearance: {
          theme: {
            mode: "dark",
            color: "blue",
          },
        },
      },
    });
  });

  // Add tests for new array operations
  test("should handle array operations", () => {
    chalkit.arrayAppend("todos", ["Task 1", "Task 2"]);
    expect(store.todos).toEqual(["Task 1", "Task 2"]);

    chalkit.arrayToggle("todos", "Task 3");
    expect(store.todos).toEqual(["Task 1", "Task 2", "Task 3"]);

    chalkit.arrayToggle("todos", "Task 2");
    expect(store.todos).toEqual(["Task 1", "Task 3"]);

    chalkit.arrayRemove("todos", "Task 3");
    expect(store.todos).toEqual(["Task 1"]);
  });

  // Add tests for item operations
  test("should handle item operations", () => {
    chalkit.itemSet("users", "user1", { name: "John" });
    expect(store.users).toEqual({ user1: { name: "John" } });

    chalkit.itemMerge("users", "user1", { age: 30 });
    expect(store.users).toEqual({ user1: { name: "John", age: 30 } });

    chalkit.itemDelete("users", "user1");
    expect(store.users).toEqual({});
  });
});
