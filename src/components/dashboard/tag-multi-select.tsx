import Select from "react-select";
import type { MultiValue, StylesConfig } from "react-select";
import type { TagRow } from "@/lib/supabase/catalog-types";

type Opt = { value: string; label: string };

const selectStyles: StylesConfig<Opt, true> = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    backgroundColor: "hsl(var(--background))",
    borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--input))",
    boxShadow: state.isFocused ? "0 0 0 1px hsl(var(--ring))" : "none",
    "&:hover": { borderColor: "hsl(var(--input))" },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  }),
  menuList: (base) => ({ ...base, maxHeight: 280 }),
  option: (base, state) => ({
    ...base,
    fontSize: "0.875rem",
    backgroundColor: state.isSelected
      ? "hsl(var(--primary))"
      : state.isFocused
        ? "hsl(var(--accent))"
        : "transparent",
    color: state.isSelected ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "hsl(var(--muted))",
    borderRadius: "0.25rem",
  }),
  multiValueLabel: (base) => ({
    ...base,
    fontSize: "0.75rem",
    color: "hsl(var(--foreground))",
  }),
  multiValueRemove: (base) => ({
    ...base,
    ":hover": { backgroundColor: "hsl(var(--destructive) / 0.2)", color: "hsl(var(--destructive))" },
  }),
  placeholder: (base) => ({ ...base, color: "hsl(var(--muted-foreground))", fontSize: "0.875rem" }),
  input: (base) => ({ ...base, color: "hsl(var(--foreground))" }),
  singleValue: (base) => ({ ...base, color: "hsl(var(--foreground))" }),
};

export function TagMultiSelect({
  tags,
  value,
  onChange,
  placeholder = "Search and select tags…",
  inputId,
  "aria-label": ariaLabel,
  disabled,
}: {
  tags: TagRow[];
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  placeholder?: string;
  inputId?: string;
  "aria-label"?: string;
  disabled?: boolean;
}) {
  const options: Opt[] = tags.map((t) => ({
    value: t.id,
    label: `${t.label} (${t.name})`,
  }));
  const selected = options.filter((o) => value.has(o.value));

  return (
    <Select<Opt, true>
      inputId={inputId}
      aria-label={ariaLabel}
      isMulti
      closeMenuOnSelect={false}
      blurInputOnSelect={false}
      isDisabled={disabled}
      options={options}
      value={selected}
      onChange={(opts) => {
        const next = new Set<string>();
        for (const o of (opts as MultiValue<Opt>) ?? []) next.add(o.value);
        onChange(next);
      }}
      placeholder={placeholder}
      noOptionsMessage={() => "No tags — create tags under Catalog → Tags."}
      styles={selectStyles}
      classNamePrefix="tag-multi-select"
    />
  );
}
