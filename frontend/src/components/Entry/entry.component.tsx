import React from "react";
import { Props } from "./entry.utils";
import { DataObjectFragment } from "../../graphql/apollo-types/DataObjectFragment";
import { isOfflineId } from "../../utils/offlines";
import makeClassNames from "classnames";
import { formatDatetime } from "../DetailExperience/detailed-experience-utils";

export function Entry(props: Props) {
  const {
    state: { entryData: eintragDaten, entrySyncError },
    index,
    dataDefinitionIdToNameMap,
    activateUpdateEntryCb,
  } = props;

  const { updatedAt, dataObjects: dObjects, id: entryId } = eintragDaten;
  const dataObjects = dObjects as DataObjectFragment[];
  const isOffline = isOfflineId(entryId);

  return (
    <div
      id={entryId}
      className={makeClassNames({
        "box media entry": true,
        "entry--is-danger": isOffline,
      })}
    >
      <div className="media-content">
        {entrySyncError && (
          <div>
            <div className="subtitle is-6 entry__unsynced-error">
              <p>Entry has errors and can not be created/uploaded!</p>

              <p style={{ marginTop: "10px" }}>Click 'edit button' to fix.</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <button
                type="button"
                className="button is-small
                detailed-experience__entry-edit"
                onClick={() => {
                  activateUpdateEntryCb({
                    entry: eintragDaten,
                    // TODO: remove any type
                    errors: entrySyncError as any,
                    index,
                  });
                }}
              >
                Fix error
              </button>
            </div>
          </div>
        )}

        {dataObjects.map((d) => {
          const { id, definitionId, data } = d;

          return (
            <div key={id} className="media data-object">
              <div className="media-content">
                <div>{dataDefinitionIdToNameMap[definitionId]}</div>
                <div>{data}</div>
              </div>
            </div>
          );
        })}

        <div className="entry__updated-at">{formatDatetime(updatedAt)}</div>
      </div>

      <div className="media-right">x</div>
    </div>
  );
}

export default Entry
