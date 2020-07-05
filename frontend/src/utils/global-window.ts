/* istanbul ignore file */

export enum ChangeUrlType {
  replace = "replace",
  goTo = "goTo",
}

export function windowChangeUrl(url: string, type: ChangeUrlType) {
  switch (type) {
    case ChangeUrlType.replace:
      window.location.replace(url);
      break;

    case ChangeUrlType.goTo:
      window.location.href = url;
      break;
  }
}

export function setUpRoutePage(args: SetUpRoutePageArgs) {
  const {
    title, //
    rootClassName,
  } = args;

  if (title) {
    document.title = title + " - Ebnis";
  }

  if (rootClassName) {
    const el = document.getElementById("root") as HTMLElement;
    el.classList.add(rootClassName);
  }
}

interface SetUpRoutePageArgs {
  title?: string;
  rootClassName?: string;
}
