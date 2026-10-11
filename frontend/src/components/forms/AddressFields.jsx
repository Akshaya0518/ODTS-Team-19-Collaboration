import { Field } from '../ui';

/**
 * Street / city / state / pincode inputs. Used by registration, checkout and profile.
 * `errors` uses keys like "address.city" (same names the backend returns).
 */
export default function AddressFields({ value, onChange, errors = {}, prefix = 'address.' }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  const err = (field) => errors[`${prefix}${field}`];
  const id = (field) => `${prefix.replace(/\W/g, '')}-${field}`;

  return (
    <div className="form-grid">
      <Field label="Street address" htmlFor={id('line1')} error={err('line1')} className="span-2">
        <input
          id={id('line1')}
          className={`input${err('line1') ? ' invalid' : ''}`}
          value={value.line1}
          onChange={set('line1')}
          autoComplete="street-address"
          data-testid="address-line1"
        />
      </Field>
      <Field label="City" htmlFor={id('city')} error={err('city')}>
        <input id={id('city')} className={`input${err('city') ? ' invalid' : ''}`} value={value.city} onChange={set('city')} data-testid="address-city" />
      </Field>
      <Field label="State" htmlFor={id('state')} error={err('state')}>
        <input id={id('state')} className={`input${err('state') ? ' invalid' : ''}`} value={value.state} onChange={set('state')} data-testid="address-state" />
      </Field>
      <Field label="Pincode" htmlFor={id('pincode')} error={err('pincode')}>
        <input
          id={id('pincode')}
          className={`input${err('pincode') ? ' invalid' : ''}`}
          value={value.pincode}
          onChange={set('pincode')}
          inputMode="numeric"
          maxLength={6}
          data-testid="address-pincode"
        />
      </Field>
    </div>
  );
}
