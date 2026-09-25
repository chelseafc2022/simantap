import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendMailOptions {
  to: string;
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendMail(options: SendMailOptions): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to: options.to,
        from: this.configService.get<string>('mail.from'),
        subject: `[SIMANTAP KONSEL] ${options.subject}`,
        template: options.template,
        context: options.context,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Email berhasil dikirim ke: ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Gagal mengirim email ke ${options.to}:`, error.message);
      return false;
    }
  }

  async sendDeviasiAlertEmail(params: {
    to: string;
    namaPejabat: string;
    namaPaket: string;
    deviasi: number;
    opdName: string;
  }): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: #dc2626;">PERINGATAN KONTRAK KRITIS (SCM)</h2>
        <p>Yth. <strong>${params.namaPejabat}</strong>,</p>
        <p>Sistem SIMANTAP mendeteksi deviasi fisik berada di bawah ambang batas toleransi:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">OPD</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${params.opdName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">Nama Paket</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${params.namaPaket}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">Besaran Deviasi</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; color: #dc2626; font-weight: bold;">${params.deviasi}%</td>
          </tr>
        </table>
        <p>Mohon segera tindak lanjuti melalui rapat pembuktian <em>Show Cause Meeting (SCM)</em>.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #64748b;">Pemerintah Kabupaten Konawe Selatan • Bagian Administrasi Pembangunan Setda</p>
      </div>
    `;

    return this.sendMail({
      to: params.to,
      subject: `Peringatan Deviasi Kritis: ${params.namaPaket}`,
      html,
    });
  }
}
