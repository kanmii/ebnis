/* istanbul ignore file */
import {
  DetailedHTMLProps,
  InputHTMLAttributes,
  PropsWithChildren,
  TextareaHTMLAttributes,
} from "react";
import { Any } from ".";

export type ComponentProps = unknown &
  PropsWithChildren<Any> & {
    className?: string;
    id?: string;
    name?: string;
  };

export type ReactInput = DetailedHTMLProps<
  InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>;

export type ReactTextarea = DetailedHTMLProps<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  HTMLTextAreaElement
>;

export type ReactMouseEvent = React.MouseEvent<
  | HTMLAnchorElement
  | HTMLButtonElement
  | HTMLDivElement
  | HTMLSpanElement
  | SVGElement,
  MouseEvent
>;

export enum ComponentColorType {
  is_success = "is-success",
  is_danger = "is-danger",
  is_light_success = "is-light-success",
  is_light_danger = "is-light-danger",
}
