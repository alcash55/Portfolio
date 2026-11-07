import { ChapterNav } from './ChapterNav';
import { ReadingLine } from './ReadingLine';

/** What the home route adds to the shell header: the chapter counter with its index, and the reading line. */
export function HomeHeader() {
  return (
    <>
      <ChapterNav />
      <ReadingLine />
    </>
  );
}
