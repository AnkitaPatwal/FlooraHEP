# ATH-420: Mobile Assigned Plans

**Status:** Done (merged)

---

## What was broken
Assigned plans from admin didn’t show on mobile Home. Users saw an empty Dashboard.

## Why
- RLS only allowed admins to read `plan_module` and `module`
- HomeScreen used wrong Supabase client (no auth session)
- Navigation went straight to ExerciseDetail instead of Session Exercise List
- Missing RLS on `module_exercise`, `video`, `plan` for end-users

## What changed
**Mobile**
- HomeScreen: uses `supabaseClient`, shows plan name + session list, navigates to ExerciseGrid
- ExerciseGrid: loads exercises per module, passes video URL to ExerciseDetail
- ExerciseDetail: video URL from params, retry button

**Backend**
- 7 RLS migrations so users can read assigned plan data (`plan_module`, `module`, `module_exercise`, `video`, `plan`), plus fixes for `is_active_admin()`

## Done
✅ Plan name at top  
✅ Assigned sessions visible  
✅ Session → ExerciseGrid → ExerciseDetail flow  
✅ Current session highlighted, ordered (most recent first)

## Next (after Subtask 1)
- Filter to unlocked sessions only
