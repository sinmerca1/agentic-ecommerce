import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger';

export interface ApprovalRequest {
  id: string;
  agent: string;
  action: string;
  details: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

class ApprovalServiceImpl extends EventEmitter {
  private approvals: Map<string, ApprovalRequest> = new Map();

  async request(
    agent: string,
    action: string,
    details: Record<string, any>
  ): Promise<string> {
    const id = uuid();
    const request: ApprovalRequest = {
      id,
      agent,
      action,
      details,
      status: 'pending',
      createdAt: new Date(),
    };

    this.approvals.set(id, request);

    // Emit for SSE clients
    this.emit('approval', request);

    logger.info(`Approval requested: ${id}`, { agent, action });

    return id;
  }

  async approve(id: string, approvedBy: string = 'system'): Promise<boolean> {
    const request = this.approvals.get(id);
    if (!request || request.status !== 'pending') {
      return false;
    }

    request.status = 'approved';
    request.resolvedAt = new Date();
    request.resolvedBy = approvedBy;

    // Emit for SSE clients
    this.emit('approval-updated', request);

    logger.info(`Approval granted: ${id}`, { approvedBy });
    return true;
  }

  async reject(id: string, rejectedBy: string = 'system'): Promise<boolean> {
    const request = this.approvals.get(id);
    if (!request || request.status !== 'pending') {
      return false;
    }

    request.status = 'rejected';
    request.resolvedAt = new Date();
    request.resolvedBy = rejectedBy;

    // Emit for SSE clients
    this.emit('approval-updated', request);

    logger.info(`Approval rejected: ${id}`, { rejectedBy });
    return true;
  }

  getPending(): ApprovalRequest[] {
    return Array.from(this.approvals.values()).filter(
      (a) => a.status === 'pending'
    );
  }

  getAll(): ApprovalRequest[] {
    return Array.from(this.approvals.values());
  }

  get(id: string): ApprovalRequest | undefined {
    return this.approvals.get(id);
  }

  onApproval(callback: (request: ApprovalRequest) => void) {
    this.on('approval', callback);
  }

  onUpdate(callback: (request: ApprovalRequest) => void) {
    this.on('approval-updated', callback);
  }

  getStats(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  } {
    const all = Array.from(this.approvals.values());
    return {
      total: all.length,
      pending: all.filter((a) => a.status === 'pending').length,
      approved: all.filter((a) => a.status === 'approved').length,
      rejected: all.filter((a) => a.status === 'rejected').length,
    };
  }
}

export const approvalService = new ApprovalServiceImpl();
