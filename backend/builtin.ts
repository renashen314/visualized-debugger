import {
  Heap,
  type ArrayValue,
  type ObjectValue,
  type PrimitiveValue,
  type RuntimeValue,
} from "./memory.ts";

export function printPrimitive(v: PrimitiveValue): string {
  if (v.type === "null") {
    return "null";
  }
  if (v.type === "string") {
    return `"${v.value}"`;
  }
  return String(v.value);
}

export function printObject(heap: Heap, v: ObjectValue): string {
  const strs: string[] = [];
  for (const [key, value] of Object.entries(v.properties)) {
    strs.push(`"${key}": ${printAny(heap, heap.get(value))}`);
  }
  return `{ ${strs.join(", ")} }`;
}

export function printArray(heap: Heap, v: ArrayValue): string {
  const strs: string[] = [];
  for (const elem of v.elements) {
    strs.push(printAny(heap, heap.get(elem)));
  }
  return `[ ${strs.join(", ")} ]`;
}

export function printAny(heap: Heap, v: RuntimeValue): string {
  switch (v.type) {
    case "string":
    case "number":
    case "boolean":
    case "null":
      return printPrimitive(v);
    case "object":
    case "array":

    case "function":
    case "builtinfunction":
      throw new Error(`Cannot print ${v.type}`);

      break;
    default:
      throw new Error(`Cannot print this type`);
  }
}
