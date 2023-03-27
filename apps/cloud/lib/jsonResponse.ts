export const jsonResponse = (
  statusCode: number,
  body: Record<string, any> | Record<string, any>[] | null,
  headers?: Record<string, string>
) => {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      ...(headers ?? {}),
    },
  };
};
