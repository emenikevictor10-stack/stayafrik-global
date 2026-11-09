import { useState, type ImgHTMLAttributes } from "react";
import { sizedImage, sizedSrcSet } from "@/lib/media-size";

/** Photo that asks for a right-sized copy (partner photos) and falls back to the original if that fails. */
export const StayImage = ({ src, width, ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width"> & { src: string; width: number }) => {
  const [failed, setFailed] = useState(false);
  const sized = failed ? src : sizedImage(src, width);
  if (!src) return <div className={`${rest.className || ""} bg-surface flex items-center justify-center text-[13px] text-muted-foreground`}>No photos yet</div>;
  return (
    <img
      {...rest}
      src={sized}
      srcSet={failed ? undefined : sizedSrcSet(src, width)}
      onError={() => { if (!failed && sized !== src) setFailed(true); }}
    />
  );
};
