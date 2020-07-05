/* istanbul ignore file */
import React, { PropsWithChildren } from "react";
import makeClassName from "classnames";
import { ComponentProps } from "../../utils/types";

interface Props extends PropsWithChildren<{}>, ComponentProps {
  error?: null | string;
}

export function FormCtrlError(props: Props) {
  const { error, id = "", className = "", children, ...others } = props;

  return children || error ? (
    <div
      className={makeClassName({
        "is-danger help": true,
        [className]: !!className,
      })}
      id={id}
      {...others}
    >
      {children || error}
    </div>
  ) : null;
}

export default FormCtrlError;
