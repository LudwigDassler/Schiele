// Shared shape for a normalized image/pin result returned by the various
// content-source APIs (Unsplash, Pexels, Pixabay, Wikipedia, Last.fm, Imgflip,
// Pinterest and the Schiele database).
export interface Photo {
  id: string;
  src: string;
  thumb: string;
  title: string;
  author: string;
  authorAvatar: string;
  link: string;
  source?: string;
  description?: string;
  category?: string;
}
