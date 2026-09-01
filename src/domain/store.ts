export type Role = 'USER' | 'ADMIN';

export interface UserRecord {
  __typename: 'User';
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ProductRecord {
  __typename: 'Product';
  id: string;
  name: string;
  priceCents: number;
}

export type NodeRecord = UserRecord | ProductRecord;

const seedUsers: UserRecord[] = [
  { __typename: 'User', id: 'u1', name: 'Avery', email: 'avery@example.test', role: 'ADMIN' },
  { __typename: 'User', id: 'u2', name: 'Blair', email: 'blair@example.test', role: 'USER' },
  { __typename: 'User', id: 'u3', name: 'Casey', email: 'casey@example.test', role: 'USER' },
  { __typename: 'User', id: 'u4', name: 'Devon', email: 'devon@example.test', role: 'USER' }
];

const seedProducts: ProductRecord[] = [
  { __typename: 'Product', id: 'p1', name: 'Graph Notebook', priceCents: 1299 },
  { __typename: 'Product', id: 'p2', name: 'Schema Cards', priceCents: 899 }
];

export class TestStore {
  readonly users: UserRecord[];
  readonly products: ProductRecord[];

  constructor() {
    this.users = structuredClone(seedUsers);
    this.products = structuredClone(seedProducts);
  }

  getNode(id: string): NodeRecord | undefined {
    return this.users.find((item) => item.id === id) ?? this.products.find((item) => item.id === id);
  }

  getUser(id: string): UserRecord | undefined {
    return this.users.find((item) => item.id === id);
  }

  search(term: string): NodeRecord[] {
    const needle = term.trim().toLowerCase();
    if (!needle) return [];
    return [...this.users, ...this.products].filter((item) => item.name.toLowerCase().includes(needle));
  }

  updateUserRole(userId: string, role: Role): UserRecord | undefined {
    const user = this.getUser(userId);
    if (!user) return undefined;
    user.role = role;
    return user;
  }
}

export function encodeCursor(id: string): string {
  return Buffer.from(`user:${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): string {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  if (!decoded.startsWith('user:') || decoded.length <= 5) throw new Error('Invalid user cursor');
  return decoded.slice(5);
}
