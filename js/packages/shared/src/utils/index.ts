import dateFnFormat from "date-fns/format";
import parseISO from "date-fns/parseISO";
import { DataTypes } from "../graphql/apollo-types/globalTypes";

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function deleteObjectKey<T>(obj: T, key: keyof T) {
  delete obj[key];
}

const NEW_LINE_REGEX = /\n/g;
export const ISO_DATE_FORMAT = "yyyy-MM-dd";
const ISO_DATE_TIME_FORMAT = ISO_DATE_FORMAT + "'T'HH:mm:ssXXX";
export type DataDefinitionFormObjVal = Date | string | number;

export function parseDataObjectData(data: string) {
  const json = JSON.parse(data);
  const [type, stringData] = Object.entries(json)[0];
  const typeUpper = type.toUpperCase();
  const dataString = stringData as string;

  return typeUpper === DataTypes.DATE || typeUpper === DataTypes.DATETIME
    ? new Date(dataString)
    : dataString;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function stringifyDataObjectData(type: DataTypes, parsedData: any) {
  return `{"${type.toLowerCase()}":"${formObjToString(type, parsedData)}"}`;
}

export function formObjToString(
  type: DataTypes,
  val: DataDefinitionFormObjVal,
) {
  let toString = val;

  switch (type) {
    case DataTypes.DATE:
      toString = toISODateString(val as Date);
      break;

    case DataTypes.DATETIME:
      toString = toISODatetimeString(val as Date);
      break;

    case DataTypes.DECIMAL:
    case DataTypes.INTEGER:
      toString = (val || "0") + "";
      break;

    case DataTypes.SINGLE_LINE_TEXT:
      toString = "" + val;
      break;

    case DataTypes.MULTI_LINE_TEXT:
      toString = (("" + val) as string).replace(NEW_LINE_REGEX, "\\\\n");
      break;
  }

  return (toString as string).trim().replace(/"/g, '\\"');
}

export function toISODateString(date: Date) {
  return dateFnFormat(date, ISO_DATE_FORMAT);
}

export function toISODatetimeString(date: Date | string) {
  const parsedDate = typeof date === "string" ? parseISO(date) : date;
  const formattedDate = dateFnFormat(parsedDate, ISO_DATE_TIME_FORMAT);
  return formattedDate;
}
