import { trimClass } from "@eb/cm/src/utils";
import {
  ComponentColorType,
  ComponentProps,
  ReactMouseEvent,
} from "@eb/cm/src/utils/types/react";
import { ButtonClose } from "../../components/Button/button.component";

const notificationClasses: Record<ComponentColorType, string> = {
  [ComponentColorType.is_success]: `
      bg-green-400
      text-green-800
   `,
  [ComponentColorType.is_danger]: `
      bg-red-200
      text-red-800
  `,
  [ComponentColorType.is_light_success]: `
      bg-green-100
      text-green-800
  `,
  [ComponentColorType.is_light_danger]: `
      bg-red-50
      text-red-800
  `,
  [ComponentColorType.default]: "",
};

export function Notification(props: Props) {
  const { children, type = ComponentColorType.default, onClose } = props;
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
      style={{
        maxWidth: "550px",
      }}
    >
      {onClose && <ButtonClose id={id} type={type} onClose={onClose} />}

      {children}
    </div>
  );
}

// istanbul ignore next:
export default Notification;

type Props = ComponentProps & {
  type?: ComponentColorType;
  onClose?: (e: ReactMouseEvent) => void;
};
