import { ReactComponent as XCircleFilledSvg } from "@eb/shared/src/styles/x-circle-filled.svg";
import { trimClass } from "@eb/shared/src/utils";
import {
  ComponentColorStyle,
  ComponentColorType,
  ComponentProps,
  ReactMouseEvent,
} from "@eb/shared/src/utils/types/react";
import React, { DetailedHTMLProps } from "react";

const classes: ComponentColorStyle = {
  [ComponentColorType.is_danger]: `
    border-transparent
    text-white
    bg-red-400
    hover:bg-red-500
    active:bg-red-500
    focus:bg-red-500
  `,
  [ComponentColorType.is_success]: `
    bg-green-400
    border-transparent
    text-white
    hover:bg-green-500
    active:bg-green-500
    focus:bg-green-500
  `,
  [ComponentColorType.default]: `
    bg-white
    text-gray-800
    border-gray-200
    hover:border-gray-400
    active:border-gray-400
    focus:border-gray-400
  `,
  [ComponentColorType.is_light_success]: "",
  [ComponentColorType.is_light_danger]: "",
};

export function Button({
  children,
  className,
  btnType = ComponentColorType.default,
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={trimClass(
        `
          ${classes[btnType]}
          ${className || ""}
          border
          cursor-pointer
          justify-center
          px-4
          py-2
          text-center
          whitespace-nowrap
        `,
      )}
    >
      {children}
    </button>
  );
}

// istanbul ignore next:
export default Button;

const closeClasses: ComponentColorStyle = {
  [ComponentColorType.is_success]: `
      text-green-300
      hover:text-green-500
   `,
  [ComponentColorType.is_danger]: `
      text-red-300
      hover:text-red-500
  `,
  [ComponentColorType.is_light_success]: `
      text-green-300
      hover:text-green-500
  `,
  [ComponentColorType.is_light_danger]: `
      text-red-300
      hover:text-red-500
  `,
  [ComponentColorType.default]: "",
};

export function ButtonClose({
  onClose,
  id = "",
  type = ComponentColorType.default,
}: ComponentProps & {
  onClose: (e: ReactMouseEvent) => void;
  type?: ComponentColorType;
}) {
  return (
    <a
      onClick={onClose}
      id={id}
      className={trimClass(
        `
            absolute
            h-7
            w-7
            cursor-pointer
            box-content
            pl-4
            pr-2
            pb-4
            pt-1
            ${closeClasses[type] || ""}
          `,
      )}
      style={{
        right: ".5rem",
        top: ".5rem",
      }}
    >
      <XCircleFilledSvg />
    </a>
  );
}

type Props = {
  btnType?: ComponentColorType;
} & DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>;
