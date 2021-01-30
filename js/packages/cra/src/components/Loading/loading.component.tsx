import React, { PropsWithChildren, useRef, useState, useEffect } from "react";
import "./loading.styles.scss";
import makeClassNames from "classnames";
import { domPrefix } from "./loading-dom";
import { onUnmount } from "./loading.injectables";

export function Loading({
  className,
  children,
  loading = true,
  ...props
}: PropsWithChildren<{
  className?: string;
  loading?: boolean;
}>) {
  const loadingRef = useRef<NodeJS.Timeout | null>(null);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (loading) {
      loadingRef.current = setTimeout(() => {
        setShouldShow(true);
      }, 1000);
    }

    return () => {
      if (loadingRef.current) {
        clearTimeout(loadingRef.current);
        // test that clean up code is called
        onUnmount();
      }
    };
  }, [loading]);

  return shouldShow ? (
    <div className="components-loading" id={domPrefix}>
      <div
        className={makeClassNames({
          "components-loading__spinner": true,
          [className || ""]: !!className,
        })}
        {...props}
      >
        <div className="double-bounce1" />
        <div className="double-bounce2" />
      </div>

      {children}
    </div>
  ) : null;
}

// istanbul ignore next:
export default Loading;
