import { Switch as SwitchControl } from '@tekcert/ui';

export interface SwitchProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** A settings row with an on/off switch. */
export function Switch({ label, description, checked, onChange }: SwitchProps) {
  return (
    <div className="flex items-center justify-between gap-5 py-4 border-b border-ln">
      <span className="flex flex-col gap-0.75">
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="text-ink2 text-[13.5px]">{description}</span>
      </span>
      <SwitchControl aria-label={label} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
