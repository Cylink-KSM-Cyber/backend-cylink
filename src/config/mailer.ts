import { MailtrapTransport } from 'mailtrap';

const nodemailer = require('nodemailer');

const mailer = nodemailer.createTransport(MailtrapTransport({
  token: process.env.MAILER_TOKEN || '',
}));

export default mailer;
