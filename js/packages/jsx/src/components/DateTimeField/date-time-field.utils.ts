import { ComponentType } from "react";
import { FieldComponentProps } from "../DateField/date-field.utils";

export interface Props extends FieldComponentProps {
  className?: string;
  value: Date;
}

export type DateComponentType = ComponentType<Props>;
