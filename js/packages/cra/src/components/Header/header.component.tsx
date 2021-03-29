import logo from "@eb/shared/src/media/logo.png";
import makeClassNames from "classnames";
import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { WithSubscriptionContext } from "../../utils/app-context";
import { MY_URL } from "../../utils/urls";
import { domPrefix } from "./header.dom";
import "./header.styles.css";

export function Header(props: Props) {
  const { connected } = props;
  const location = useLocation();

  return (
    <header
      id={domPrefix}
      className={makeClassNames({
        "app-header": true,
        "app-header--connected": connected,
        "app-header--unconnected": !connected,
      })}
    >
      {location.pathname === MY_URL ? (
        <span className="js-logo-text">
          <img src={logo} alt="logo" className="logo" />
        </span>
      ) : (
        <Link to={MY_URL} className="js-logo-link">
          <img src={logo} alt="logo" className="logo" />
        </Link>
      )}
    </header>
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
