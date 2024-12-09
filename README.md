# Chalkit

A lightweight utility for managing nested state with command-driven operations. Perform atomic updates and batch operations with ease.

---

## Installation

Install via npm:

```bash
npm install chalkit
```

```bash
yarn add chalkit
```

---

## Getting Started

### Import and Initialize

```typescript
import { Chalkit } from "chalkit";

// Initialize store
const store = {};
const chalkit = new Chalkit(store, { marker: "$", divider: "_" });
```

---

## Basic Operations

### Setting and Merging Values

```typescript
// Set a value in a deep path using the divider
chalkit.apply("user_profile_name$set", { name: "John" });

// Merge values into a deep path
chalkit.apply("user_profile_details$merge", {
  age: 30,
  email: "john@example.com",
});
```

### Clearing Values

```typescript
// Clear a value in a deep path
chalkit.apply("user_profile_name$remove");
```

---

## Array Operations

### Append to Array

```typescript
// Append to an array in a deep path
chalkit.apply("user_profile_tags$arrayAppend", {
  data: ["typescript", "javascript"],
});
```

### Toggle Item in Array

```typescript
// Toggle an item in an array in a deep path
chalkit.apply("user_profile_favorites$arrayToggle", "item1");
```

### Remove from Array

```typescript
// Remove an item from an array in a deep path
chalkit.apply("user_profile_tags$arrayRemove", { item: "typescript" });
```

---

## Collection Operations

### Set Item in Collection

```typescript
// Set an item in a collection at a deep path
chalkit.apply("organization_members$itemSet", {
  id: "user1",
  data: { name: "John", age: 30 },
});
```

### Merge Item in Collection

```typescript
// Merge an item in a collection at a deep path
chalkit.apply("organization_members$itemMerge", {
  id: "user1",
  data: { email: "john@example.com" },
});
```

### Delete Item from Collection

```typescript
// Delete an item from a collection at a deep path
chalkit.apply("organization_members$itemDelete", "user1");
```

---

## Batch Operations

### Perform Multiple Updates

```typescript
chalkit.batch([
  { command: "user_profile_name$set", payload: { name: "John" } },
  { command: "settings_theme$set", payload: { theme: "dark" } },
  {
    command: "user_profile_tags$arrayAppend",
    payload: { data: ["typescript"] },
  },
]);
```

### Handle Batch Errors

```typescript
try {
  chalkit.batch([
    { command: "user_profile_name$set", payload: { name: "John" } },
    { command: "settings_invalid$set", payload: { theme: "dark" } }, // Invalid operation
  ]);
} catch (error) {
  console.log("Batch failed, all changes rolled back");
}
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
