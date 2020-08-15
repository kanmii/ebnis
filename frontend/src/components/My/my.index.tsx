import React, { useCallback, useReducer } from "react";
import Header from "../Header/header.component";
import Loading from "../Loading/loading.component";
import { My } from "./my.component";
import { fetchExperiencesErrorsDomId, fetchErrorRetryDomId } from "./my.dom";
import errorImage from "../../media/error-96.png";
import {
  initState,
  ActionType,
  reducer,
  effectFunctions,
} from "./my-index.utils";
import { StateValue } from "../../utils/types";
import { CallerProps } from "./my.utils";
import { useRunEffects } from "../../utils/use-run-effects";

export function MyIndex(props: CallerProps) {
  const [stateMachine, dispatch] = useReducer(reducer, undefined, initState);
  const {
    states,
    effects: { general: generalEffects },
  } = stateMachine;

  useRunEffects(generalEffects, effectFunctions, props, { dispatch });

  const onReFetch = useCallback(() => {
    dispatch({
      type: ActionType.DATA_RE_FETCH_REQUEST,
    });
  }, []);

  return (
    <>
      <Header />

      {states.value === StateValue.errors ? (
        <FetchExperiencesFail error={states.error} onReFetch={onReFetch} />
      ) : states.value === StateValue.loading ? (
        <Loading />
      ) : (
        <My experiences={states.data} {...props} parentDispatch={dispatch} />
      )}
    </>
  );
}

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

export default MyIndex;
