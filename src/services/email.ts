import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';
import { EmailError } from '../utils/errors';
import { EmailNotification } from '../types';
import { v4 as uuid } from 'uuid';

class EmailService {
  private transporter: nodemailer.Transporter;
  private templates: Map<string, (data: any) => string>;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: false,
    });

    this.templates = new Map([
      ['support_ticket_created', this.supportTicketCreatedTemplate],
      ['support_ticket_resolved', this.supportTicketResolvedTemplate],
      ['pricing_inquiry', this.pricingInquiryTemplate],
      ['inventory_alert', this.inventoryAlertTemplate],
    ]);
  }

  async initialize(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('Email service initialized successfully');
    } catch (error) {
      throw new EmailError(
        `Failed to initialize email service: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private supportTicketCreatedTemplate(data: any): string {
    return `
      <h2>Support Ticket Created</h2>
      <p>Your support ticket has been created successfully.</p>
      <p><strong>Ticket ID:</strong> ${data.ticketId}</p>
      <p><strong>Subject:</strong> ${data.subject}</p>
      <p><strong>Priority:</strong> ${data.priority}</p>
      <p>Our support team will review your request and get back to you shortly.</p>
    `;
  }

  private supportTicketResolvedTemplate(data: any): string {
    return `
      <h2>Support Ticket Resolved</h2>
      <p>Your support ticket has been resolved.</p>
      <p><strong>Ticket ID:</strong> ${data.ticketId}</p>
      <p><strong>Resolution:</strong> ${data.resolution}</p>
      <p>If you have any further questions, please don't hesitate to contact us.</p>
    `;
  }

  private pricingInquiryTemplate(data: any): string {
    return `
      <h2>Pricing Information</h2>
      <p>Here's the pricing information you requested:</p>
      <p><strong>Product:</strong> ${data.productName}</p>
      <p><strong>Price:</strong> $${data.price}</p>
      <p><strong>Available:</strong> ${data.stock > 0 ? 'In Stock' : 'Out of Stock'}</p>
    `;
  }

  private inventoryAlertTemplate(data: any): string {
    return `
      <h2>Inventory Alert</h2>
      <p><strong>Product:</strong> ${data.productName}</p>
      <p><strong>Current Stock:</strong> ${data.stock}</p>
      <p><strong>Alert Threshold:</strong> ${data.threshold}</p>
      <p>Stock levels have fallen below your threshold.</p>
    `;
  }

  async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    data: any
  ): Promise<EmailNotification> {
    const notification: EmailNotification = {
      id: uuid(),
      to,
      subject,
      template: templateName,
      data,
      status: 'pending',
    };

    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new EmailError(`Unknown template: ${templateName}`);
      }

      const html = template(data);

      await this.transporter.sendMail({
        from: config.SMTP_FROM,
        to,
        subject,
        html,
      });

      notification.status = 'sent';
      notification.sentAt = new Date();
      logger.info(`Email sent to ${to}`, { templateName, subject });
    } catch (error) {
      notification.status = 'failed';
      logger.error(`Failed to send email to ${to}:`, error);
      throw new EmailError(
        `Failed to send email: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return notification;
  }

  async sendSupportTicketNotification(
    email: string,
    ticketId: string,
    subject: string,
    priority: string
  ): Promise<EmailNotification> {
    return this.sendEmail(
      email,
      `Support Ticket Created: ${subject}`,
      'support_ticket_created',
      { ticketId, subject, priority }
    );
  }

  async sendTicketResolvedNotification(
    email: string,
    ticketId: string,
    resolution: string
  ): Promise<EmailNotification> {
    return this.sendEmail(
      email,
      `Your Support Ticket Has Been Resolved`,
      'support_ticket_resolved',
      { ticketId, resolution }
    );
  }

  async sendPricingInquiryResponse(
    email: string,
    productName: string,
    price: number,
    stock: number
  ): Promise<EmailNotification> {
    return this.sendEmail(
      email,
      `Pricing Information: ${productName}`,
      'pricing_inquiry',
      { productName, price, stock }
    );
  }

  async sendInventoryAlert(
    email: string,
    productName: string,
    stock: number,
    threshold: number
  ): Promise<EmailNotification> {
    return this.sendEmail(
      email,
      `Inventory Alert: ${productName}`,
      'inventory_alert',
      { productName, stock, threshold }
    );
  }
}

export const emailService = new EmailService();
