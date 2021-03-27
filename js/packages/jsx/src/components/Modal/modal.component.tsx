import { trimClass } from "@eb/cm/src/utils";
import { Any } from "@eb/cm/src/utils/types";
import { ComponentProps, ReactMouseEvent } from "@eb/cm/src/utils/types/react";
import { createContext, PropsWithChildren, useContext } from "react";

type ContextValue = {
  onClose: (e: ReactMouseEvent) => void;
};

const Context = createContext<ContextValue>({} as ContextValue);
const Provider = Context.Provider;

export function Modal(props: Props) {
  const { children, onClose } = props;

  // istanbul ignore next:
  const id = props.id || "";

  // istanbul ignore next:
  const propClassName = props.className || "";

  return (
    <div
      id={id}
      className={trimClass(
        `
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
        `,
      )}
    >
      <div
        className={trimClass(
          `
            eb-modal-background
            bg-gray-900
            opacity-70
            absolute
            bottom-0
            left-0
            right-0
            top-0
          `,
        )}
      />

      <Provider value={{ onClose }}>{children}</Provider>
    </div>
  );
}

function Card({ children }: PropsWithChildren<Any>) {
  return (
    <div
      className={trimClass(
        `
          eb-modal-card
          flex
          flex-col
          overflow-hidden
          relative
          border
          border-gray-200
          rounded
          w-11/12
        `,
      )}
    >
      {children}
    </div>
  );
}

function Body({ children }: PropsWithChildren<Any>) {
  return (
    <section
      className={trimClass(
        `
          eb-modal-card-body
          eb-tiny-scroll
          bg-white
          flex-grow
          flex-shrink
          overflow-auto
          p-4
        `,
      )}
    >
      {children}
    </section>
  );
}

function Footer({ children }: PropsWithChildren<Any>) {
  return (
    <footer
      className={trimClass(
        `
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
        `,
      )}
    >
      {children}
    </footer>
  );
}

function Header({
  id: closeId,
  content,
  children,
}: PropsWithChildren<
  ComponentProps & {
    content?: string | JSX.Element;
  }
>) {
  const id = closeId || "";
  const contentOrChildren = content || children;
  const { onClose } = useContext(Context);

  return (
    <header
      className={trimClass(
        `
          border
          bg-gray-100
          flex
          flex-shrink-0
          justify-start
          relative
          p-4
        `,
      )}
    >
      <div
        className={trimClass(
          `
            text-black
            flex-grow
            flex-shrink-0
            text-base
          `,
        )}
      >
        {contentOrChildren}
      </div>
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
