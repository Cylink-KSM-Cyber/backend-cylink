const { WEB_VERIFICATOR_URL } = process.env;

export default (verificationToken: string): string => {
  const redirect = WEB_VERIFICATOR_URL + verificationToken

  return `
    <h1>Cylink Password Reset Verification</h1>
    Please click the button below to reset your Cylink password:
    <button onClick="() => window.open('${redirect}', '_blank')">
      Reset Password
    </button>

    Or you can click the link below:
    <a href="${redirect}"></a>
  `;
};
