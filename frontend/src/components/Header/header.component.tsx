import React, { useContext } from "react";
import "./header.styles.scss";
import logo from "../../media/logo.png";
import { MY_URL } from "../../utils/urls";
import { Link, useLocation } from "react-router-dom";
import makeClassNames from "classnames";
import { WithEmitterContext } from "../../utils/app-context";
import { domPrefix } from "./header.dom";

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
  const { connected } = useContext(WithEmitterContext);
  return <Header connected={connected} />;
};

interface Props {
  connected: boolean;
}
