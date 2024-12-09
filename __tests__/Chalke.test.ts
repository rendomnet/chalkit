import { Chalkit } from "../src/Chalkit";

describe("Chalkit", () => {
  let store: Record<string, any>;
  let chalkit: Chalkit;

  beforeEach(() => {
    store = {};
    chalkit = new Chalkit(store);
  });

  test("should set a value", () => {
    chalkit.call("user$set", { name: "John" });
    expect(store.user).toEqual({ name: "John" });
  });

  test("should merge values", () => {
    chalkit.call("user$set", { name: "John" });
    chalkit.call("user$merge", { age: 30 });
    expect(store.user).toEqual({ name: "John", age: 30 });
  });

  test("should handle batch operations", () => {
    chalkit.batch([
      { command: "user$set", payload: { name: "John" } },
      { command: "settings$set", payload: { theme: "dark" } },
    ]);

    expect(store).toEqual({
      user: { name: "John" },
      settings: { theme: "dark" },
    });
  });
});
