import { Chalkit } from "../src/Chalkit";

describe("Chalkit", () => {
  let store: Record<string, any>;
  let chalkit: Chalkit;

  beforeEach(() => {
    store = {};
    chalkit = new Chalkit(store);
  });

  test("should set a value", () => {
    chalkit.apply("user$set", { name: "John" });
    expect(store.user).toEqual({ name: "John" });
  });

  test("should merge values", () => {
    chalkit.apply("user$set", { name: "John" });
    chalkit.apply("user$merge", { age: 30 });
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

  test("should handle batch operations with existing data", () => {
    // Set initial data
    chalkit.apply("user$set", { email: "john@example.com" });

    // Perform batch operations
    chalkit.batch([
      { command: "user$merge", payload: { name: "John" } },
      { command: "settings$set", payload: { theme: "dark" } },
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
    chalkit.apply("user$set", { name: "Initial" });

    // Attempt batch with invalid operation
    expect(() => {
      chalkit.batch([
        { command: "user$merge", payload: { name: "John" } },
        { command: "settings$invalid", payload: { theme: "dark" } },
      ]);
    }).toThrow();

    // Check if store was rolled back to initial state
    expect(store).toEqual({
      user: { name: "Initial" },
    });
  });

  test("should set deeply nested values", () => {
    chalkit.apply("user$set", {
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
    chalkit.apply("user$set", {
      profile: {
        personal: {
          name: "John",
          contact: {
            email: "john@example.com",
          },
        },
        preferences: {
          theme: "light",
        },
      },
    });

    // Need to merge at each level separately
    chalkit.apply("user_profile_personal_contact$merge", {
      phone: "123-456-7890",
    });
    chalkit.apply("user_profile_preferences$merge", {
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
        command: "user$set",
        payload: {
          profile: {
            personal: { name: "John" },
          },
        },
      },
      {
        command: "user_profile_personal_contact$set",
        payload: { email: "john@example.com" },
      },
      {
        command: "settings$set",
        payload: {
          appearance: {
            theme: {
              mode: "dark",
              color: "blue",
            },
          },
        },
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

  test("should set deeply nested values using path divider", () => {
    chalkit.apply("user_profile_personal$set", { name: "John" });
    chalkit.apply("user_profile_personal_contact$set", {
      email: "john@example.com",
      phone: "123-456-7890",
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

  test("should merge deeply nested values using path divider", () => {
    // Set initial nested data
    chalkit.apply("user_profile_personal$set", {
      name: "John",
      contact: { email: "john@example.com" },
    });
    chalkit.apply("user_profile_preferences$set", { theme: "light" });

    // Merge with new nested data
    chalkit.apply("user_profile_personal_contact$merge", {
      phone: "123-456-7890",
    });
    chalkit.apply("user_profile_preferences$merge", {
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

  test("should handle batch operations with path divider", () => {
    chalkit.batch([
      {
        command: "user_profile_personal$set",
        payload: { name: "John" },
      },
      {
        command: "user_profile_personal_contact$set",
        payload: { email: "john@example.com" },
      },
      {
        command: "settings_appearance_theme$set",
        payload: { mode: "dark", color: "blue" },
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
});
