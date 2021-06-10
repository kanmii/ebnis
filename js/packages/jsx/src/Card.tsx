import { ComponentProps } from "@eb/shared/src/utils/types/react";
import cn from "classnames";
import React, { Children, cloneElement } from "react";

export function Card(props: Props) {
  const { children, className, ...rest } = props;
  return (
    <div
      className={cn(
        "eb-card bg-white shadow-xl text-black max-w-full relative",
        "rounded-md",
        className || "",
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

function Image(props: ImageProps) {
  const { children, className, size, figureProps } = props;

  let imageWidth = "";
  let imageHeight = "";

  switch (size) {
    case "64x64":
      imageWidth = "64px";
      imageHeight = "64px";
      break;

    case "96x96":
      imageWidth = "96px";
      imageHeight = "96px";
      break;
  }

  return (
    <div className={cn(className || "", "eb-card-image relative")}>
      <figure
        {...figureProps}
        style={{
          width: imageWidth,
          height: imageHeight,
        }}
      >
        {children}
      </figure>
    </div>
  );
}

Card.Image = Image;

function Content(props: ContentProps) {
  const { className, wrapOnly, children, ...rest } = props;

  let renderElement = "" as unknown as JSX.Element;
  const commonClasses = cn("rounded-br-sm bg-transparent p-6");

  if (wrapOnly) {
    const single = children as JSX.Element;

    const { className: singleClassName0 = "", ...singleProps } = single.props;

    renderElement = Children.only(
      cloneElement(single, {
        ...singleProps,
        className: singleClassName0 + " " + commonClasses,
      }),
    );
  } else {
    renderElement = (
      <div className={cn(className || "", commonClasses)} {...rest}>
        {children}
      </div>
    );
  }

  return renderElement;
}

Card.Content = Content;

type Props = ComponentProps;

type ImageProps = ComponentProps & {
  size: ImageSize;
  figureProps?: ComponentProps;
};

type ImageSize = "64x64" | "96x96";

type ContentProps = ComponentProps & {
  wrapOnly?: true;
};
