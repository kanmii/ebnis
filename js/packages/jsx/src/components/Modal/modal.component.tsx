import { trimClass } from "@eb/shared/src/utils";
import { Any } from "@eb/shared/src/utils/types";
import {
  ComponentProps,
  ReactMouseEvent,
} from "@eb/shared/src/utils/types/react";
import React, {
  Children,
  cloneElement,
  createContext,
  PropsWithChildren,
  useContext,
} from "react";

type ContextValue = {
  onClose: (e: ReactMouseEvent) => void;
};

const Context = createContext<ContextValue>({} as ContextValue);
const Provider = Context.Provider;

export function Modal(props: Props) {
  const { children, onClose, className = "", top, ...others } = props;

  const finalClassName = trimClass(
    `
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
          ${className}
        `,
  );

  const backgroundEl = (
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
  );

  const makeProviderEl = (c: React.ReactNode) => {
    return <Provider value={{ onClose }}>{c}</Provider>;
  };

  if (top) {
    const single = children as JSX.Element;

    const {
      children: singleChildren,
      className: singleClassName0 = "",
      ...singleProps
    } = single.props;

    const singleClassName = finalClassName + " " + singleClassName0;

    return Children.only(
      cloneElement(
        single,
        {
          ...singleProps,
          className: singleClassName,
        },
        backgroundEl,
        makeProviderEl(singleChildren),
      ),
    );
  }

  return (
    <div className={finalClassName} {...others}>
      {backgroundEl}

      {makeProviderEl(children)}
    </div>
  );
}

function Card({
  children,
  style,
  className = "",
  ...otherProps
}: PropsWithChildren<Any>) {
  style = {
    maxWidth: "500px",
    ...(style || {}),
  };

  return (
    <div
      className={trimClass(
        `
          ${className}
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
      style={style}
      {...otherProps}
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
  top?: boolean;
};
