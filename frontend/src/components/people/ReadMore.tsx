/**
 * A native disclosure. The text drops down under the summary inside the prose
 * column and the figure beside it stays where it is. There is no script: it
 * opens and closes with JavaScript off, and the browser handles the keyboard.
 */
export function ReadMore({ points, stack }: { points: readonly string[]; stack: string }) {
  return (
    <details className="pp-more">
      <summary>
        Read more
        <svg
          className="pp-chev"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div>
        <ul>
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className="stack">{stack}</p>
      </div>
    </details>
  );
}
