export const resolveVariables = (
  template: any,
  context: Record<string, any> = {},
): any => {
  if (!template) return template;

  if (Array.isArray(template)) {
    return template.map((item) => resolveVariables(item, context));
  }

  if (typeof template === "object" && template !== null) {
    const resolvedObject: Record<string, any> = {};
    for (const [key, value] of Object.entries(template)) {
      resolvedObject[key] = resolveVariables(value, context);
    }
    return resolvedObject;
  }

  if (typeof template === "string") {
    const cleanTemplate = template.trim();
    const getValueFromPath = (path: string) => {
      const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");
      const keys = normalizedPath.split(".");
      let current: any = context;

      for (const key of keys) {
        if (current && typeof current === "object" && key in current) {
          current = current[key];
        } else {
          return undefined;
        }
      }
      return current;
    };

    const isPureVariable = /^\s*\{\{\s*(.*?)\s*\}\}\s*$/.exec(cleanTemplate);
    if (isPureVariable && isPureVariable[1]) {
      const result = getValueFromPath(isPureVariable[1].trim());
      if (result !== undefined) return result;
    }

    return template.replace(/\{\{(.*?)\}\}/g, (match, path) => {
      if (!path) return match;
      const result = getValueFromPath(path.trim());

      if (result === undefined || result === null) return match;

      return typeof result === "object"
        ? JSON.stringify(result)
        : String(result);
    });
  }

  return template;
};
