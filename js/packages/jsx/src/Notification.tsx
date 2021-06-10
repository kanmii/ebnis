import {
  ComponentColorStyle,
  ComponentColorType,
  ComponentProps,
  ReactMouseEvent,
} from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React from "react";
import { ButtonClose } from "./Button";

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
      !bg-red-50
      !text-red-800
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
    children,
    type = ComponentColorType.default,
    style = {},
    className,
    close,
    ...restProps
  } = props;
  const closeProp = (close || {}) as CloseProps;
  const { className: cClassName, onClose, ...otherCloseProps } = closeProp;

  return (
    <div
      className={cn(
        "eb-notification rounded relative !pb-5 !pt-6 !pl-5 !pr-12 font-semibold",
        notificationClasses[type] || "",
        className,
      )}
      style={{
        maxWidth: "550px",
        ...style,
      }}
      {...restProps}
    >
      {onClose && (
        <ButtonClose
          type={type}
          onClose={onClose}
          className={cn(notificationCloseSelector, cClassName)}
          {...otherCloseProps}
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
  close?: CloseProps;
};

type OnClose = (e: ReactMouseEvent) => void;

type CloseProps = ComponentProps & {
  onClose?: OnClose;
};
