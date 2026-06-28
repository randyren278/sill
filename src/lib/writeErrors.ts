// Maps RPC/owner-key errors thrown by the repo into friendly toast messages.
//
// Plant writes go through `plant_upsert` / `plant_remove` SECURITY DEFINER
// RPCs. Three error shapes can come back:
//   - OwnerKeyMissingError (thrown locally before the RPC fires)
//   - PostgrestError with code '42501' (the RPC's `unauthorized` raise)
//   - any other DB / network error
import { OwnerKeyMissingError } from './owner'

type ToastShow = { show: (input: { message: string }) => void }

export function surfaceWriteError(err: unknown, toast: ToastShow): void {
  if (err instanceof OwnerKeyMissingError) {
    toast.show({ message: "This device isn't unlocked. Open /owner to paste the password." })
    return
  }
  // Supabase Postgrest wraps the SQLSTATE in `code` on the error object.
  const e = err as { code?: string; message?: string } | null
  if (e && (e.code === '42501' || /unauthorized/i.test(e.message ?? ''))) {
    toast.show({ message: 'Wrong owner password — open /owner.' })
    return
  }
  toast.show({ message: e?.message ?? String(err) })
}
