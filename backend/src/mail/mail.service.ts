import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = createTransport({
      host: this.config.get<string>('MAIL_HOST'),
      port: Number(this.config.get<string>('MAIL_PORT')),
      secure: false,
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL');
    const link = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM'),
      to,
      subject: 'Confirmez votre adresse email',
      text: `Bienvenue sur EventHub. Confirmez votre email : ${link}\nCe lien expire dans 24 heures.`,
      html: `<p>Bienvenue sur EventHub.</p>
             <p><a href="${link}">Confirmer mon adresse email</a></p>
             <p>Ce lien expire dans 24 heures.</p>`,
    });
  }
}
