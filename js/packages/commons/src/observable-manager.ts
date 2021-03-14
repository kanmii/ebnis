import { Observable } from "zen-observable-ts";
import { EbnisGlobals, EmitAction } from "./utils/types";

let timeoutId: null | NodeJS.Timeout = null;

export function makeObservable(globals: EbnisGlobals) {
  globals.observable = new Observable<EmitAction>((emitter) => {
    globals.emitter = emitter;
  });

  globals.emitData = function emitData(message: EmitAction) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const { emitter } = globals;

    if (emitter) {
      emitter.next(message);
      return;
    }

    let count = 1;

    retry();

    // try 3 more times to emit the message (hopefully emitter will be available by then)

    function retry() {
      if (count++ > 3) {
        return;
      }

      timeoutId = setTimeout(() => {
        const { emitter } = globals;

        if (emitter) {
          emitter.next(message);
          return;
        }

        retry();
      }, 20);
    }
  };

  return globals;
}
