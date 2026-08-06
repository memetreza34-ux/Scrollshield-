export const createSupportMailto = (subject: string, body?: string) => {
  const params = new URLSearchParams({ subject });

  if (body) {
    params.set('body', body);
  }

  return `mailto:support@scrollshield.app?${params.toString()}`;
};

export const createPrivacyRequestMailto = () =>
  createSupportMailto(
    'Datenschutzanfrage: ScrollShield',
    [
      'Hallo ScrollShield-Team,',
      '',
      'ich habe eine Frage zur Verarbeitung meiner Daten in ScrollShield.',
      '',
      'Meine Frage:',
      '',
      '',
      'Hinweis: Ich weiß, dass ScrollShield v1.0 Daten lokal auf meinem Gerät speichert.',
    ].join('\n'),
  );

export const createDeletionRequestMailto = () =>
  createSupportMailto(
    'Datenlöschanfrage: ScrollShield',
    [
      'Hallo ScrollShield-Team,',
      '',
      'ich möchte wissen, ob außerhalb meines Geräts personenbezogene Daten zu meiner Nutzung von ScrollShield gespeichert sind, und bitte gegebenenfalls um Löschung.',
      '',
      'Hinweis: Lokale App-Daten kann ich in der App unter Datenschutz & Transparenz selbst löschen oder durch Deinstallation entfernen.',
    ].join('\n'),
  );
