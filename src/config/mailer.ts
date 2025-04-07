const nodemailer = require('nodemailer');
import { MailtrapTransport } from 'mailtrap';

const mailer = nodemailer.createTransport(MailtrapTransport({
  token: process.env.MAILER_TOKEN || '',
}));

export default mailer;
