import { ComponentProps } from "@eb/shared/src/utils/types/react";
import React from "react";

const style = {
  display: "inline-block",
  width: "0",
  height: "0",
  borderLeft: "5px solid transparent",
  borderRight: "5px solid transparent",
  cursor: "pointer",
};

export function ChevronDown(props: ComponentProps) {
  const { className = "" } = props;

  return (
    <a
      className={className}
      style={{
        ...style,
        borderBottom: "10px solid black",
      }}
    />
  );
}

export function ChevronUp(props: ComponentProps) {
  const { className = "" } = props;

  return (
    <a
      className={className}
      style={{
        ...style,
        borderTop: "10px solid black",
      }}
    />
  );
}
