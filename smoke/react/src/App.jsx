import { useEffect, useRef, useState } from 'react';
import { toast } from 'cyber-ui';

const EVENTS = [
  {
    id: 1,
    title: 'Signal Lost',
    text: 'Long-range sensors report an anomaly in the Kerbol system.',
  },
  {
    id: 2,
    title: 'First Contact',
    text: 'An unidentified fleet has entered the outer rim.',
  },
];

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [closeCount, setCloseCount] = useState(0);
  const [callsign, setCallsign] = useState('ISS Aurora');
  const [hull, setHull] = useState(72);
  const modalRef = useRef(null);

  // custom events from web components: listen on the element
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    const onClose = () => {
      setModalOpen(false);
      setCloseCount((n) => n + 1);
    };
    modal.addEventListener('cyber-close', onClose);
    return () => modal.removeEventListener('cyber-close', onClose);
  }, []);

  return (
    <main style={{ padding: '2rem', maxWidth: '60rem' }}>
      <h1 className="cyber-heading">cyber-ui × React 19</h1>
      <p className="cyber-terminal">
        {'// custom elements + slots + controlled input + toast()'}
      </p>

      {/* controlled NATIVE input with the cyber skin */}
      <div className="cyber-field" style={{ maxWidth: '20rem', marginTop: '1rem' }}>
        <label htmlFor="callsign">Callsign (controlled)</label>
        <input
          id="callsign"
          className="cyber-input"
          value={callsign}
          onChange={(e) => setCallsign(e.target.value)}
        />
      </div>
      <p className="cyber-text cyber-text--dim">
        Bound value:{' '}
        <span className="cyber-terminal" data-test="callsign">{callsign}</span>
      </p>

      {/* state-driven progress bar via CSS custom property */}
      <div
        className="cyber-progress"
        style={{ '--cyber-progress': `${hull}%`, maxWidth: '20rem' }}
      >
        <div className="cyber-progress__label">
          <span>Hull</span>
          <span>{hull}%</span>
        </div>
        <div className="cyber-progress__track" role="progressbar" aria-valuenow={hull}>
          <div className="cyber-progress__bar" />
        </div>
      </div>
      <button
        className="cyber-btn cyber-btn--sm"
        style={{ marginTop: '0.5rem' }}
        onClick={() => setHull((h) => Math.max(h - 10, 0))}
      >
        Take damage
      </button>

      {/* custom elements rendered from a list, with named slots */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
          marginTop: '2rem',
        }}
      >
        {EVENTS.map((event) => (
          <cyber-card key={event.id}>
            <span slot="title">{event.title}</span>
            <p style={{ margin: 0 }}>{event.text}</p>
            <a
              slot="footer"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                toast(event.text, { title: event.title, variant: 'warning' });
              }}
            >
              Notify
            </a>
            <a
              slot="footer"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setModalOpen(true);
              }}
            >
              Open modal
            </a>
          </cyber-card>
        ))}
      </div>

      {/* React 19 sets `open` as a property on the custom element */}
      <cyber-modal ref={modalRef} open={modalOpen || undefined}>
        <span slot="title">React Interop</span>
        <p style={{ margin: 0 }}>
          The modal&apos;s <code>open</code> prop is React state; the{' '}
          <code>cyber-close</code> custom event is wired with a ref.
        </p>
        <button
          slot="footer"
          className="cyber-btn cyber-btn--primary"
          onClick={() => setModalOpen(false)}
        >
          Acknowledge
        </button>
      </cyber-modal>
      <p className="cyber-text cyber-text--dim">
        cyber-close events received:{' '}
        <span className="cyber-terminal" data-test="close-count">{closeCount}</span>
      </p>
    </main>
  );
}
