import { z } from 'zod';

import {
  FilterOperator,
  FilterOperatorSchema,
  parseAndValidateFilterString,
} from '../../utils/parseAndValidateFilterString.js';

// Filter fields for schedules per:
// https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_filtering_and_sorting.htm#schedules
//
// Note: Cloud's schedules list may silently ignore some filter fields that Server
// supports. We accept the superset documented for Server and let the Tableau
// backend decide what to honor.
const FilterFieldSchema = z.enum(['createdAt', 'name', 'type', 'updatedAt']);

type FilterField = z.infer<typeof FilterFieldSchema>;

const allowedOperatorsByField: Record<FilterField, FilterOperator[]> = {
  createdAt: ['eq', 'gt', 'gte', 'lt', 'lte'],
  name: ['eq', 'in'],
  type: ['eq'],
  updatedAt: ['eq', 'gt', 'gte', 'lt', 'lte'],
};

const _FilterExpressionSchema = z.object({
  field: FilterFieldSchema,
  operator: FilterOperatorSchema,
  value: z.string(),
});

type FilterExpression = z.infer<typeof _FilterExpressionSchema>;

export function parseAndValidateSchedulesFilterString(filterString: string): string {
  return parseAndValidateFilterString<FilterField, FilterExpression>({
    filterString,
    allowedOperatorsByField,
    filterFieldSchema: FilterFieldSchema,
  });
}

export const exportedForTesting = {
  FilterFieldSchema,
};
