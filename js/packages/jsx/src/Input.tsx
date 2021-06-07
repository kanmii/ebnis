import cn from "classnames";
import React, { DetailedHTMLProps, InputHTMLAttributes } from "react";

export function Input(props: Props) {
  const { className: callerClassName, isRounded, ...inputProps } = props;

  return (
    <input
      {...inputProps}
      className={cn(
        callerClassName || "",
        "w-full",
        "max-w-full",
        "bg-white",
        "border-gray-300",
        "hover:border-gray-400",
        "active:border-blue-200",
        "focus:border-blue-400",
        "border",
        "focus:border-2",
        "active:border-2",
        "h-10",
        "pl-4",
        "pr-17",
        "py-2",
        "outline-none",
        isRounded ? "rounded-full" : "",
      )}
    />
  );
}

export default Input;

type Props = CallerProps &
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

type CallerProps = {
  isRounded?: true;
};
