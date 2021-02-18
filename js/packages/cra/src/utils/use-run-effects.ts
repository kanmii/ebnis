/* eslint-disable react-hooks/rules-of-hooks*/
import { StateValue } from "@eb/cm/src/utils/types";
import { useEffect } from "react";
import { GenericGeneralEffect } from "./effects";

export function useRunEffects<E, EffectFunctionType, Props, EffectArgs>(
  generalEffects: GenericGeneralEffect<E>["effects"]["general"],
  effectFunctions: EffectFunctionType,
  props: Props,
  effectArgs: EffectArgs,
) {
  useEffect(() => {
    if (generalEffects.value !== StateValue.hasEffects) {
      return;
    }

    for (const member of generalEffects.hasEffects.context.effects) {
      const { key, ownArgs } = member as any;

      (effectFunctions as any)[key](
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
        ownArgs as any,
        props,
        effectArgs,
      );
    }

    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, [generalEffects]);
}
