import { Children, cloneElement, ReactNode } from "react";
import { Link } from "react-router-dom";

export function cloneSingle(
  children: ReactNode,
  ClassName = "",
  ...others: JSX.Element[]
) {
  const single = children as JSX.Element;

  const {
    // children: singleChildren,
    className: singleClassName0 = "",
    ...singleProps
  } = single.props;

  const singleClassName = ClassName + " " + singleClassName0;

  return Children.only(
    cloneElement(
      single,
      {
        ...singleProps,
        className: singleClassName,
      },
      ...others,
    ),
  );
}

export type LinkInjectType = {
  LinkInject: typeof Link;
};
