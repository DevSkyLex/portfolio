import { PROJECT_TABLE_COLUMNS } from '@internal/content-web-feature-admin/lib/constants/project-table-columns.constants';
import { TIMELINE_TABLE_COLUMNS } from '@internal/content-web-feature-admin/lib/constants/timeline-table-columns.constants';

describe('PROJECT_TABLE_COLUMNS', (): void => {
  it('heads every visible column with an icon, the hidden actions column without', (): void => {
    for (const column of PROJECT_TABLE_COLUMNS) {
      expect(Boolean(column.icon), column.id).toBe(!column.headerHidden);
    }
  });
});

describe('TIMELINE_TABLE_COLUMNS', (): void => {
  it('heads every visible column with an icon, the hidden actions column without', (): void => {
    for (const column of TIMELINE_TABLE_COLUMNS) {
      expect(Boolean(column.icon), column.id).toBe(!column.headerHidden);
    }
  });
});
