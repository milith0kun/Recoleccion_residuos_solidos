// Wrapper dinámico sobre app.json. Necesario para resolver la file env var
// `GOOGLE_SERVICES_JSON` que EAS Build inyecta en su filesystem temporal
// (no podemos commitear google-services.json al repo porque contiene
// secrets de Firebase).
//
// En desarrollo local (sin EAS env vars), cae al path relativo
// ./google-services.json que vive en disk pero está gitignored.

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    // EAS Build define process.env.GOOGLE_SERVICES_JSON con el path
    // absoluto al archivo materializado desde la file env var secret.
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
});
