import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { CircleAlert, LocateFixed, LoaderCircle } from "lucide-react";
import { LeafletLiveMap } from "./LeafletLiveMap";

type RequestTrackingDialogProps = {
  requestId: number | null;
  onOpenChange: (open: boolean) => void;
};

export function RequestTrackingDialog({ requestId, onOpenChange }: RequestTrackingDialogProps) {
  const tracking = trpc.requests.track.useQuery(
    { id: requestId ?? 0 },
    { enabled: requestId !== null, refetchInterval: 5000, refetchOnWindowFocus: true },
  );
  const data = tracking.data;
  const location = data?.location;
  const locationAge = location ? Date.now() - new Date(location.updatedAt).getTime() : 0;

  return (
    <Dialog open={requestId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[700px] overflow-y-auto border-[#dce8df] bg-[#fbfdfb]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#18221e]"><LocateFixed className="size-5 text-[#2f7041]" />Worker live location</DialogTitle>
          <DialogDescription>
            {data ? `${data.workerName} · ${data.serviceName} · ${data.address}` : "Location is shared only with the customer who owns this active request."}
          </DialogDescription>
        </DialogHeader>

        {tracking.isLoading && <div className="flex min-h-52 items-center justify-center text-sm text-[#68776d]"><LoaderCircle className="mr-2 size-4 animate-spin" />Loading location…</div>}
        {tracking.isError && <div role="alert" className="flex items-center gap-2 rounded-md bg-[#fff1e5] p-4 text-sm text-[#8a4f1c]"><CircleAlert className="size-4 shrink-0" />Live tracking isn’t available for this request.</div>}
        {!tracking.isLoading && !tracking.isError && !location && <div className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#dce8df] text-center text-sm text-[#68776d]"><LocateFixed className="size-5 text-[#708379]" /><span>Waiting for the worker’s first location update.</span></div>}
        {location && data && (
          <>
            <LeafletLiveMap latitude={location.latitude} longitude={location.longitude} workerName={data.workerName} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#68776d]">
              <span>Accuracy ±{Math.round(location.accuracy)} m</span>
              <span className={locationAge > 60_000 ? "font-semibold text-[#9b5b24]" : "text-[#43834c]"}>
                {locationAge > 60_000 ? "Location may be stale · " : "Updated "}
                {new Date(location.updatedAt).toLocaleTimeString()}
              </span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}