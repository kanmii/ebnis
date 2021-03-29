export function trimClass(classString: string) {
  return classString
    .split("\n")
    .reduce((acc, text) => {
      text = text.trim();
      if (text) {
        acc.push(text);
      }
      return acc;
    }, [] as string[])
    .join(" ");
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
