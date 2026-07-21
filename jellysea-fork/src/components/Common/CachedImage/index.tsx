import useSettings from '@app/hooks/useSettings';
import type { ImageLoader, ImageProps } from 'next/image';
import Image from 'next/image';

const imageLoader: ImageLoader = ({ src }) => src;

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/original';
const TVDB_IMG_BASE = 'https://artworks.thetvdb.com';

export type CachedImageProps = ImageProps & {
  src: string;
  type: 'tmdb' | 'avatar' | 'tvdb';
};

const CachedImage = ({ src, type, ...props }: CachedImageProps) => {
  const { currentSettings } = useSettings();

  let imageUrl: string;

  if (type === 'tmdb') {
    if (currentSettings.cacheImages) {
      imageUrl = src.startsWith('/')
        ? `/imageproxy/tmdb${src}`
        : src.replace(/^https:\/\/image\.tmdb\.org\//, '/imageproxy/tmdb/');
    } else {
      imageUrl = src.startsWith('/') ? `${TMDB_IMG_BASE}${src}` : src;
    }
  } else if (type === 'tvdb') {
    if (currentSettings.cacheImages) {
      imageUrl = src.startsWith('/')
        ? `/imageproxy/tvdb${src}`
        : src.replace(/^https:\/\/artworks\.thetvdb\.com\//, '/imageproxy/tvdb/');
    } else {
      imageUrl = src.startsWith('/') ? `${TVDB_IMG_BASE}${src}` : src;
    }
  } else if (type === 'avatar') {
    imageUrl = src;
  } else {
    return null;
  }

  return <Image unoptimized loader={imageLoader} src={imageUrl} {...props} />;
};

export default CachedImage;
