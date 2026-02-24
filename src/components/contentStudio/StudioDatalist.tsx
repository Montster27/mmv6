type StudioDatalistOption = {
  value: string;
  label?: string;
};

type StudioDatalistProps = {
  id: string;
  options: StudioDatalistOption[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
};

export function StudioDatalist({
  id,
  options,
  value,
  onChange,
  placeholder,
  className,
}: StudioDatalistProps) {
  return (
    <>
      <input
        list={id}
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id={id}>
        {options.map((option) => (
          <option key={option.value} value={option.value} label={option.label} />
        ))}
      </datalist>
    </>
  );
}
