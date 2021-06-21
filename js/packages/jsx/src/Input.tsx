import { ComponentProps } from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React, {
  CSSProperties,
  DetailedHTMLProps,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import "./form.styles.css";

const commons = cn(
  "eb-input bg-white border-gray-300 hover:border-gray-400 outline-none",
  "active:border-blue-200 focus:border-blue-400 w-full max-w-full border",
  "focus:border-2 active:border-2 px-3 py-2",
);

export function Input(props: InputProps) {
  const {
    iconRight,
    className: callerClassName,
    isRounded,
    children,
    ...inputProps
  } = props;

  const t = cn(
    "h-10",
    commons,
    isRounded ? "rounded-full" : "",
    callerClassName || "",
  );

  let renderElement = <input {...inputProps} className={t} />;

  if (iconRight) {
    const inputIconClass = cn(t, "pr-10");

    const input = <input {...inputProps} className={inputIconClass} />;

    const style: CSSProperties = {};

    if (iconRight) {
      style.right = 0;
    } else {
      style.left = 0;
    }

    renderElement = (
      <div className="relative text-left">
        {input}
        <div
          style={style}
          className={cn(
            "eb-icon absolute inline-flex justify-center items-center top-0",
            "pointer-events-none w-10 h-10 z-10",
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return renderElement;
}

export default Input;

export function Textarea(props: TextAreaProps) {
  const { className: callerClassName, ...inputProps } = props;

  return (
    <textarea
      className={cn(callerClassName || "", commons, "eb-tiny-scroll rounded")}
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
        "h-11 inline-block relative align-top",
        parentClassName || "",
        commons,
        isRounded ? "rounded-full" : "",
      )}
      {...otherParentProps}
    >
      <select
        className={cn(
          "cursor-pointer block text-base w-full outline-none",
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

type InputProps = CallerProps & {
  iconRight?: true;
  iconLeft?: true;
} & DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

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
