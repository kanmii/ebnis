import { FieldComponentProps } from "../DateField/date-field.utils";
import { ComponentType } from "react";

export interface Props extends FieldComponentProps {
  className?: string;
  value: Date;
}

export type DateComponentType = ComponentType<Props>;
