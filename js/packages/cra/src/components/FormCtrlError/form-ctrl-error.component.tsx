/* istanbul ignore file */
import { ComponentProps } from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import { formCtrlErrorClassName } from "../../utils/utils.dom";

export function FormCtrlError(props: Props) {
  const { error, id = "", className = "", children, ...others } = props;

  return children || error ? (
    <div
      className={cn(
        "block",
        "text-xs",
        "mt-1",
        "text-red-400",
        className,
        formCtrlErrorClassName,
      )}
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
