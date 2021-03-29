import { DataObjectFragment } from "@eb/cm/src/graphql/apollo-types/DataObjectFragment";
import { trimClass, capitalize } from "@eb/cm/src/utils";
import { isOfflineId } from "@eb/cm/src/utils/offlines";
import { ComponentColorType } from "@eb/cm/src/utils/types/react";
import { Button } from "@eb/jsx/src/components/Button/button.component";
import DropdownMenu from "@eb/jsx/src/components/dropdown-menu/dropdown-menu.component";
import { Notification } from "@eb/jsx/src/components/Notification/notification.component";
import React, { Fragment } from "react";
import { noTriggerDocumentEventClassName } from "../DetailExperience/detail-experience.dom";
import { formatDatetime } from "../entries/entries.utils";
import {
  dataValueSelector,
  entryDeleteMenuItemSelector,
  entryDropdownIsActiveClassName,
  entryDropdownTriggerClassName,
  entryUpdateMenuItemSelector,
} from "./entry.dom";
import { Props } from "./entry.utils";

export function Entry(props: Props) {
  const {
    state: { entryData: entry, syncError, dataDefinitionIdToNameMap },
    index,
    activateUpdateEntryCb,
    entriesOptionsCb,
    menuActive,
    deleteEntryRequest,
  } = props;

  const { updatedAt, dataObjects: dObjects, id: entryId } = entry;
  const dataObjects = dObjects as DataObjectFragment[];
  const isOffline = isOfflineId(entryId);

  return (
    <>
      {
        // :TODO: this does not show up unless sync fails when connection
        // returns. Please fix so that it always show up when there is
        // sync error related to this entry.
        // ???? How to handle fix if no network??? When online/offline entry??
        syncError && (
          <Notification
            type={ComponentColorType.is_danger}
            className={trimClass(`
            mt-5
          `)}
          >
            <p>Entry has errors and can not be created/uploaded!</p>
            <p style={{ marginTop: "10px" }}>Click 'edit button' to fix.</p>

            <div
              className={trimClass(`
               text-right
            `)}
            >
              <Button
                type="button"
                className={trimClass(`
                  font-extrabold
              `)}
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
        className={trimClass(
          `
          relative
          shadow-lg
          relative
          mt-5
        `,
        )}
        style={{
          boxShadow: isOffline
            ? "var(--media-shadow-1) var(--danger-color), var(--media-shadow-2) var(--danger-color)"
            : "initial",
        }}
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
              <Fragment key={id}>
                {/*:TODO: style and find better way to display data*/}
                <div>{capitalize(dataDefinitionIdToNameMap[definitionId])}</div>
                <div
                  className={trimClass(`
                    ${dataValueSelector}
                  `)}
                >
                  {data}
                </div>
              </Fragment>
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
