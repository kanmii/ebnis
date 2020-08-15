import React, { useReducer, useEffect } from "react";
import Header from "../Header/header.component";
import { IndexProps } from "./detail-experience.utils";
import Loading from "../Loading/loading.component";
import { DetailExperience } from "./detail-experience.component";
import { useDeleteExperiencesMutation } from "./detail-experience.injectables";
import {
  reducer,
  initState,
  effectFunctions,
} from "./detail-experience.index-utils";
import { useRunEffects } from "../../utils/use-run-effects";
import { StateValue } from "../../utils/types";

export function DetailExperienceIndex(props: IndexProps) {
  const [stateMachine, dispatch] = useReducer(reducer, undefined, initState);

  const {
    states,
    effects: { general: generalEffects },
    timeouts: { fetchExperience: fetchExperienceTimeout },
  } = stateMachine;

  const [deleteExperiences] = useDeleteExperiencesMutation();

  const effectArgs = { dispatch };

  useRunEffects(generalEffects, effectFunctions, props, effectArgs);

  useEffect(() => {
    if (fetchExperienceTimeout) {
      return () => {
        clearTimeout(fetchExperienceTimeout);
      };
    }

    return undefined;
  }, [fetchExperienceTimeout]);

  function render() {
    switch (states.value) {
      case StateValue.loading:
        return <Loading />;

      case StateValue.errors:
        return states.error;

      case StateValue.data:
        return (
          <DetailExperience
            {...props}
            experience={states.data}
            deleteExperiences={deleteExperiences}
          />
        );
    }
  }

  return (
    <>
      <Header />

      {render()}
    </>
  );
}

// istanbul ignore next:
export default DetailExperienceIndex;
