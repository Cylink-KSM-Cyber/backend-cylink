const { WEB_VERIFICATOR_URL } = process.env;

export default (username: string, verificationToken: string): string => {
  const redirect = WEB_VERIFICATOR_URL + verificationToken;

  return `
    <h1>Hello, ${username}!</h1>
    Please click the button below to complete your Cylink registration:
    <button onClick="() => window.open('${redirect}', '_blank')">
      Register
    </button>

    Or you can click the link below:
    <a href="${redirect}"></a>
  `;
};
