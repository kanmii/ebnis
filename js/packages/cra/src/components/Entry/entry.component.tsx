import { Button } from "@eb/jsx/src/Button";
import { DropdownMenu } from "@eb/jsx/src/DropdownMenu";
import { Notification } from "@eb/jsx/src/Notification";
import { DataObjectFragment } from "@eb/shared/src/graphql/apollo-types/DataObjectFragment";
import { capitalize } from "@eb/shared/src/utils";
import { isOfflineId } from "@eb/shared/src/utils/offlines";
import { ComponentColorType } from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React, { useContext } from "react";
import { DataStateContext } from "../DetailExperience/detail-experience.context";
import { noTriggerDocumentEventClassName } from "../DetailExperience/detail-experience.dom";
import { formatDatetime } from "../entries/entries.utils";
import {
  entryDeleteMenuItemSelector,
  entryDropdownIsActiveClassName,
  entryDropdownTriggerClassName,
  entryUpdateMenuItemSelector,
} from "./entry.dom";
import { Props } from "./entry.utils";

export function Entry(props: Props) {
  const {
    state: { entryData: entry, syncError },
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
    <>
      {
        // TODO: this does not show up unless sync fails when connection
        // returns. Please fix so that it always show up when there is
        // sync error related to this entry.
        // ???? How to handle fix if no network??? When online/offline entry??
        syncError && (
          <Notification type={ComponentColorType.is_danger} className="mt-5">
            <p>Entry has errors and can not be created/uploaded!</p>
            <p style={{ marginTop: "10px" }}>Click 'edit button' to fix.</p>

            <div className="text-right">
              <Button
                type="button"
                className="font-extrabold"
                onClick={() => {
                  activateUpdateEntryCb({
                    entry,
                    // TODO: remove any type
                    errors: syncError as any,
                    index,
                  });
                }}
              >
                Fix error
              </Button>
            </div>
          </Notification>
        )
      }

      <div
        id={entryId}
        className={cn("shadow-lg relative mt-5")}
        style={{
          boxShadow: isOffline
            ? "var(--media-shadow-1) var(--danger-color), var(--media-shadow-2) var(--danger-color)"
            : "initial",
        }}
      >
        <div className={cn("pb-4 pl-4 pr-12 pt-6 border-t")}>
          {dataObjects.map((d) => {
            const { id, definitionId, data } = d;

            return (
              <div key={id}>
                <div>{capitalize(dataDefinitionIdToNameMap[definitionId])}</div>
                <div>{data}</div>
              </div>
            );
          })}
          <div className={cn("text-right mt-3")}>
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
                  errors: syncError as any,
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
    </>
  );
}

export default Entry;
