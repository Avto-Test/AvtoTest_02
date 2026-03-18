import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { buttonStyles } from "@/shared/ui/button";

type ButtonStyleOptions = NonNullable<Parameters<typeof buttonStyles>[0]>;

type LinkButtonProps = ComponentPropsWithoutRef<typeof Link> & {
  className?: string;
  variant?: ButtonStyleOptions["variant"];
  size?: ButtonStyleOptions["size"];
};

export function LinkButton({
  className,
  variant = "default",
  size = "default",
  ...props
}: LinkButtonProps) {
  return <Link className={buttonStyles({ className, variant, size })} {...props} />;
}
