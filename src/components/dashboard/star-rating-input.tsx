import type { FC } from "react";
import Imported from "react-rating-stars-component";

export type StarRatingInputProps = {
  count?: number;
  value?: number;
  size?: number;
  activeColor?: string;
  isHalf?: boolean;
  edit?: boolean;
  onChange?: (newRating: number) => void;
};

/** Vite + CJS interop sometimes yields `fn`, sometimes nested `{ default: fn }`. */
function unwrapStarComponent(m: unknown): FC<StarRatingInputProps> {
  let x: unknown = m;
  for (let i = 0; i < 4; i++) {
    if (typeof x === "function") return x as FC<StarRatingInputProps>;
    if (x && typeof x === "object" && "default" in x) {
      x = (x as { default: unknown }).default;
      continue;
    }
    break;
  }
  throw new Error("Could not resolve react-rating-stars-component export.");
}

const Resolved = unwrapStarComponent(Imported);

export function StarRatingInput(props: StarRatingInputProps) {
  return <Resolved {...props} />;
}
