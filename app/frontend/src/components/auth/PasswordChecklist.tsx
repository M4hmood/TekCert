import { PASSWORD_RULES } from '@tekcert/types';
import { Icon } from '@tekcert/ui';

/** Live "8 characters · A number · A symbol" checklist, using the same rules as the API. */
export function PasswordChecklist({ password, id }: { password: string; id?: string }) {
  return (
    <ul
      id={id}
      className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]"
      aria-label="Password requirements"
    >
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            className="flex items-center gap-1 text-ink3 data-[met=true]:text-ok"
            data-met={met}
          >
            <Icon name={met ? 'check_circle' : 'radio_button_unchecked'} size={16} />
            {rule.label}
            <span className="sr-only">{met ? ' (done)' : ' (missing)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
