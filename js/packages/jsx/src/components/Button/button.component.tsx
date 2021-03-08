import { trimClass } from "@eb/cm/src/utils";
import { DetailedHTMLProps } from "react";

const classes = {
  "is-danger": `
    border-transparent
    text-white
    bg-red-400
    hover:bg-red-500
    active:bg-red-500
    focus:bg-red-500
  `,
  "is-success": `
    bg-green-400
    border-transparent
    text-white
    hover:bg-green-500
    active:bg-green-500
    focus:bg-green-500
  `,
  default: `
    bg-white
    text-gray-800
    border-gray-200
    hover:border-gray-400
    active:border-gray-400
    focus:border-gray-400
  `,
};

export function Button({ children, className, btnType, ...props }: Props) {
  return (
    <button
      {...props}
      className={trimClass(
        `
          ${classes[btnType || "default"]}
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

type Props = {
  btnType?: keyof typeof classes;
} & DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>;
