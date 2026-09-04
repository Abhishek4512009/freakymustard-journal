import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks';

export default function NotFound() {
  usePageMeta('Missing page — FreakyMustard');

  return (
    <div className="fm-main">
      <div className="fm-index-head">
        <p className="fm-kicker">Erratum</p>
        <h1 className="fm-index-title">404.</h1>
        <p className="fm-index-dek">
          This page was cut in post-production. The front page is still showing.
        </p>
        <div className="fm-cover-actions" style={{ paddingBottom: 20 }}>
          <Link to="/" className="fm-btn">
            Back to the front page
          </Link>
        </div>
      </div>
    </div>
  );
}
