import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import { orderProjects } from '@internal/content-web-feature-admin/lib/utils/order-projects/order-projects.utils';

/**
 * Function row
 *
 * @description
 * Project with the fields read by the default order.
 *
 * @param {string} id - Project id.
 * @param {number} position - Public position.
 * @param {string} title - French title.
 *
 * @returns {AdminProject} Partial project.
 */
const row = (id: string, position: number, title: string): AdminProject =>
  ({ id, position, title: { fr: title } }) as unknown as AdminProject;

describe('orderProjects', (): void => {
  it('orders by position, then by French title, without touching the input', (): void => {
    const input: AdminProject[] = [
      row('c', 2, 'Alpha'),
      row('b', 1, 'Élan'),
      row('a', 1, 'abeille'),
      row('d', 1, 'Projet 10'),
      row('e', 1, 'Projet 9'),
    ];
    expect(orderProjects(input).map((project: AdminProject): string => project.id)).toEqual([
      'a',
      'b',
      'e',
      'd',
      'c',
    ]);
    expect(input[0]?.id).toBe('c');
  });
});
