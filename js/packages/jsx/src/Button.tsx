import { ReactComponent as XCircleFilledSvg } from "@eb/shared/src/styles/x-circle-filled.svg";
import {
  ComponentColorStyle,
  ComponentColorType,
  ComponentProps,
  ReactMouseEvent,
} from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React, { DetailedHTMLProps } from "react";

const buttonClasses: ComponentColorStyle = {
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
  [ComponentColorType.is_light_success]: ``,
  [ComponentColorType.is_light_danger]: ``,
  [ComponentColorType.info]: ``,
  [ComponentColorType.is_warning]: `
    border-transparent
    bg-yellow-300
    hover:bg-yellow-400
    active:bg-yellow-400
    focus:bg-yellow-400
  `,
  [ComponentColorType.is_primary]: `
    bg-green-300
    border-transparent
    text-white
    hover:bg-green-400
    active:bg-green-400
    focus:bg-green-400
  `,
};

export function Button({
  children,
  className,
  btnType = ComponentColorType.default,
  isRounded,
  wide,
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={cn(
        className || "",
        "border-2 cursor-pointer justify-center text-center",
        "whitespace-nowrap",
        isRounded ? "rounded-full" : "rounded",
        wide ? "py-0 px-5" : "px-5 py-2",
        buttonClasses[btnType],
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
  [ComponentColorType.default]: ``,
  [ComponentColorType.is_primary]: ``,
  [ComponentColorType.info]: ``,
  [ComponentColorType.is_warning]: `
      text-yellow-500
      hover:text-yellow-700
  `,
};

export function ButtonClose({
  onClose,
  id = "",
  type = ComponentColorType.default,
  className,
}: ComponentProps & {
  onClose: (e: ReactMouseEvent) => void;
  type?: ComponentColorType;
}) {
  return (
    <a
      onClick={onClose}
      id={id}
      className={cn(
        "absolute",
        "h-7",
        "w-7",
        "cursor-pointer",
        "box-content",
        "!pl-4",
        "!pr-2",
        "!pb-4",
        "!pt-1",
        closeClasses[type] || "",
        className || "",
      )}
      style={{
        right: ".5rem",
        top: ".5rem",
      }}
      aria-label="close"
    >
      <XCircleFilledSvg />
    </a>
  );
}

type Props = {
  btnType?: ComponentColorType;
  isRounded?: boolean;
  wide?: boolean;
} & DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>;
