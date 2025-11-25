import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextResponse } from 'next/server';

// Mock all dependencies
vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
  createServiceRoleClient: vi.fn()
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}));

vi.mock('@/lib/jwt', () => ({
  signRlsJwt: vi.fn(() => 'mock-jwt-token')
}));

vi.mock('@/lib/openMic', () => ({
  getActiveOpenMicDate: vi.fn(),
  getPersonByEmail: vi.fn()
}));

vi.mock('@/lib/resend', () => ({
  sendCancellationNotification: vi.fn(),
  sendEmailErrorNotification: vi.fn()
}));

import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase';
import { getActiveOpenMicDate, getPersonByEmail } from '@/lib/openMic';
import { sendCancellationNotification } from '@/lib/resend';

describe('Cancel API Route', () => {
  const mockActiveDate = { id: 'date-123', date: '2025-11-25' };
  const mockSignup = {
    id: 'signup-123',
    person_id: 'person-123',
    signup_type: 'comedian'
  };
  const mockPerson = {
    id: 'person-123',
    email: 'comedian@example.com',
    full_name: 'Test Comedian'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(createServerSupabaseClient).mockResolvedValue({} as any);
    vi.mocked(getActiveOpenMicDate).mockResolvedValue(mockActiveDate);
    vi.mocked(sendCancellationNotification).mockResolvedValue(undefined);
  });

  describe('Cancellation by ID', () => {
    it('successfully cancels signup with id and type', async () => {
      // Mock service role client for fetching signup and person data
      const mockServiceClient = {
        from: vi.fn((table: string) => {
          if (table === 'sign_ups') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: mockSignup, error: null })
                }))
              }))
            };
          } else if (table === 'people') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: mockPerson, error: null })
                }))
              }))
            };
          }
          return {};
        })
      };

      vi.mocked(createServiceRoleClient).mockReturnValue(mockServiceClient as any);

      // Mock authenticated client for delete operation
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockSignup, error: null })
            }))
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
          }))
        }))
      } as any);

      const request = new Request('http://localhost/api/cancel?id=signup-123&type=comedian');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(sendCancellationNotification).toHaveBeenCalledWith(
        mockPerson.email,
        mockPerson.full_name,
        mockSignup.signup_type,
        undefined
      );
    });

    it('successfully cancels signup with note', async () => {
      // Mock service role client for fetching signup and person data
      const mockServiceClient = {
        from: vi.fn((table: string) => {
          if (table === 'sign_ups') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: mockSignup, error: null })
                }))
              }))
            };
          } else if (table === 'people') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: mockPerson, error: null })
                }))
              }))
            };
          }
          return {};
        })
      };

      vi.mocked(createServiceRoleClient).mockReturnValue(mockServiceClient as any);

      // Mock authenticated client for delete operation
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockSignup, error: null })
            }))
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
          }))
        }))
      } as any);

      const request = new Request('http://localhost/api/cancel?id=signup-123&type=comedian&note=Schedule%20conflict');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(sendCancellationNotification).toHaveBeenCalledWith(
        mockPerson.email,
        mockPerson.full_name,
        mockSignup.signup_type,
        'Schedule conflict'
      );
    });
  });

  describe('Cancellation by Email', () => {
    it('successfully cancels signup with email', async () => {
      vi.mocked(getPersonByEmail).mockResolvedValue(mockPerson);

      // createClient is called 3 times with different JWT tokens:
      // 1. For person email lookup (passed to getPersonByEmail - we mock the response above)
      // 2. For signup fetch (needs .eq().eq() chain)
      // 3. For delete operation (needs .eq() single chain)

      // First call: email client (for getPersonByEmail)
      vi.mocked(createClient).mockReturnValueOnce({} as any);

      // Second call: signup client (needs two .eq() calls)
      vi.mocked(createClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockSignup, error: null })
              }))
            }))
          }))
        }))
      } as any);

      // Third call: delete client (needs single .eq() and delete)
      vi.mocked(createClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockSignup, error: null })
            }))
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
          }))
        }))
      } as any);

      const request = new Request('http://localhost/api/cancel?email=comedian@example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
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

      const request = new Request('http://localhost/api/cancel?id=signup-123&type=comedian');
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

    it('returns 500 when delete operation fails', async () => {
      // Mock service role client for fetching signup and person data
      const mockServiceClient = {
        from: vi.fn((table: string) => {
          if (table === 'sign_ups') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: mockSignup, error: null })
                }))
              }))
            };
          } else if (table === 'people') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: mockPerson, error: null })
                }))
              }))
            };
          }
          return {};
        })
      };

      vi.mocked(createServiceRoleClient).mockReturnValue(mockServiceClient as any);

      // Mock authenticated client for delete operation that fails
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockSignup, error: null })
            }))
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: new Error('DB error') })
          }))
        }))
      } as any);

      const request = new Request('http://localhost/api/cancel?id=signup-123&type=comedian');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to cancel signup');
    });
  });
});
