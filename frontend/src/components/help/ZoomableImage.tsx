import { useState, ImgHTMLAttributes } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

interface ImageMeta {
  src: string;
  alt: string;
}

interface ZoomableImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string;
  alt?: string;
  /** The list of all images in the current document, used to enable Prev/Next navigation in the lightbox */
  images?: ImageMeta[];
  index?: number;
}

/**
 * Image renderer for markdown that opens a fullscreen lightbox on click.
 * When a parent HelpContent provides the full image list, the lightbox
 * supports arrow-key navigation between images. Otherwise the clicked
 * image is shown standalone.
 *
 * Renders as a <span> so it nests cleanly inside a markdown paragraph;
 * CSS makes it block-level visually.
 */
export default function ZoomableImage({
  src,
  alt = '',
  images,
  index = 0,
  ...rest
}: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  if (!src) return null;

  const slides = images && images.length > 0 ? images : [{ src, alt }];
  const openAt = images ? index : 0;

  return (
    <span className="block my-3 not-prose">
      <button
        type="button"
        className="block cursor-zoom-in rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity text-left w-full"
        onClick={() => setOpen(true)}
        title="Click to zoom"
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="block w-full h-auto"
          {...rest}
        />
      </button>
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={openAt}
        slides={slides}
      />
    </span>
  );
}
