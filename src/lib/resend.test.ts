import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Resend module
const mockSend = vi.fn();
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      send: (...args: any[]) => mockSend(...args)
    }
  }))
}));

// Now import the function to test
import { sendEmailErrorNotification } from './resend';

describe('sendEmailErrorNotification', () => {
  beforeEach(() => {
    mockSend.mockClear();
    mockSend.mockResolvedValue({ data: { id: 'test-email-id' } });
  });

  it('sends error notification with full context', async () => {
    await sendEmailErrorNotification(
      'user@example.com',
      'confirmation',
      new Error('Test error'),
      {
        fullName: 'Test User',
        type: 'comedian',
        date: '2025-11-20'
      }
    );

    expect(mockSend).toHaveBeenCalledTimes(1);

    // Verify the email was sent with correct structure
    const callArg = mockSend.mock.calls[0][0];
    expect(callArg.subject).toBe('Email Error: Failed to send confirmation email');
    expect(callArg.html).toContain('user@example.com');
    expect(callArg.html).toContain('Test User');
    expect(callArg.html).toContain('comedian');
    expect(callArg.html).toContain('2025-11-20');
    expect(callArg.html).toContain('Test error');
    expect(callArg.html).toContain('Failed to send confirmation email');
  });

  it('sends error notification without optional context', async () => {
    await sendEmailErrorNotification(
      'user@example.com',
      'waitlist',
      new Error('Rate limit exceeded')
    );

    expect(mockSend).toHaveBeenCalledTimes(1);

    const callArg = mockSend.mock.calls[0][0];
    expect(callArg.subject).toBe('Email Error: Failed to send waitlist email');
    expect(callArg.html).toContain('user@example.com');
    expect(callArg.html).toContain('Rate limit exceeded');
    expect(callArg.html).toContain('Failed to send waitlist email');
  });

  it('handles cancellation error notifications', async () => {
    await sendEmailErrorNotification(
      'user@example.com',
      'cancellation',
      new Error('API failure'),
      {
        fullName: 'Jane Doe',
        type: 'audience'
      }
    );

    expect(mockSend).toHaveBeenCalledTimes(1);

    const callArg = mockSend.mock.calls[0][0];
    expect(callArg.subject).toBe('Email Error: Failed to send cancellation email');
    expect(callArg.html).toContain('Jane Doe');
    expect(callArg.html).toContain('audience');
  });

  it('does not throw if error notification itself fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('Resend API down'));

    // Should not throw
    await expect(
      sendEmailErrorNotification(
        'user@example.com',
        'confirmation',
        new Error('Original error')
      )
    ).resolves.toBeUndefined();
  });

  it('formats error messages correctly for non-Error objects', async () => {
    await sendEmailErrorNotification(
      'user@example.com',
      'confirmation',
      { code: 'INVALID_EMAIL', details: 'Malformed address' }
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArg = mockSend.mock.calls[0][0];
    expect(callArg.html).toContain('INVALID_EMAIL');
    expect(callArg.html).toContain('Malformed address');
  });
});
