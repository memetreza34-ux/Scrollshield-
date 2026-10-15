export const createSupportMailto = (subject: string, body?: string) => {
  const params = new URLSearchParams({ subject });

  if (body) {
    params.set('body', body);
  }

  return `mailto:support@scrollshield.app?${params.toString()}`;
};
