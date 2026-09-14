import { ImagePlaceholder } from "@/components/site/ImagePlaceholder";

/**
 * Looping image carousel used inside property cards.
 * Lives inside a link, so every control stops navigation.
 */
export function PropertyGallery({
  images: _images,
  alt,
  eager: _eager = false,
}: {
  images: string[];
  alt: string;
  eager?: boolean;
}) {
  return <ImagePlaceholder label={alt} className="aspect-[4/3]" />;
}
