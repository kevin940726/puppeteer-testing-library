import { ElementHandle, Page, AXNode } from 'puppeteer';

interface OptionalQuery
  extends Omit<Omit<Partial<AXNode>, 'children'>, 'name'> {
  name?: string | RegExp;
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
