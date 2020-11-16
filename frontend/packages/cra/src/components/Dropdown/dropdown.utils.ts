import { ReactNode } from "react";
import { ComponentProps } from "../../utils/types";

export interface StateMachine<Value> {
  inputVal: string;
  selectedIndex: number;
  usedOptions: Option<Value>[];
  showingOptions: boolean;
  selectedOption: Option<Value>;
}

export interface Option<Value> {
  value: Value;
  text?: string;
  content?: ReactNode;
}

export interface Props<Value> extends ComponentProps {
  controlId?: string;
  selectedItemClassName?: string;
  onChange: (evt: React.SyntheticEvent<HTMLElement>, inputVal: Value) => void;
  defaultValue?: Value;
  options: {
    value: Value;
    text?: string;
    content?: ReactNode;
  }[];
}
