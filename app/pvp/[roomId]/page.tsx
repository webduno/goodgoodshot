import { PvpCanvas } from "@/components/PvpCanvas";
import { Suspense } from "react";

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

export default async function PvpRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  if (!isUuid(roomId)) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{
          background:
            "linear-gradient(180deg, #d4f1ff 0%, #7dd3fc 38%, #00aeef 72%, #0072bc 100%)",
          color: "#0a5f8a",
        }}
      >
        <p>Invalid room link.</p>
      </main>
    );
  }

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        background:
          "linear-gradient(180deg, #d4f1ff 0%, #7dd3fc 38%, #00aeef 72%, #0072bc 100%)",
      }}
    >
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center"
            style={{
              width: "100vw",
              height: "100vh",
              color: "#0a5f8a",
              textShadow: "0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            Loading PvP…
          </div>
        }
      >
        <PvpCanvas roomId={roomId} />
      </Suspense>
    </main>
  );
}
