import { Any } from "@eb/cm/src/utils/types";
import { Draft } from "immer";
import { HasEffectsVal, NoEffectVal, StateValue } from "./types";

export function getGeneralEffects<
  EffectType,
  T extends
    | GenericGeneralEffect<EffectType>
    | Draft<GenericGeneralEffect<EffectType>>
>(writeableStateMachine: T) {
  const generalEffects = writeableStateMachine.effects
    .general as GenericHasEffect<EffectType>;
  generalEffects.value = StateValue.hasEffects;
  let effects: Array<EffectType> = [];

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
    general: GeneralEffectProperty<E>;
  };
}

export type GeneralEffectProperty<E> =
  | GenericHasEffect<E>
  | { value: NoEffectVal };

export interface GenericHasEffect<EffectType> {
  value: HasEffectsVal;
  hasEffects: {
    context: {
      effects: Array<EffectType>;
    };
  };
}

export interface GenericEffectDefinition<
  EffectArgs,
  Props,
  Key,
  OwnArgs = Any
> {
  key: Key;
  ownArgs: OwnArgs;
  func?: (
    ownArgs: OwnArgs,
    effectArgs: Props,
    lastArgs: EffectArgs,
  ) => void | Promise<void | VoidFn | VoidFn>;
}

type VoidFn = () => void;
