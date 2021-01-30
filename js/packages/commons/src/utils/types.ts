/* istanbul ignore file */
import { PropsWithChildren } from "react";

export type ComponentProps = any &
  PropsWithChildren<{}> & {
    className?: string;
    id?: string;
    value?: any;
    onChange?: any;
    name?: string;
  };
