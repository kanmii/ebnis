import { Any } from "@eb/cm/src/utils/types";
import { ComponentProps, ReactMouseEvent } from "@eb/cm/src/utils/types/react";
import { PropsWithChildren } from "react";

export function Modal(props: Props) {
  const { children } = props;

  // istanbul ignore next:
  const id = props.id || "";

  // istanbul ignore next:
  const propClassName = props.className || "";

  return (
    <div
      id={id}
      className={`
        ${propClassName}
        eb-modal
        items-center
        flex-col
        justify-center
        overflow-hidden
        fixed
        z-40
        bottom-0
        left-0
        right-0
        top-0
        flex
      `}
    >
      <div
        className={`
          eb-modal-background
          bg-gray-300
          opacity-70
          absolute
          bottom-0
          left-0
          right-0
          top-0
        `}
      />

      {children}
    </div>
  );
}

function Card({ children }: PropsWithChildren<Any>) {
  return (
    <div
      className={`
        eb-modal-card
        flex
        flex-col
        overflow-hidden
        relative
        border
        border-gray-200
        rounded
        w-11/12
      `}
    >
      {children}
    </div>
  );
}

function Body({ children }: PropsWithChildren<Any>) {
  return (
    <section
      className={`
        eb-modal-card-body
        eb-tiny-scroll
        bg-white
        flex-grow
        flex-shrink
        overflow-auto
        p-4
      `}
    >
      {children}
    </section>
  );
}

function Footer({ children }: PropsWithChildren<Any>) {
  return (
    <footer
      className={`
        eb-modal-card-footer
        border-t
        rounded-b
        border-gray-100
        border-solid
        items-center
        bg-gray-100
        flex
        flex-shrink-0
        justify-start
        p-5
        relative
      `}
    >
      {children}
    </footer>
  );
}

function Header({
  id: closeId,
  onClose,
  content,
  children,
}: PropsWithChildren<
  ComponentProps & {
    onClose: (e: ReactMouseEvent) => void;
    content?: string | JSX.Element;
  }
>) {
  const id = closeId || "";
  const x = content || children;

  return (
    <header
      className={`
        border
        bg-gray-100
        flex
        flex-shrink-0
        justify-start
        relative
        p-4
      `}
    >
      <p
        className={`
          text-black
          flex-grow
          flex-shrink-0
          text-base
        `}
      >
        {x}
      </p>
      <button
        id={id}
        className="eb-delete"
        aria-label="close"
        onClick={onClose}
      >
        x
      </button>
    </header>
  );
}

// istanbul ignore next:
export default Modal;
Modal.Card = Card;
Modal.Header = Header;
Modal.Body = Body;
Modal.Footer = Footer;

export type Props = ComponentProps & {
  onClose: (e: ReactMouseEvent) => void;
};
