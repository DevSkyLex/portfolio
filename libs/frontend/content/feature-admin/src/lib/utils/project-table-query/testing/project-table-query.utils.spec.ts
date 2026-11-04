import { convertToParamMap } from '@angular/router';
import { DATA_TABLE_INITIAL_STATE, type DataTableState } from '@vfortin/ui';
import {
  projectTableQuery,
  projectTableState,
} from '@internal/content-web-feature-admin/lib/utils/project-table-query/project-table-query.utils';

describe('projectTableState', (): void => {
  const base: DataTableState = { ...DATA_TABLE_INITIAL_STATE, pageSize: 20, hidden: ['technos'] };

  it('reads the search, known facet values, a sortable column and the one-based page', (): void => {
    expect(
      projectTableState(
        convertToParamMap({
          q: 'médecin',
          statut: 'publie,brouillon,publie,autre',
          accueil: 'oui',
          completude: '',
          tri: 'version',
          ordre: 'desc',
          page: '3',
        }),
        base,
      ),
    ).toEqual({
      ...base,
      search: 'médecin',
      facets: { statut: ['publie', 'brouillon'], accueil: ['oui'] },
      sort: [{ column: 'version', direction: 'desc' }],
      page: 2,
    });
  });

  it('falls back to the defaults on a missing or invalid value', (): void => {
    expect(projectTableState(convertToParamMap({}), base)).toEqual(base);
    expect(
      projectTableState(
        convertToParamMap({ tri: 'technos', page: 'x', accueil: 'peut-etre' }),
        base,
      ),
    ).toEqual(base);
    expect(
      projectTableState(convertToParamMap({ tri: 'titre', ordre: 'n/a', page: '1' }), base).sort,
    ).toEqual([{ column: 'titre', direction: 'asc' }]);
  });
});

describe('projectTableQuery', (): void => {
  it('writes only what narrows or orders the list, the inverse of projectTableState', (): void => {
    const state: DataTableState = {
      ...DATA_TABLE_INITIAL_STATE,
      search: 'angular',
      facets: { completude: ['a-completer'], statut: ['publie', 'brouillon'] },
      sort: [
        { column: 'titre', direction: 'asc' },
        { column: 'version', direction: 'desc' },
      ],
      page: 1,
    };
    const query: Record<string, string | null> = projectTableQuery(state);
    expect(query).toEqual({
      q: 'angular',
      tri: 'titre',
      ordre: 'asc',
      page: '2',
      statut: 'publie,brouillon',
      accueil: null,
      completude: 'a-completer',
    });
    expect(
      projectTableState(
        convertToParamMap(
          Object.fromEntries(
            Object.entries(query).filter((entry: [string, string | null]): boolean => !!entry[1]),
          ),
        ),
        DATA_TABLE_INITIAL_STATE,
      ),
    ).toEqual({ ...state, sort: [{ column: 'titre', direction: 'asc' }] });
    expect(Object.values(projectTableQuery({ ...DATA_TABLE_INITIAL_STATE, search: '  ' }))).toEqual(
      [null, null, null, null, null, null, null],
    );
  });
});
