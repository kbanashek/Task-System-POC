/**
 * Safely checks whether an Amplify DataStore model instance is a tombstone.
 *
 * DataStore attaches an internal `_deleted` flag to models that have been deleted
 * (locally or via remote sync). This flag is not part of the generated model types
 * in `src/models/index.d.ts`, so consumers must treat it as runtime metadata.
 *
 * @param item - Any value (typically a DataStore model instance)
 * @returns True if the value is an object with an own `_deleted` property set to `true`
 */
export const isDataStoreModelDeleted = (item: unknown): boolean => {
  if (typeof item !== "object" || item === null) return false;

  if (!Object.prototype.hasOwnProperty.call(item, "_deleted")) return false;

  const deletedValue = Reflect.get(item as object, "_deleted");
  return deletedValue === true;
};
