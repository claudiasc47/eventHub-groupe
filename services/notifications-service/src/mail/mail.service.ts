import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,   //////////////////////////////////////////////////////////////////
      pass: process.env.MAIL_PASS,   //////////////////////////////////////////////////////////////////
    },
  });

  async sendMail(to: string, subject: string, html: string) {
    return await this.transporter.sendMail({
      from: '"Event Manager" <no-reply@events.com>',
      to,
      subject,
      html,
    });
  }
}