import { Clip, type ClipProps } from './Clip';
import { WindowFrame } from './WindowFrame';

interface RevealVideoProps extends Pick<ClipProps, 'src' | 'poster' | 'posterSwap' | 'label'> {
  /** The page name, used in the group's accessible name. */
  name: string;
  caption: string;
}

/** A looping recording in a window frame, with a caption underneath. */
export function RevealVideo({ name, caption, ...clip }: RevealVideoProps) {
  return (
    <figure className="mfig" role="group" aria-label={`${name} recording`}>
      <WindowFrame>
        <Clip {...clip} loop />
      </WindowFrame>
      <figcaption className="mcap">
        <strong>{caption}</strong>
      </figcaption>
    </figure>
  );
}
