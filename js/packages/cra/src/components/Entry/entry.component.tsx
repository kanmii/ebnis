import React from "react";
import { Props } from "./entry.utils";
import { DataObjectFragment } from "@eb/cm/src/graphql/apollo-types/DataObjectFragment";
import { isOfflineId } from "@eb/cm/src/utils/offlines";
import makeClassNames from "classnames";
import { formatDatetime } from "../DetailExperience/detailed-experience-utils";
import {
  entryDropdownIsActiveClassName,
  entryUpdateMenuItemSelector,
  entryDropdownTriggerClassName,
  entryDeleteMenuItemSelector,
} from "./entry.dom";
import { noTriggerDocumentEventClassName } from "../DetailExperience/detail-experience.dom";
import { activeClassName } from "../../utils/utils.dom";

export function Entry(props: Props) {
  const {
    state: { entryData: entry, entrySyncError },
    index,
    dataDefinitionIdToNameMap,
    activateUpdateEntryCb,
    entriesOptionsCb,
    menuActive,
    deleteEntryRequest,
  } = props;

  const { updatedAt, dataObjects: dObjects, id: entryId } = entry;
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
                onClick={(e) => {
                  e.preventDefault();

                  activateUpdateEntryCb({
                    entry,
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

      <div
        className={makeClassNames({
          "dropdown is-right": true,
          [entryDropdownIsActiveClassName]: true,
          [activeClassName]: menuActive,
          [noTriggerDocumentEventClassName]: true,
        })}
      >
        <div className="dropdown-menu" role="menu">
          <div className="dropdown-content">
            <a
              className={`neutral-link detailed__edit-experience-link ${entryUpdateMenuItemSelector}`}
              style={{
                cursor: "pointer",
                display: "block",
              }}
              onClick={(e) => {
                e.preventDefault();

                activateUpdateEntryCb({
                  entry,
                  // TODO: remove any type
                  errors: entrySyncError as any,
                  index,
                });
              }}
              href="a"
            >
              <div className="detailed-experience-menu__content">Edit</div>
            </a>
          </div>

          <div className="dropdown-content">
            <a
              className={makeClassNames({
                "neutral-link delete-experience-menu-item": true,
                [entryDeleteMenuItemSelector]: true,
              })}
              style={{
                cursor: "pointer",
                display: "block",
              }}
              onClick={(e) => {
                e.preventDefault();
                deleteEntryRequest(entry);
              }}
              href="b"
            >
              <div className="detailed-experience-menu__content">Delete</div>
            </a>
          </div>
        </div>
      </div>

      <a
        className={`${entryDropdownTriggerClassName} ${noTriggerDocumentEventClassName}`}
        onClick={(e) => {
          e.preventDefault();
          entriesOptionsCb(entry);
        }}
        href="a"
      >
        <span className="icon is-small">
          <i className="fas fa-ellipsis-v" aria-hidden="true" />
        </span>
      </a>
    </div>
  );
}

export default Entry;
