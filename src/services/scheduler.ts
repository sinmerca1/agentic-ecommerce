import cron from 'node-cron';
import { logger } from '../utils/logger';

export interface ScheduledTask {
  agent: string;
  cronExpression: string;
  task: cron.ScheduledTask;
  nextRun: Date | null;
  lastRun: Date | null;
  executions: number;
}

class SchedulerImpl {
  private tasks: Map<string, ScheduledTask> = new Map();

  schedule(
    agent: string,
    cronExpression: string,
    callback: () => Promise<void>
  ): ScheduledTask {
    // Remove existing schedule for this agent
    if (this.tasks.has(agent)) {
      const existing = this.tasks.get(agent)!;
      existing.task.stop();
      this.tasks.delete(agent);
      logger.info(`Stopped previous schedule for ${agent}`);
    }

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    let lastRun: Date | null = null;
    let executions = 0;

    const task = cron.schedule(cronExpression, async () => {
      logger.info(`⏰ Running scheduled ${agent} agent`);
      executions++;
      try {
        await callback();
        lastRun = new Date();
        logger.info(`✅ Scheduled ${agent} completed`);
      } catch (error) {
        logger.error(`Scheduled ${agent} failed:`, error);
      }
    });

    const scheduled: ScheduledTask = {
      agent,
      cronExpression,
      task,
      nextRun: this.getNextRun(cronExpression),
      lastRun,
      executions,
    };

    this.tasks.set(agent, scheduled);
    logger.info(`Scheduled ${agent} with cron: ${cronExpression}`);

    return scheduled;
  }

  stop(agent: string): boolean {
    const scheduled = this.tasks.get(agent);
    if (scheduled) {
      scheduled.task.stop();
      this.tasks.delete(agent);
      logger.info(`Stopped schedule for ${agent}`);
      return true;
    }
    return false;
  }

  stopAll(): void {
    this.tasks.forEach((scheduled) => {
      scheduled.task.stop();
    });
    this.tasks.clear();
    logger.info(`Stopped all schedules`);
  }

  list(): Array<Omit<ScheduledTask, 'task'>> {
    return Array.from(this.tasks.values()).map((t) => ({
      agent: t.agent,
      cronExpression: t.cronExpression,
      nextRun: t.nextRun,
      lastRun: t.lastRun,
      executions: t.executions,
    }));
  }

  get(agent: string): ScheduledTask | undefined {
    return this.tasks.get(agent);
  }

  private getNextRun(cronExpression: string): Date | null {
    try {
      // node-cron doesn't expose parseExpression in its types
      // For now, return a simple estimate
      return new Date(Date.now() + 3600000); // Next hour as estimate
    } catch {
      return null;
    }
  }
}

export const scheduler = new SchedulerImpl();
