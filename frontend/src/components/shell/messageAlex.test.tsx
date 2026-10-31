import { Link } from '@tanstack/react-router';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderShell } from '~/test/renderShell';
import { useMessageLinks } from './messageAlex';

function setMotion(allowed: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query === '(prefers-reduced-motion: no-preference)' ? allowed : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

function Listener() {
  useMessageLinks();
  return null;
}

function FormSection({ id = 'contact' }: { id?: string }) {
  return (
    <section id={id}>
      <form aria-label="Message Alex">
        <label>
          Name
          <input name="name" />
        </label>
      </form>
    </section>
  );
}

beforeEach(() => {
  setMotion(true);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Message Alex on a page that has the form', () => {
  function Page({ withForm = <FormSection /> }: { withForm?: React.ReactNode }) {
    return (
      <>
        <Listener />
        <a href="#contact" data-msg>
          Message Alex
        </a>
        {withForm}
      </>
    );
  }

  it('scrolls to the form and focuses the Name field', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Page />);
    await user.click(screen.getByRole('link', { name: 'Message Alex' }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
  });

  it('works from the keyboard', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Page />);
    await user.tab();
    expect(screen.getByRole('link', { name: 'Message Alex' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
  });

  it('jumps without smooth scrolling and focuses at once under reduced motion', async () => {
    setMotion(false);
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole('link', { name: 'Message Alex' }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' });
    await vi.waitFor(() => expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus());
  });

  it('finds the form under the contact page heading too', async () => {
    setMotion(false);
    const user = userEvent.setup();
    render(
      <Page
        withForm={
          <>
            <h2 id="message">Send a message</h2>
            <form aria-label="Message Alex">
              <label>
                Name
                <input name="name" />
              </label>
            </form>
          </>
        }
      />,
    );
    await user.click(screen.getByRole('link', { name: 'Message Alex' }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    await vi.waitFor(() => expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus());
  });

  it('leaves a modified click to the browser', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.keyboard('{Control>}');
    await user.click(screen.getByRole('link', { name: 'Message Alex' }));
    await user.keyboard('{/Control}');
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});

it('leaves the link alone while the page has no form', async () => {
  const user = userEvent.setup();
  let prevented: boolean | undefined;
  render(
    <>
      <Listener />
      <a
        href="#contact"
        data-msg
        onClick={(event) => {
          prevented = event.defaultPrevented;
          event.preventDefault();
        }}
      >
        Message Alex
      </a>
    </>,
  );
  await user.click(screen.getByRole('link', { name: 'Message Alex' }));
  expect(prevented).toBe(false);
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});

describe('Message Alex across routes', () => {
  const MESSAGE_LINK = (
    <Link to="/" hash="contact" data-msg>
      Message Alex
    </Link>
  );
  const HOME = (
    <>
      <h1 tabIndex={-1}>Home page</h1>
      <FormSection />
    </>
  );

  it('focuses the Name field on arrival, not the page heading', async () => {
    const user = userEvent.setup();
    await renderShell('/projects/clipper', { '/projects/$slug': MESSAGE_LINK, '/': HOME });
    await user.click(screen.getByRole('link', { name: 'Message Alex' }));
    await screen.findByRole('heading', { name: 'Home page' });
    await vi.waitFor(() => expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus());
  });

  it('focuses the heading when the same trip is a plain link', async () => {
    const user = userEvent.setup();
    await renderShell('/projects/clipper', {
      '/projects/$slug': <Link to="/">Plain home</Link>,
      '/': HOME,
    });
    await user.click(screen.getByRole('link', { name: 'Plain home' }));
    await vi.waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Home page' })).toHaveFocus(),
    );
  });

  it('does not carry the intent over to a later plain navigation', async () => {
    const user = userEvent.setup();
    await renderShell('/projects/clipper', {
      '/projects/$slug': (
        <>
          {MESSAGE_LINK}
          <Link to="/">Plain home</Link>
        </>
      ),
      '/': HOME,
    });
    // A modified click opens a new tab in a browser and leaves this page where it is.
    await user.keyboard('{Control>}');
    await user.click(screen.getByRole('link', { name: 'Message Alex' }));
    await user.keyboard('{/Control}');
    await user.click(screen.getByRole('link', { name: 'Plain home' }));
    await vi.waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Home page' })).toHaveFocus(),
    );
  });
});
