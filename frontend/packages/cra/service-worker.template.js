/* global importScripts, workbox */
importScripts("%workboxPath%/workbox-sw.js");

workbox.setConfig({
  modulePathPrefix: "%workboxPath%/",
});

/* eslint-disable-next-line no-restricted-globals */
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);
