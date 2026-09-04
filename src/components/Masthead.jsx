import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Front page', end: true },
  { to: '/films', label: 'Films' },
  { to: '/series', label: 'Series' },
  { to: '/tamil', label: 'Tamil' },
  { to: '/search', label: 'Index' },
  { to: '/saved', label: 'Saved' },
];

/** Journal masthead: dateline, serif wordmark, double rule, section nav. */
export default function Masthead() {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="fm-masthead">
      <div className="fm-masthead-top">
        <span className="fm-dateline">{today}</span>
        <NavLink to="/" className="fm-wordmark" aria-label="FreakyMustard front page">
          Freaky<em>Mustard</em>
        </NavLink>
        <span className="fm-dateline">Vol. III — Streaming journal</span>
      </div>
      <hr className="fm-masthead-rule" />
      <nav className="fm-nav" aria-label="Sections">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
