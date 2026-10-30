import styles from './onboarding.module.css';

export interface SwitchProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** A settings row with an on/off switch (role="switch", as in the design). */
export function Switch({ label, description, checked, onChange }: SwitchProps) {
  return (
    <div className={styles.settingRow}>
      <span className={styles.settingText}>
        <span className={styles.settingLabel}>{label}</span>
        <span className={styles.settingDescription}>{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={styles.switch}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.switchTrack}>
          <span className={styles.switchKnob} />
        </span>
      </button>
    </div>
  );
}
