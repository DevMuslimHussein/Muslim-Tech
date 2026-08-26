import { Injectable, Logger } from '@nestjs/common';

/**
 * Console-backed implementation so the password-reset flow works end-to-end
 * before a transactional email provider is chosen. Swap the body of
 * sendPasswordReset for a real provider call — the AuthService caller
 * doesn't change.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    this.logger.log(`Password reset link for ${email}: ${resetUrl}`);
    return Promise.resolve();
  }
}
