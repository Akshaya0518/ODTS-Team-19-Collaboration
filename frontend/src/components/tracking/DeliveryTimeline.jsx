import { formatDateTime } from '../../utils/format';

const ICONS = { done: '✓', current: '●', upcoming: '○', cancelled: '–' };

/**
 * The visual delivery timeline. `steps` come from the BACKEND tracking API:
 *   [{ status, label, state: 'done' | 'current' | 'upcoming' | 'cancelled', at }]
 */
export default function DeliveryTimeline({ steps = [] }) {
  return (
    <ol className="timeline" data-testid="delivery-timeline">
      {steps.map((step) => (
        <li key={step.status} className={`timeline-step ${step.state}`} data-testid="timeline-step" data-state={step.state}>
          <span className="timeline-dot" aria-hidden="true">
            {ICONS[step.state]}
          </span>
          <div>
            <div className="timeline-title">
              {step.label}
              {step.state === 'current' && <span className="sr-only"> (current step)</span>}
            </div>
            <div className="timeline-meta">
              {step.at ? formatDateTime(step.at) : step.state === 'cancelled' ? 'Not reached' : 'Pending'}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
