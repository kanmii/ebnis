/* istanbul ignore file */
import { ComponentProps } from "@eb/cm/src/utils/types/react";
import { formCtrlErrorClassName } from "../../utils/utils.dom";

export function FormCtrlError(props: Props) {
  const { error, id = "", className = "", children, ...others } = props;

  return children || error ? (
    <div
      className={`
        is-danger
        help
        ${className}
        ${formCtrlErrorClassName}
      `}
      id={id}
      {...others}
    >
      {children || error}
    </div>
  ) : null;
}

export default FormCtrlError;

type Props = ComponentProps & {
  error?: null | string;
};
