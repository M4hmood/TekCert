import { PASSWORD_RULES } from '@tekcert/types';
import { Icon } from '@tekcert/ui';
import styles from './auth.module.css';

/** Live "8 characters · A number · A symbol" checklist, using the same rules as the API. */
export function PasswordChecklist({ password, id }: { password: string; id?: string }) {
  return (
    <ul id={id} className={styles.checklist} aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.id} className={styles.rule} data-met={met}>
            <Icon name={met ? 'check_circle' : 'radio_button_unchecked'} size={16} />
            {rule.label}
            <span className="visually-hidden">{met ? ' (done)' : ' (missing)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
