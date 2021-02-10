import { DataTypes } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { ReactInput, ReactTextarea } from "@eb/cm/src/utils/types/react";
import { DateField } from "@eb/jsx/src/components/DateField/date-field.component";
import { Props as DateFieldProps } from "@eb/jsx/src/components/DateField/date-field.utils";
import { DateTimeField } from "@eb/jsx/src/components/DateTimeField/date-time-field.component";
import { Props as DateTimeFieldProps } from "@eb/jsx/src/components/DateTimeField/date-time-field.utils";
import {
  dateComponentDomSelector,
  datetimeComponentDomSelector,
  decimalInputDomSelector,
  integerInputDomSelector,
  multiLineInputDomSelector,
  singleLineInputDomSelector,
} from "./upsert-entry.dom";

const componentsObject = {
  [DataTypes.DECIMAL]: (props: ReactInput) => (
    <input
      className={"input is-rounded form__control " + decimalInputDomSelector}
      type="number"
      step="any"
      {...props}
    />
  ),

  [DataTypes.INTEGER]: (props: ReactInput) => (
    <input
      className={"input is-rounded form__control " + integerInputDomSelector}
      type="number"
      {...props}
    />
  ),

  [DataTypes.SINGLE_LINE_TEXT]: (props: ReactInput) => (
    <input
      className={"input is-rounded form__control " + singleLineInputDomSelector}
      {...props}
    />
  ),

  [DataTypes.MULTI_LINE_TEXT]: ({ value, ...props }: ReactTextarea) => {
    return (
      <textarea
        className={"textarea form__control " + multiLineInputDomSelector}
        {...props}
        value={(value as string).replace(/\\n/g, "\n")}
      />
    );
  },

  [DataTypes.DATE]: (props: DateFieldProps) => (
    <DateField className={dateComponentDomSelector} {...props} />
  ),

  [DataTypes.DATETIME]: (props: DateTimeFieldProps) => (
    <DateTimeField className={datetimeComponentDomSelector} {...props} />
  ),
};

export function componentFromDataType(type: KeyOfComponentObject, props: any) {
  return componentsObject[type](props) as JSX.Element;
}

type ComponentObjects = typeof componentsObject;
type KeyOfComponentObject = keyof ComponentObjects;
