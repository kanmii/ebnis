import { HasEffectsVal, NoEffectVal, StateValue } from "./types";

export function getGeneralEffects<E, T extends GenericGeneralEffect<E>>(proxy: T) {
  const generalEffects = proxy.effects.general as GenericHasEffect<E>;
  generalEffects.value = StateValue.hasEffects;
  let effects: Array<E> = [];

  // istanbul ignore next: trivial
  if (!generalEffects.hasEffects) {
    generalEffects.hasEffects = {
      context: {
        effects,
      },
    };
  } else {
    // istanbul ignore next: trivial
    effects = generalEffects.hasEffects.context.effects;
  }

  return effects;
}

export interface GenericGeneralEffect<E> {
  effects: {
    general: GenericHasEffect<E> | { value: NoEffectVal };
  };
}

export interface GenericHasEffect<EffectType> {
  value: HasEffectsVal;
  hasEffects: {
    context: {
      effects: Array<EffectType>;
    };
  };
}

export interface GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs = {}> {
  key: Key;
  ownArgs: OwnArgs;
  func?: (
    ownArgs: OwnArgs,
    effectArgs: Props,
    lastArgs: EffectArgs,
  ) => void | Promise<void | VoidFn | VoidFn>;
}

type VoidFn = () => void;
