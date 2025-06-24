Feature: Support the Venue Pledge

| Component                  | Status        | Notes                                  |
|----------------------------|---------------|----------------------------------------|
| DB table: `sign_ups`       | ✅ Implemented | Add `will_support` boolean column      |
| `SignupForm.tsx`           | ✅ Implemented | Add checkbox and supporting logic      |
| `/api/signup` endpoint     | ✅ Implemented | Process the new `will_support` field   |
| `SignUp` type definition   | ✅ Implemented | Add `will_support` property            |