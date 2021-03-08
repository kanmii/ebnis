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
