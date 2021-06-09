import {
  ComponentColorStyle,
  ComponentColorType,
  ComponentProps,
  ReactMouseEvent,
} from "@eb/shared/src/utils/types/react";
import React from "react";
import { ButtonClose } from "../../components/Button/button.component";
import cn from "classnames";

export const notificationCloseSelector = "notification-close";

const notificationClasses: ComponentColorStyle = {
  [ComponentColorType.is_success]: `
      bg-green-400
      text-green-800
   `,
  [ComponentColorType.is_danger]: `
      bg-red-200
      text-red-800
  `,
  [ComponentColorType.is_light_success]: `
      bg-green-100
      text-green-800
  `,
  [ComponentColorType.is_light_danger]: `
      bg-red-50
      text-red-800
  `,
  [ComponentColorType.default]: "",
  [ComponentColorType.is_primary]: "",
  [ComponentColorType.is_warning]: `
      bg-yellow-300
      text-yellow-900
  `,
  [ComponentColorType.info]: "",
};

export function Notification(props: Props) {
  const {
    elId,
    children,
    type = ComponentColorType.default,
    onClose,
    style = {},
  } = props;
  // istanbul ignore next:
  const id = props.id || "";
  // istanbul ignore next:
  const className = props.className || "";

  return (
    <div
      className={cn(
        className,
        "eb-notification",
        notificationClasses[type] || "",
        "rounded",
        "relative",
        "!pb-5",
        "!pt-6",
        "!pl-5",
        "!pr-12",
        "font-semibold",
      )}
      style={{
        maxWidth: "550px",
        ...style,
      }}
      id={onClose ? elId || "" : id}
    >
      {onClose && (
        <ButtonClose
          id={id}
          type={type}
          onClose={onClose}
          className={cn(notificationCloseSelector)}
        />
      )}

      {children}
    </div>
  );
}

// istanbul ignore next:
export default Notification;

type Props = ComponentProps & {
  type?: ComponentColorType;
  onClose?: (e: ReactMouseEvent) => void;
  elId?: string;
};
