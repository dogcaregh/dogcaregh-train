import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { SubmitButton } from "@/components/submit-button";
import { isAdmin, listAllTrainers, type AdminTrainer } from "@/lib/admin";
import { setTrainerVetting, setTrainerActive } from "@/app/actions";
import { cedis } from "@/lib/pricing";
import { gpsFor, mapsUrl } from "@/lib/locations";

export const dynamic = "force-dynamic";

const ORDER: Record<string, number> = { pending: 0, verified: 1, rejected: 2 };

export default async function AdminTrainersPage() {
  if (!(await isAdmin())) notFound();
  const trainers = (await listAllTrainers()).sort(
    (a, b) => (ORDER[a.vetting_status] ?? 9) - (ORDER[b.vetting_status] ?? 9)
  );
  const pending = trainers.filter((t) => t.vetting_status === "pending").length;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">Admin</p>
            <h1 className="mt-1 text-3xl text-espresso">Trainer vetting</h1>
          </div>
          <span className="text-sm text-muted">{pending} pending</span>
        </div>

        {trainers.length === 0 ? (
          <p className="mt-8 text-muted">No trainers yet.</p>
        ) : (
          <div className="mt-6 grid gap-3">
            {trainers.map((t) => (
              <TrainerCard key={t.id} t={t} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function TrainerCard({ t }: { t: AdminTrainer }) {
  const name = t.name.replace(/^DEMO · /, "");
  const paused = t.vetting_status === "verified" && !t.active;
  const gps = gpsFor(t.region, t.location);

  return (
    <div className="rounded-2xl bg-white border border-hairline p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {t.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover border border-hairline" />
          )}
          <div>
            <h2 className="text-lg text-espresso">{name}</h2>
            <p className="text-xs text-muted">
              {t.email} · eval {cedis(t.eval_fee)} · joined {new Date(t.created_at).toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusPill status={t.vetting_status} />
          {paused && <span className="text-[10px] uppercase tracking-wide font-semibold text-red-700">Paused</span>}
        </div>
      </div>

      {(t.phone || t.location) && (
        <p className="mt-2 text-xs text-walnut flex flex-wrap items-center gap-x-2 gap-y-1">
          {t.location && (
            <span>
              📍 {t.location}{t.region ? `, ${t.region}` : ""}
              {gps && (
                <a href={mapsUrl(gps.lat, gps.lng)} target="_blank" rel="noopener noreferrer" className="ml-1 text-gold font-semibold hover:underline">map ↗</a>
              )}
            </span>
          )}
          {t.phone && <span>📞 {t.phone}</span>}
        </p>
      )}
      {t.bio && <p className="mt-2 text-sm text-walnut">{t.bio}</p>}

      {(t.specialties.length > 0 || t.breeds.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {t.specialties.map((s) => <Chip key={`s-${s}`}>{s}</Chip>)}
          {t.breeds.map((b) => <Chip key={`b-${b}`} muted>{b}</Chip>)}
        </div>
      )}

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted">
        {t.neighbourhoods.length > 0 && <Meta label="Areas" value={t.neighbourhoods.join(", ")} />}
        {t.years_experience != null && <Meta label="Experience" value={`${t.years_experience} yrs`} />}
        {t.methods && <Meta label="Methods" value={t.methods} />}
        {t.credentials && <Meta label="Credentials" value={t.credentials} />}
      </dl>

      {t.gallery_photos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {t.gallery_photos.slice(0, 6).map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-16 w-16 rounded-lg object-cover border border-hairline" />
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-hairline pt-3">
        {t.vetting_status !== "verified" && (
          <VetForm trainerId={t.id} status="verified" label="Approve" pending="Approving…" primary />
        )}
        {t.vetting_status !== "rejected" && (
          <form action={setTrainerVetting} className="flex items-end gap-2">
            <input type="hidden" name="trainer_id" value={t.id} />
            <input type="hidden" name="status" value="rejected" />
            <input name="reason" placeholder="reason (optional)" className="rounded-lg border border-hairline bg-ivory px-2 py-1.5 text-sm text-espresso outline-none focus:border-gold w-36" />
            <SubmitButton pendingText="Rejecting…" className="rounded-full border border-hairline text-walnut text-xs font-semibold px-4 py-1.5 hover:border-gold transition-colors disabled:opacity-60">
              Reject
            </SubmitButton>
          </form>
        )}
        {t.vetting_status !== "pending" && (
          <VetForm trainerId={t.id} status="pending" label="Reset to pending" pending="Resetting…" />
        )}
        {t.vetting_status === "verified" && (
          <form action={setTrainerActive} className="flex items-end">
            <input type="hidden" name="trainer_id" value={t.id} />
            <input type="hidden" name="active" value={t.active ? "off" : "on"} />
            <SubmitButton
              pendingText="…"
              className={`rounded-full text-xs font-semibold px-4 py-1.5 transition-colors disabled:opacity-60 ${
                t.active ? "border border-hairline text-walnut hover:border-gold" : "bg-mahogany text-ivory hover:bg-espresso"
              }`}
            >
              {t.active ? "Pause" : "Reactivate"}
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

function VetForm({ trainerId, status, label, pending, primary }: { trainerId: string; status: string; label: string; pending: string; primary?: boolean }) {
  return (
    <form action={setTrainerVetting}>
      <input type="hidden" name="trainer_id" value={trainerId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton
        pendingText={pending}
        className={`rounded-full text-xs font-semibold px-4 py-1.5 transition-colors disabled:opacity-60 ${
          primary ? "bg-mahogany text-ivory hover:bg-espresso" : "border border-hairline text-walnut hover:border-gold"
        }`}
      >
        {label}
      </SubmitButton>
    </form>
  );
}

function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span className={`text-xs border border-hairline rounded-full px-2 py-0.5 ${muted ? "text-muted bg-ivory" : "text-walnut bg-cream"}`}>
      {children}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="inline font-semibold">{label}:</dt> <dd className="inline">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "verified" ? "text-green-700" : status === "rejected" ? "text-red-700" : "text-gold";
  return (
    <span className={`text-[10px] uppercase tracking-wide font-semibold ${tone} bg-cream border border-hairline rounded-full px-2 py-0.5 capitalize`}>
      {status}
    </span>
  );
}
