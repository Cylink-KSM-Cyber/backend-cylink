const { WEB_VERIFICATOR_URL } = process.env;

export default (verificationToken: string): string => {
  const redirect = WEB_VERIFICATOR_URL + verificationToken;

  return `
    <h1>Cylink Resend Verification</h1>
    Please click the button below to continue your verification:
    <button onClick="() => window.open('${redirect}', '_blank')">
      Continue
    </button>

    Or you can click the link below:
    <a href="${redirect}"></a>
  `;
};
