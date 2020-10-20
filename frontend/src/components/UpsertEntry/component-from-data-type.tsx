import React from "react";
import { ComponentProps } from "../../utils/types";
import { DateField } from "../DateField/date-field.component";
import { DateTimeField } from "../DateTimeField/date-time-field.component";
import { DataTypes } from "../../graphql/apollo-types/globalTypes";
import {
  integerInputDomSelector,
  decimalInputDomSelector,
  multiLineInputDomSelector,
  singleLineInputDomSelector,
  dateComponentDomSelector,
  datetimeComponentDomSelector,
} from "./upsert-entry.dom";

const componentsObject: {
  [k: string]: (props: ComponentProps) => JSX.Element;
} = {
  [DataTypes.DECIMAL]: (props) => (
    <input
      className={"input is-rounded form__control " + decimalInputDomSelector}
      type="number"
      step="any"
      {...props}
    />
  ),

  [DataTypes.INTEGER]: (props) => (
    <input
      className={"input is-rounded form__control " + integerInputDomSelector}
      type="number"
      {...props}
    />
  ),

  [DataTypes.SINGLE_LINE_TEXT]: (props) => (
    <input
      className={"input is-rounded form__control " + singleLineInputDomSelector}
      {...props}
    />
  ),

  [DataTypes.MULTI_LINE_TEXT]: ({ value, ...props }) => {
    return (
      <textarea
        className={"textarea form__control " + multiLineInputDomSelector}
        {...props}
        value={value.replace(/\\n/g, "\n")}
      />
    );
  },

  [DataTypes.DATE]: (props) => (
    <DateField className={dateComponentDomSelector} {...props} />
  ),

  [DataTypes.DATETIME]: (props) => (
    <DateTimeField className={datetimeComponentDomSelector} {...props} />
  ),
};

export function componentFromDataType(type: string, props: ComponentProps) {
  return componentsObject[type](props);
}
