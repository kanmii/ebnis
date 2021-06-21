import cn from "classnames";
import { useEffect, useRef, useState } from "react";
import { ComponentProps } from "../../../../shared/src/utils/types/react";
import { domPrefix } from "./loading-dom";
import { onUnmount } from "./loading.injectables";

export function Loading({
  className,
  children,
  loading = true,
  ...props
}: Props) {
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
    <div
      className={cn(
        "components-loading",
        "pointer-events-none fixed top-0 bottom-0 right-0 left-0 z-50 flex",
        "flex-col justify-center items-center",
      )}
      style={{
        backgroundColor: "var(--modal-background-background-color)",
      }}
      id={domPrefix}
    >
      <div className={cn("relative w-10 h-10", className)} {...props}>
        <BounceComponent />

        <BounceComponent
          style={{
            animationDelay: "-1s",
          }}
        />
      </div>

      {children}
    </div>
  ) : null;
}

function BounceComponent(props: ComponentProps) {
  return (
    <div
      className={cn(
        "eb-animate-bounce bg-app absolute top-0 left-0 opacity-60 w-full",
        "h-full rounded-full",
      )}
      {...props}
    />
  );
}

// istanbul ignore next:
export default Loading;
export type LoadingComponentType = {
  LoadingComponentFn: typeof Loading
}

export type Props = ComponentProps & {
  loading?: boolean;
};
