import React, { useEffect, useCallback, useReducer } from "react";
import Header from "../Header/header.component";
import Loading from "../Loading/loading.component";
import { My } from "./my.component";
import { fetchExperiencesErrorsDomId, fetchErrorRetryDomId } from "./my.dom";
import errorImage from "../../media/error-96.png";
import {
  initIndexState,
  StateValue,
  ActionType,
  indexReducer,
  effectFunctions,
} from "./my.utils";

export default () => {
  const [stateMachine, dispatch] = useReducer(
    indexReducer,
    undefined,
    initIndexState,
  );
  const {
    states,
    effects: { general: generalEffects },
  } = stateMachine;

  useEffect(() => {
    if (generalEffects.value !== StateValue.hasEffects) {
      return;
    }

    for (const { key, ownArgs } of generalEffects.hasEffects.context.effects) {
      effectFunctions[key](
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
        ownArgs as any,
        { dispatch },
      );
    }

    /* eslint-disable-next-line react-hooks/exhaustive-deps*/
  }, [generalEffects]);

  const onReFetch = useCallback(() => {
    dispatch({
      type: ActionType.ON_DATA_RE_FETCHED,
    });
  }, []);

  return (
    <>
      <Header />

      {states.value === StateValue.error ? (
        <FetchExperiencesFail error={states.error} onReFetch={onReFetch} />
      ) : states.value === StateValue.loading ? (
        <Loading />
      ) : (
        <My experiences={states.data} />
      )}
    </>
  );
};

function FetchExperiencesFail(props: { error: string; onReFetch: () => void }) {
  const { error, onReFetch } = props;
  return (
    <div className="card my__fetch-errors" id={fetchExperiencesErrorsDomId}>
      <div className="card-image">
        <figure className="image is-96x96 my__fetch-errors-image">
          <img src={errorImage} alt="error loading experiences" />
        </figure>
      </div>

      <div className="my__fetch-errors-content card-content notification is-light is-danger">
        <div className="content">
          <p>{error}</p>
        </div>

        <button
          className="button is-medium"
          type="button"
          id={fetchErrorRetryDomId}
          onClick={onReFetch}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
