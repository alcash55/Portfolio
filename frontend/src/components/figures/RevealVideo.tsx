import { Clip, type ClipProps } from './Clip';
import { WindowFrame } from './WindowFrame';

interface RevealVideoProps extends Pick<ClipProps, 'src' | 'poster' | 'posterSwap' | 'label'> {
  /** The page name, used in the group's accessible name. */
  name: string;
  caption: string;
  /** True inside a Fig frame, whose own caption line already says this. */
  framed?: boolean;
}

/** A looping recording in a window frame. Alone on a page it carries its own caption row. */
export function RevealVideo({ name, caption, framed = false, ...clip }: RevealVideoProps) {
  return (
    <figure className="mfig" aria-label={`${name} recording`}>
      <WindowFrame bare={framed}>
        <Clip {...clip} loop />
      </WindowFrame>
      {framed ? null : (
        <figcaption className="mcap">
          <strong>{caption}</strong>
        </figcaption>
      )}
    </figure>
  );
}
