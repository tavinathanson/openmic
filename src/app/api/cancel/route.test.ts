import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

vi.mock('@/lib/repos/dates', () => ({
  getActiveOpenMicDate: vi.fn(),
}));

vi.mock('@/lib/repos/people', () => ({
  getPersonByEmail: vi.fn(),
}));

vi.mock('@/lib/repos/signups', () => ({
  getSignupForDate: vi.fn(),
}));

vi.mock('@/lib/repos/cancellations', () => ({
  cancelSignup: vi.fn(),
  promoteNextWaitlisted: vi.fn(),
}));

vi.mock('@/lib/resend', () => ({
  sendCancellationNotification: vi.fn(),
  sendEmailErrorNotification: vi.fn(),
  sendWaitlistPromotionEmail: vi.fn(),
}));

import { getActiveOpenMicDate } from '@/lib/repos/dates';
import { getPersonByEmail } from '@/lib/repos/people';
import { getSignupForDate } from '@/lib/repos/signups';
import { cancelSignup, promoteNextWaitlisted } from '@/lib/repos/cancellations';
import { sendCancellationNotification } from '@/lib/resend';

const mockActiveDate = {
  id: 'date-123',
  date: '2025-11-25',
  time: '19:30:00',
  timezone: 'America/New_York',
  is_active: true,
  created_at: '2025-01-01T00:00:00.000Z',
};

const mockCancelled = {
  signup_type: 'comedian' as const,
  email: 'comedian@example.com',
  full_name: 'Test Comedian',
};

describe('Cancel API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveOpenMicDate).mockResolvedValue(mockActiveDate);
    vi.mocked(promoteNextWaitlisted).mockResolvedValue(null);
    vi.mocked(sendCancellationNotification).mockResolvedValue(undefined);
  });

  describe('Cancellation by ID', () => {
    it('successfully cancels signup with id', async () => {
      vi.mocked(cancelSignup).mockResolvedValue(mockCancelled);

      const request = new Request('http://localhost/api/cancel?id=signup-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(cancelSignup).toHaveBeenCalledWith('signup-123');
      expect(sendCancellationNotification).toHaveBeenCalledWith(
        mockCancelled.email,
        mockCancelled.full_name,
        mockCancelled.signup_type,
        undefined
      );
    });

    it('successfully cancels signup with note', async () => {
      vi.mocked(cancelSignup).mockResolvedValue(mockCancelled);

      const request = new Request(
        'http://localhost/api/cancel?id=signup-123&note=Schedule%20conflict'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(sendCancellationNotification).toHaveBeenCalledWith(
        mockCancelled.email,
        mockCancelled.full_name,
        mockCancelled.signup_type,
        'Schedule conflict'
      );
    });
  });

  describe('Cancellation by Email', () => {
    it('successfully cancels signup with email', async () => {
      vi.mocked(getPersonByEmail).mockResolvedValue({
        id: 'person-123',
        email: 'comedian@example.com',
        full_name: 'Test Comedian',
        created_at: '2025-01-01T00:00:00.000Z',
      });
      vi.mocked(getSignupForDate).mockResolvedValue({ id: 'signup-123' } as never);
      vi.mocked(cancelSignup).mockResolvedValue(mockCancelled);

      const request = new Request('http://localhost/api/cancel?email=comedian@example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(cancelSignup).toHaveBeenCalledWith('signup-123');
    });

    it('returns 404 when email not found', async () => {
      vi.mocked(getPersonByEmail).mockResolvedValue(null);

      const request = new Request('http://localhost/api/cancel?email=notfound@example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('No signup found for this email');
    });
  });

  describe('Error Handling', () => {
    it('returns 400 when no active open mic date found', async () => {
      vi.mocked(getActiveOpenMicDate).mockRejectedValue(new Error('No active date'));

      const request = new Request('http://localhost/api/cancel?id=signup-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No active open mic date found');
    });

    it('returns 400 when missing required parameters', async () => {
      const request = new Request('http://localhost/api/cancel');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters');
    });

    it('returns 500 when cancel operation fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(cancelSignup).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/cancel?id=signup-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to cancel signup');
    });
  });
});
