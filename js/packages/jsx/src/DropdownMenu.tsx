import { ReactComponent as DotsVerticalSvg } from "@eb/shared/src/styles/dots-vertical.svg";
import {
  ComponentProps,
  ReactMouseEvent,
} from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React from "react";

export const activeClassName = "is-active";

export function DropdownMenu(props: Props) {
  const { children, className } = props;
  const [menu, trigger] = React.Children.toArray(children);

  return (
    <div
      className={cn("eb-dropdown-menu absolute", className)}
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
  const { children, active, className } = props;

  return (
    <div
      className={cn(
        "eb-dropdown-menu-menu bg-white flex-col absolute top-0 shadow-md",
        active ? activeClassName + " flex" : "hidden",
        className,
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
  const { onClick, children, className } = props;

  return (
    <a
      className={cn(
        "eb-dropdown-content text-gray-600 bg-white rounded cursor-pointer",
        "pl-4 pr-3 pt-3 pb-3 z-20 whitespace-nowrap",
        className,
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
      className={cn(
        "eb-dropdown-trigger text-blue-600 cursor-pointer",
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
    >
      <DotsVerticalSvg
        style={{
          width: "20px",
          height: "20px",
        }}
      />
    </a>
  );
}

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
