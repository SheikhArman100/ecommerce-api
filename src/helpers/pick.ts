/**
 * This function is used for picking only the relevant fields from an object, such as when
 * retrieving specific pagination or filterable fields from an object containing `req.query`.
 * @param obj
 * @param keys
 * @returns
 */
const pick = <T extends Record<string, unknown>, k extends keyof T>(
    obj: T,
    keys: k[],
  ): Partial<T> => {
    const finalObj: Partial<T> = {};
  
    for (const key of keys) {
      if (obj && Object.hasOwnProperty.call(obj, key)) {
        finalObj[key] = obj[key];
      }
    }
    return finalObj;
  };
  
  export default pick;
  