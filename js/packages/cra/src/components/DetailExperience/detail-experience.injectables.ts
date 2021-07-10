// istanbul ignore next:
export function scrollDocumentToTop() {
  document.documentElement.scrollTop = 0;
}

export function clearTimeoutFn(timeout: NodeJS.Timeout) {
  clearTimeout(timeout);
}

export type ClearTimeoutFnInjectType = {
  clearTimeoutFnInject: typeof clearTimeoutFn;
};
