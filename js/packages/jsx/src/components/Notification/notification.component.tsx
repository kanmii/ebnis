import { ReactComponent as XCircleFilledSvg } from "@eb/cm/src/styles/x-circle-filled.svg";
import { ComponentProps, ReactMouseEvent } from "@eb/cm/src/utils/types/react";
import { trimClass } from "@eb/cm/src/utils";

const notificationClasses: Record<Props["type"], string> = {
  "is-success": `
      bg-green-400
      text-white
      text-green-800
   `,
  "is-danger": `
  `,
  "is-light-success": `
      bg-green-100
      text-green-800
  `,
  "is-light-danger": `
      bg-red-100
      text-red-800
  `,
};

const closeClasses: Record<Props["type"], string> = {
  "is-success": `
      text-green-300
      hover:text-green-500
   `,
  "is-danger": `
  `,
  "is-light-success": `
      text-green-300
      hover:text-green-500
  `,
  "is-light-danger": `
      text-red-300
      hover:text-red-500
  `,
};

export function Notification(props: Props) {
  const { children, type, onClose } = props;
  // istanbul ignore next:
  const id = props.id || "";
  // istanbul ignore next:
  const className = props.className || "";

  return (
    <div
      className={trimClass(
        `
          eb-notification
          ${className}
          ${notificationClasses[type] || ""}
          rounded
          relative
          pb-5
          pt-6
          pl-5
          pr-12
          font-semibold
        `,
      )}
    >
      <a
        onClick={onClose}
        id={id}
        className={trimClass(
          `
            absolute
            h-7
            w-7
            cursor-pointer
            box-content
            pl-4
            pr-2
            pb-4
            pt-1
            ${closeClasses[type] || ""}
          `,
        )}
        style={{
          right: ".5rem",
          top: ".5rem",
        }}
      >
        <XCircleFilledSvg />
      </a>
      {children}
    </div>
  );
}

// istanbul ignore next:
export default Notification;

type Props = ComponentProps & {
  type: "is-success" | "is-danger" | "is-light-success" | "is-light-danger";
  onClose: (e: ReactMouseEvent) => void;
};
