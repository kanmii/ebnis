export const CLOSE_NOTIFICATION_TIMEOUT_MS = 10 * 1000;
export const FETCH_MAX_TIMEOUT = 5000;

export const FETCH_TIMEOUTS = [2000, 3000, FETCH_MAX_TIMEOUT];

export const MAX_TIMEOUT_MS = 10 * 1000;

export const componentTimeoutsMs: ComponentTimeoutsMs = {
  fetchRetries: FETCH_TIMEOUTS,
  closeNotification: CLOSE_NOTIFICATION_TIMEOUT_MS,
};

export type ComponentTimeoutsMs = {
  fetchRetries: number[];
  closeNotification: number;
};

export type ComponentTimeoutsMsInjectType = {
  componentTimeoutsMsInject: ComponentTimeoutsMs;
};
