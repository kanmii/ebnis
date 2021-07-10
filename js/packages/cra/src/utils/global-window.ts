/* istanbul ignore file */

export enum ChangeUrlType {
  replace = "replace",
  goTo = "goTo",
  reload = "reload",
}

export function windowChangeUrl(url: string, type: ChangeUrlType) {
  switch (type) {
    case ChangeUrlType.replace:
      window.location.replace(url);
      break;

    case ChangeUrlType.goTo:
      window.location.href = url;
      break;

    case ChangeUrlType.reload:
      window.location.reload();
      break;
  }
}

export type WindowChangeUrlType = {
  windowChangeUrlFn: typeof windowChangeUrl
}

export function setUpRoutePage(args: SetUpRoutePageArgs) {
  const { title, rootClassName } = args;

  if (title) {
    document.title = title + " - Ebnis";
  }

  if (rootClassName) {
    const el = document.getElementById("root") as HTMLElement;
    el.classList.add(rootClassName);
  }
}

export type SetUpRoutePageInject = {
  setUpRoutePageInject: typeof setUpRoutePage;
};

export function getLocation() {
  return window.location;
}

interface SetUpRoutePageArgs {
  title?: string;
  rootClassName?: string;
}
