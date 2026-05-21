// Wrapper dinámico sobre app.json. Necesario para resolver la file env var
// `GOOGLE_SERVICES_JSON` que EAS Build inyecta en su filesystem temporal
// (no podemos commitear google-services.json al repo porque contiene
// secrets de Firebase).
//
// En desarrollo local (sin EAS env vars), cae al path relativo
// ./google-services.json que vive en disk pero está gitignored.

const fs = require('node:fs');

module.exports = ({ config }) => {
  const envGoogleServices = process.env.GOOGLE_SERVICES_JSON;
  const localGoogleServices = config.android?.googleServicesFile;

  const resolvedGoogleServicesFile =
    (envGoogleServices && fs.existsSync(envGoogleServices) && envGoogleServices) ||
    (localGoogleServices && fs.existsSync(localGoogleServices) && localGoogleServices) ||
    undefined;

  if (!resolvedGoogleServicesFile) {
    console.warn(
      '[app.config] google-services.json no encontrado; se omite android.googleServicesFile para este build.'
    );
  }

  return {
    ...config,
    android: {
      ...config.android,
      // EAS Build define process.env.GOOGLE_SERVICES_JSON con el path
      // absoluto al archivo materializado desde la file env var secret.
      googleServicesFile: resolvedGoogleServicesFile,
    },
  };
};
