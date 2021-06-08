import { ComponentProps } from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React, {
  DetailedHTMLProps,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const commons = cn(
  "bg-white border-gray-300 hover:border-gray-400 outline-none",
  "active:border-blue-200 focus:border-blue-400 w-full max-w-full",
  "border focus:border-2 active:border-2 px-3 py-2",
);

export function Input(props: InputProps) {
  const { className: callerClassName, isRounded, ...inputProps } = props;

  return (
    <input
      {...inputProps}
      className={cn(
        "h-10",
        commons,
        isRounded ? "rounded-full" : "",
        callerClassName || "",
      )}
    />
  );
}

export default Input;

export function Textarea(props: TextAreaProps) {
  const { className: callerClassName, ...inputProps } = props;

  return (
    <textarea
      className={cn(callerClassName || "", commons, "rounded")}
      {...inputProps}
    />
  );
}

export function Select(props: SelectProps) {
  const {
    className: callerClassName,
    isRounded,
    children,
    parentProps = {},
    ...inputProps
  } = props;

  const { className: parentClassName, ...otherParentProps } = parentProps;

  return (
    <div
      className={cn(
        "h-11 inline-block max-w-full relative align-top",
        parentClassName || "",
        commons,
        isRounded ? "rounded-full" : "",
      )}
      {...otherParentProps}
    >
      <select
        className={cn(
          "cursor-pointer block text-base w-full outline-none",
          // commons,
          callerClassName,
          // isRounded ? "rounded-full" : "",
        )}
        {...inputProps}
      >
        {children}
      </select>
    </div>
  );
}

export function Label(props: LabelProps) {
  const { className, children, ...rest } = props;
  return (
    <label className={cn(className || "", "mb-1 block font-bold")} {...rest}>
      {children}
    </label>
  );
}

type InputProps = CallerProps &
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

type TextAreaProps = DetailedHTMLProps<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  HTMLTextAreaElement
>;

type SelectProps = CallerProps & {
  parentProps?: ComponentProps;
} & DetailedHTMLProps<
    TextareaHTMLAttributes<HTMLSelectElement>,
    HTMLSelectElement
  >;

type LabelProps = DetailedHTMLProps<
  LabelHTMLAttributes<HTMLLabelElement>,
  HTMLLabelElement
>;

type CallerProps = {
  isRounded?: true;
};
