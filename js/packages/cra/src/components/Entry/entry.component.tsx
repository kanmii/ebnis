import { DataObjectFragment } from "@eb/cm/src/graphql/apollo-types/DataObjectFragment";
import { trimClass } from "@eb/cm/src/utils";
import { isOfflineId } from "@eb/cm/src/utils/offlines";
import DropdownMenu from "@eb/jsx/src/components/dropdown-menu/dropdown-menu.component";
import React, { useContext, Fragment } from "react";
import { DataStateContext } from "../DetailExperience/detail-experience.context";
import { noTriggerDocumentEventClassName } from "../DetailExperience/detail-experience.dom";
import { formatDatetime } from "../DetailExperience/detailed-experience-utils";
import {
  entryDeleteMenuItemSelector,
  entryDropdownIsActiveClassName,
  entryDropdownTriggerClassName,
  entryUpdateMenuItemSelector,
} from "./entry.dom";
import { Props } from "./entry.utils";

export function Entry(props: Props) {
  const {
    state: { entryData: entry, entrySyncError },
    index,
    activateUpdateEntryCb,
    entriesOptionsCb,
    menuActive,
    deleteEntryRequest,
  } = props;

  const {
    context: { dataDefinitionIdToNameMap },
  } = useContext(DataStateContext);

  const { updatedAt, dataObjects: dObjects, id: entryId } = entry;
  const dataObjects = dObjects as DataObjectFragment[];
  const isOffline = isOfflineId(entryId);

  return (
    <Fragment>
      {entrySyncError && (
        <div>
          <div
            className={trimClass(`
               subtitle
               is-6
               font-bold
            `)}
          >
            <p>Entry has errors and can not be created/uploaded!</p>
            <p style={{ marginTop: "10px" }}>Click 'edit button' to fix.</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <button
              type="button"
              className={trimClass(
                `
                  button
                  is-small
                  detailed-experience__entry-edit
                `,
              )}
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

      <div
        id={entryId}
        className={trimClass(
          `
          entry
          relative
          ${isOffline ? "entry--is-danger" : ""}
          shadow-lg
          relative
          mt-5
        `,
        )}
      >
        <div
          className={trimClass(
            `
              pb-4
              pl-4
              pr-12
              pt-6
              border-t
          `,
          )}
        >
          {dataObjects.map((d) => {
            const { id, definitionId, data } = d;

            return (
              <div key={id}>
                <div>{dataDefinitionIdToNameMap[definitionId]}</div>
                <div>{data}</div>
              </div>
            );
          })}
          <div
            className={trimClass(`
               text-right
               mt-3
            `)}
          >
            {formatDatetime(updatedAt)}
          </div>
        </div>
        <DropdownMenu
          className={`
          ${entryDropdownIsActiveClassName}
          ${noTriggerDocumentEventClassName}
        `}
        >
          <DropdownMenu.Menu active={menuActive}>
            <DropdownMenu.Item
              className={entryUpdateMenuItemSelector}
              onClick={(e) => {
                e.preventDefault();

                activateUpdateEntryCb({
                  entry,
                  // :TODO: remove any type
                  errors: entrySyncError as any,
                  index,
                });
              }}
            >
              Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={entryDeleteMenuItemSelector}
              onClick={(e) => {
                e.preventDefault();
                deleteEntryRequest(entry);
              }}
            >
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Menu>

          <DropdownMenu.Trigger
            className={`
            ${entryDropdownTriggerClassName}
            ${noTriggerDocumentEventClassName}
          `}
            onClick={(e) => {
              e.preventDefault();
              entriesOptionsCb(entry);
            }}
          />
        </DropdownMenu>
      </div>
    </Fragment>
  );
}

export default Entry;
