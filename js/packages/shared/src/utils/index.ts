export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function deleteObjectKey<T>(obj: T, key: keyof T) {
  delete obj[key];
}
