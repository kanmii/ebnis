import { ComponentProps } from "@eb/cm/src/utils/types/react";
import { ReactMouseEvent } from "@eb/cm/src/utils/types/react";

export function Notification(props: Props) {
  const { children, type, onClose } = props;
  // istanbul ignore next:
  const id = props.id || "";

  return (
    <div
      id={id}
      className={`
        ${type === "success" ? "is-success bg-green-400" : ""}
        text-white
        rounded
        relative
        p-5
        my-4
      `}
    >
      <button
        className={`
          eb-delete
          absolute
        `}
        style={{
          right: ".5rem",
          top: ".5rem",
        }}
        onClick={onClose}
      >
        x
      </button>
      {children}
    </div>
  );
}

// istanbul ignore next:
export default Notification;

type Props = ComponentProps & {
  type: "success" | "danger";
  onClose: (e: ReactMouseEvent) => void;
};
