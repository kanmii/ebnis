/* istanbul ignore file */

export function scrollIntoView(
  id: string,
  options: ScrollIntoViewOptions = {
    behavior: "smooth",
  },
) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  if (!element.scrollIntoView) {
    window.location.href = window.location.pathname + `#${id}`;
    return;
  }

  element.scrollIntoView(options);
}

export type ScrollIntoView = (
  id: string,
  options?: ScrollIntoViewOptions,
) => void;
