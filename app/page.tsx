import { HomeCanvas } from "@/components/HomeCanvas";

export default function Home() {
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
      <HomeCanvas />
    </main>
  );
}
