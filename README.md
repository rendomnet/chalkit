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
const chalkit = new Chalkit(store);
```

---

## Basic Operations

### Setting and Merging Values

```typescript
// Set a value
chalkit.apply("user$set", { name: "John", age: 30 });

// Merge values
chalkit.apply("user$merge", { email: "john@example.com" });
```

### Clearing Values

```typescript
// Clear a value
chalkit.apply("user$clear");
```

---

## Array Operations

### Append to Array

```typescript
chalkit.apply("tags$arrayAppend", { data: ["typescript", "javascript"] });
```

### Toggle Item in Array

```typescript
chalkit.apply("favorites$arrayToggle", "item1");
```

### Remove from Array

```typescript
chalkit.apply("tags$arrayRemove", { item: "typescript" });
```

---

## Collection Operations

### Set Item in Collection

```typescript
chalkit.apply("users$itemSet", {
  id: "user1",
  data: { name: "John", age: 30 },
});
```

### Merge Item in Collection

```typescript
chalkit.apply("users$itemMerge", {
  id: "user1",
  data: { email: "john@example.com" },
});
```

### Delete Item from Collection

```typescript
chalkit.apply("users$itemDelete", "user1");
```

---

## Batch Operations

### Perform Multiple Updates

```typescript
chalkit.batch([
  { command: "user$set", payload: { name: "John" } },
  {
    command: "settings$merge",
    payload: { theme: "dark", notifications: true },
  },
  { command: "tags$arrayAppend", payload: { data: ["typescript"] } },
]);
```

### Handle Batch Errors

```typescript
try {
  chalkit.batch([
    { command: "user$set", payload: { name: "John" } },
    { command: "settings$invalid", payload: { theme: "dark" } }, // Invalid operation
  ]);
} catch (error) {
  console.log("Batch failed, all changes rolled back");
}
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details."
