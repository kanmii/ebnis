import logo from "@eb/shared/src/media/logo.png";
import cn from "classnames";
import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { WithSubscriptionContext } from "../../utils/app-context";
import { MY_URL } from "../../utils/urls";
import {
  connectedSelector,
  domPrefix,
  unConnectedSelector,
} from "./header.dom";

export function Header(props: Props) {
  const { connected } = props;
  const location = useLocation();

  return (
    <header
      id={domPrefix}
      className={cn(
        "app-header",
        "fixed",
        "flex",
        "top-0",
        "left-0",
        "m-0",
        "bg-white",
        "w-full",
        connected ? connectedSelector : unConnectedSelector,
      )}
      style={{
        ["--part-shadow" as any]: "0 1px 4px",
        height: "var(--header-height)",
        zIndex: "var(--header-z-index)" as unknown as any,
        boxShadow: connected
          ? "var(--part-shadow) var(--app-color)"
          : "var(--part-shadow) var(--danger-color)",
      }}
    >
      {location.pathname === MY_URL ? (
        <span className="js-logo-text">
          <LogoImageComponent src={logo} />
        </span>
      ) : (
        <Link to={MY_URL} className="js-logo-link">
          <LogoImageComponent src={logo} />
        </Link>
      )}
    </header>
  );
}

function LogoImageComponent({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt="logo"
      style={{
        height: "calc(var(--header-height) - 15px)",
      }}
      className={cn("logo", "ml-2", "mt-2")}
    />
  );
}

// istanbul ignore next:
export default () => {
  const { connected } = useContext(WithSubscriptionContext);
  return <Header connected={connected} />;
};

export interface Props {
  connected: boolean | null;
}
