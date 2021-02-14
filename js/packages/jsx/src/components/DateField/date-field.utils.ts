export const LABELS = {
  day: "Day",
  month: "Month",
  year: "Year",
};

export interface Props extends FieldComponentProps {
  className?: string;
  value: Date;
}

export type FormObjVal = number | Date | string;
export interface FormObj {
  [k: string]: FormObjVal;
}

export interface FieldComponentProps {
  name: string;
  onChange: (formName: string, value: FormObjVal) => void;
}
