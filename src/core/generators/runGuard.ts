/**
 * Private counter guarding a state field: each call that writes the field takes
 * the next id, and only the call still holding the latest id may write it.
 */
export function runIdField(stateField: string): string {
  return `#${stateField}RunId`;
}
