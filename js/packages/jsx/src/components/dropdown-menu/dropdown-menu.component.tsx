import { ReactComponent as DotsVerticalSvg } from "@eb/shared/src/styles/dots-vertical.svg";
import { trimClass } from "@eb/shared/src/utils";
import {
  ComponentProps,
  ReactMouseEvent,
} from "@eb/shared/src/utils/types/react";
import React from "react";

export const activeClassName = "is-active";

export function DropdownMenu(props: Props) {
  const { children } = props;
  const className = props.className || "";
  const [menu, trigger] = React.Children.toArray(children);

  return (
    <div
      className={trimClass(
        `
          absolute
          ${className}
        `,
      )}
      style={{
        right: "1.5rem",
        top: "10px",
      }}
    >
      {menu}
      {trigger}
    </div>
  );
}

function Menu(props: MenuProps) {
  const { children, active } = props;
  const className = props.className || "";

  return (
    <div
      className={trimClass(
        `
            eb-dropdown-menu
            bg-white
            ${active ? activeClassName + " flex" : "hidden"}
            flex-col
            absolute
            top-0
            shadow-md
            ${className}
          `,
      )}
      style={{
        right: "24px",
        minWidth: "10rem",
      }}
      role="menu"
    >
      {children}
    </div>
  );
}

function Item(
  props: ComponentProps & {
    onClick: (e: ReactMouseEvent) => void;
  },
) {
  const { onClick, children } = props;
  const className = props.className || "";

  return (
    <a
      className={trimClass(
        `
          eb-content
          text-gray-600
          bg-white
          rounded
          cursor-pointer
          pl-4
          pr-3
          pt-3
          pb-3
          z-20
          whitespace-nowrap
          ${className}
        `,
      )}
      style={{
        borderTopWidth: "0.5px",
      }}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

function Trigger(props: TriggerProp) {
  const { onClick } = props;
  const className = props.className || "";

  return (
    <a
      className={trimClass(
        `
          eb-trigger
          text-blue-600
          ${className}
        `,
      )}
      onClick={onClick}
    >
      <DotsVerticalSvg />
    </a>
  );
}

export default DropdownMenu;
DropdownMenu.Trigger = Trigger;
DropdownMenu.Item = Item;
DropdownMenu.Menu = Menu;

type Props = ComponentProps;

type MenuProps = ComponentProps & {
  active?: boolean;
};

type TriggerProp = ComponentProps & {
  onClick: (e: ReactMouseEvent) => void;
};
