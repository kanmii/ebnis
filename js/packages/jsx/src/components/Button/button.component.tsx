import { DetailedHTMLProps } from "react";

export function Button({ children, className, ...props }: Props) {
  const compClass =
    (className || "") +
    `
      border
      bg-white
      cursor-pointer
      justify-center
      pb-2
      pl-4
      pr-4
      pt-2
      text-center
      text-gray-800
      border-gray-200
      whitespace-nowrap
      hover:border-gray-400
      active:border-gray-400
      focus:border-gray-400

      eb-btn
    `;

  return (
    <button {...props} className={compClass}>
      {children}
    </button>
  );
}

// istanbul ignore next:
export default Button;

type Props = DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>;
