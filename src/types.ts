interface OptionalQuery {
  role?: string;
  name?: string | RegExp;
  value?: string | number | RegExp;
  description?: string | RegExp;
  keyshortcuts?: string;
  roledescription?: string | RegExp;
  valuetext?: string | RegExp;
  disabled?: boolean;
  expanded?: boolean;
  focused?: boolean;
  modal?: boolean;
  multiline?: boolean;
  multiselectable?: boolean;
  readonly?: boolean;
  required?: boolean;
  selected?: boolean;
  checked?: boolean | 'mixed';
  pressed?: boolean | 'mixed';
  level?: number;
  valuemin?: number;
  valuemax?: number;
  autocomplete?: string;
  haspopup?: string;
  invalid?: string;
  orientation?: string;
  selector?: string;
  text?: string | RegExp;
}

export type Query =
  | (Omit<OptionalQuery, 'role'> & { role: string })
  | (Omit<OptionalQuery, 'name'> & { name: string | RegExp })
  | (Omit<OptionalQuery, 'text'> & { text: string | RegExp })
  | (Omit<OptionalQuery, 'selector'> & { selector: string });

export interface ElementWithComputedAccessibilityInfo extends HTMLElement {
  computedName: string;
  computedRole: string;
}
