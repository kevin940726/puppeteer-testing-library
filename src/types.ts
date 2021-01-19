import { ElementHandle, Page, AXNode } from 'puppeteer';

interface OptionalQuery
  extends Omit<Omit<Partial<AXNode>, 'children'>, 'name'> {
  name?: string | RegExp;
  selector?: string;
}

export type Query =
  | (Omit<OptionalQuery, 'role'> & { role: string })
  | (Omit<OptionalQuery, 'name'> & { name: string | RegExp })
  | (Omit<OptionalQuery, 'selector'> & { selector: string });
